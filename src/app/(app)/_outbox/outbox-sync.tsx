"use client"

import { CircleAlert, X } from "lucide-react"
import { useRouter } from "next/navigation"
import { useEffect, useRef, useState } from "react"

import { Button } from "@/components/ui/button"
import {
  isOffline,
  outboxItems,
  removeQueued,
  setOutboxUser,
  subscribeOutbox,
} from "@/lib/outbox"

import { replayOutboxItem } from "./actions"

const RETRY_MS = 30_000

/**
 * Sends changes made while offline, in order, once the connection is back:
 * on load, when the browser comes online, and every 30 seconds while any are
 * waiting. Changes the server refuses are dropped, and the user is told.
 */
export function OutboxSync({ userId }: { userId: string }) {
  const router = useRouter()
  const flushing = useRef(false)
  const [refused, setRefused] = useState(0)

  useEffect(() => {
    setOutboxUser(userId)

    async function flush() {
      if (flushing.current || isOffline()) return
      flushing.current = true
      let sent = 0
      try {
        for (;;) {
          const [next] = outboxItems()
          if (!next) break
          let result: { status: "saved" | "refused" }
          try {
            result = await replayOutboxItem(next)
          } catch {
            break // Still no connection: keep it for the next try.
          }
          removeQueued(next.key)
          if (result.status === "refused") setRefused((n) => n + 1)
          else sent++
        }
      } finally {
        flushing.current = false
      }
      if (sent > 0) router.refresh()
    }

    flush()
    window.addEventListener("online", flush)
    const timer = window.setInterval(() => {
      if (outboxItems().length > 0) flush()
    }, RETRY_MS)
    const unsubscribe = subscribeOutbox(() => {
      if (!isOffline() && outboxItems().length > 0) flush()
    })
    return () => {
      window.removeEventListener("online", flush)
      window.clearInterval(timer)
      unsubscribe()
      setOutboxUser(null)
    }
  }, [userId, router])

  if (refused === 0) return null
  return (
    <div
      role="alert"
      className="mb-4 flex items-start gap-2 rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm"
    >
      <CircleAlert className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
      <p className="flex-1">
        {refused === 1
          ? "One change made while offline couldn't be saved"
          : `${refused} changes made while offline couldn't be saved`}{" "}
        (for example, a habit check-in from more than a week ago). Everything
        else is up to date.
      </p>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="size-7"
        aria-label="Dismiss"
        onClick={() => setRefused(0)}
      >
        <X aria-hidden="true" />
      </Button>
    </div>
  )
}
