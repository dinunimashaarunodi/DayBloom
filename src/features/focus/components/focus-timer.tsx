"use client"

import { CircleStop, PartyPopper, Play } from "lucide-react"
import { useRouter } from "next/navigation"
import { useEffect, useState, useTransition } from "react"

import { Button } from "@/components/ui/button"

import { endFocus } from "../actions"
import { formatClock, remainingSeconds, type FocusSession } from "../logic"

/**
 * The running countdown. Remaining time is always recomputed from the stored
 * start time, so reloading, sleeping laptops or background tabs never drift.
 * `serverNow` keeps the first render identical on the server and the client.
 */
export function FocusTimer({
  session,
  serverNow,
}: {
  session: FocusSession
  serverNow: number
}) {
  const router = useRouter()
  const [now, setNow] = useState(serverNow)
  const [ending, startEnding] = useTransition()
  const [error, setError] = useState<string>()

  const left = remainingSeconds(session, new Date(now))
  const total = session.planned_minutes * 60
  const done = left === 0
  const name = session.label ?? "Focus"

  useEffect(() => {
    const tick = () => setNow(Date.now())
    tick()
    const id = window.setInterval(tick, 1000)
    return () => window.clearInterval(id)
  }, [])

  // The tab title shows the countdown; the page's own title comes back on unmount.
  useEffect(() => {
    const original = document.title
    return () => {
      document.title = original
    }
  }, [])

  useEffect(() => {
    document.title = done ? `Done · ${name}` : `${formatClock(left)} · ${name}`
  }, [done, left, name])

  function end() {
    startEnding(async () => {
      const result = await endFocus(session.id)
      setError(result.error)
    })
  }

  return (
    <div className="grid justify-items-center gap-4 py-2 text-center">
      <p className="max-w-full truncate text-sm font-medium text-muted-foreground">
        {session.label ?? "Focus session"}
      </p>
      <p
        className="text-6xl font-semibold tracking-tight tabular-nums sm:text-7xl"
        aria-label={done ? "Time's up" : `${formatClock(left)} left`}
      >
        {formatClock(left)}
      </p>
      <div
        role="progressbar"
        aria-label="Session progress"
        aria-valuemin={0}
        aria-valuemax={total}
        aria-valuenow={total - left}
        aria-valuetext={`${Math.floor((total - left) / 60)} of ${session.planned_minutes} minutes`}
        className="h-2 w-full max-w-sm overflow-hidden rounded-full bg-muted"
      >
        <div
          className="h-full rounded-full bg-primary transition-[width] duration-1000 ease-linear"
          style={{ width: `${((total - left) / total) * 100}%` }}
        />
      </div>
      <p role="status" className="min-h-5 text-sm">
        {done && (
          <span className="inline-flex animate-in items-center gap-1.5 font-medium duration-300 zoom-in-95 fade-in">
            <PartyPopper className="size-4 text-gold" aria-hidden="true" />
            Session complete. Well done!
          </span>
        )}
      </p>
      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}
      {done ? (
        // The session is already over on the server; refreshing shows the
        // start form and today's updated totals.
        <Button
          type="button"
          className="h-10 px-4"
          onClick={() => router.refresh()}
        >
          <Play aria-hidden="true" />
          Start another session
        </Button>
      ) : (
        <Button
          type="button"
          variant="outline"
          className="h-10 px-4"
          disabled={ending}
          onClick={end}
        >
          <CircleStop aria-hidden="true" />
          {ending ? "Ending…" : "End session"}
        </Button>
      )}
    </div>
  )
}
