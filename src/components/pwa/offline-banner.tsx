"use client"

import { WifiOff } from "lucide-react"
import { useSyncExternalStore } from "react"

import { outboxItems, subscribeOutbox, type OutboxItem } from "@/lib/outbox"

function subscribe(onChange: () => void) {
  window.addEventListener("online", onChange)
  window.addEventListener("offline", onChange)
  return () => {
    window.removeEventListener("online", onChange)
    window.removeEventListener("offline", onChange)
  }
}

const NONE: OutboxItem[] = []

/**
 * A gentle notice while the device is offline (and while offline changes
 * are still waiting to be sent). Quick changes are kept on the device; the
 * rest need a connection, and it says so plainly.
 */
export function OfflineBanner() {
  const online = useSyncExternalStore(
    subscribe,
    () => navigator.onLine,
    () => true,
  )
  const waiting = useSyncExternalStore(
    subscribeOutbox,
    outboxItems,
    () => NONE,
  ).length
  if (online && waiting === 0) return null
  if (online) {
    return (
      <div
        role="status"
        className="mb-4 rounded-xl border px-4 py-3 text-sm text-muted-foreground"
      >
        Saving {waiting} change{waiting === 1 ? "" : "s"} made while offline…
      </div>
    )
  }
  return (
    <div
      role="status"
      className="mb-4 flex items-start gap-2 rounded-xl border border-warning/40 bg-warning/10 px-4 py-3 text-sm"
    >
      <WifiOff className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
      <p>
        <span className="font-medium">You&apos;re offline.</span> New tasks,
        ticks and habit check-ins are kept on this device and saved when
        you&apos;re back. Other changes need a connection.
        {waiting > 0 &&
          ` ${waiting} change${waiting === 1 ? "" : "s"} waiting to sync.`}
      </p>
    </div>
  )
}
