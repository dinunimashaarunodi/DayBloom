import { Clock } from "lucide-react"
import Link from "next/link"

import type { LocalDate } from "@/lib/dates/local-date"

import { eventTimeLabel, type CalendarEvent } from "../logic"

/**
 * A day's events with their times as seen on that day.
 * `linked={false}` for historical snapshots, where the event may no longer exist.
 */
export function EventList({
  events,
  day,
  timezone,
  label,
  linked = true,
}: {
  events: CalendarEvent[]
  day: LocalDate
  timezone: string
  label: string
  linked?: boolean
}) {
  return (
    <ul aria-label={label} className="divide-y overflow-hidden surface">
      {events.map((event) => {
        const content = (
          <>
            <Clock
              className="size-4 shrink-0 text-primary"
              aria-hidden="true"
            />
            <span className="w-24 shrink-0 text-xs text-muted-foreground tabular-nums">
              {eventTimeLabel(event, day, timezone)}
            </span>
            <span className="min-w-0 truncate">{event.title}</span>
          </>
        )
        return (
          <li key={event.id}>
            {linked ? (
              <Link
                href={`/calendar/events/${event.id}`}
                className="flex items-center gap-3 px-3 py-2.5 outline-none hover:bg-muted/60 focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:ring-inset"
              >
                {content}
              </Link>
            ) : (
              <div className="flex items-center gap-3 px-3 py-2.5">
                {content}
              </div>
            )}
          </li>
        )
      })}
    </ul>
  )
}
