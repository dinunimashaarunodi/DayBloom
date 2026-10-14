// Pure calendar rules (no React, Next.js or Supabase), unit-tested.
import {
  localDateTimeToInstant,
  localDayRange,
  toLocalDate,
  toLocalTime,
  type LocalDate,
  type LocalTime,
} from "@/lib/dates/local-date"

import type { EventInput } from "./schema"

export type CalendarEvent = {
  id: string
  title: string
  notes: string | null
  all_day: boolean
  starts_at: string | null
  ends_at: string | null
  start_date: LocalDate | null
  end_date: LocalDate | null
}

export const EVENT_COLUMNS =
  "id, title, notes, all_day, starts_at, ends_at, start_date, end_date" as const

/** The minimum a task needs to appear on the calendar. */
export type CalendarTask = {
  id: string
  title: string
  status: "todo" | "done" | "dropped"
  due_date: LocalDate | null
}

type EventRow = Omit<CalendarEvent, "id">

/**
 * Converts validated form input to database columns. Timed events become real
 * instants in the user's timezone. Returns null when daylight saving makes the
 * chosen times collapse (e.g. 02:10–02:40 on a night clocks skip 02:00–03:00).
 */
export function eventInputToRow(
  input: EventInput,
  tz: string,
): EventRow | null {
  if (input.allDay) {
    return {
      title: input.title,
      notes: input.notes,
      all_day: true,
      starts_at: null,
      ends_at: null,
      start_date: input.startDate,
      end_date: input.endDate,
    }
  }
  const start = localDateTimeToInstant(
    input.date,
    input.startTime as LocalTime,
    tz,
  )
  const end = localDateTimeToInstant(input.date, input.endTime as LocalTime, tz)
  if (end <= start) return null
  return {
    title: input.title,
    notes: input.notes,
    all_day: false,
    starts_at: start.toISOString(),
    ends_at: end.toISOString(),
    start_date: null,
    end_date: null,
  }
}

/** Form defaults for editing an event, in the user's timezone. */
export function eventToFormValues(
  event: CalendarEvent,
  tz: string,
): Record<string, string> {
  const base = { title: event.title, notes: event.notes ?? "" }
  if (event.all_day) {
    return {
      ...base,
      allDay: "on",
      date: event.start_date!,
      endDate: event.end_date!,
      startTime: "09:00",
      endTime: "10:00",
    }
  }
  const start = new Date(event.starts_at!)
  const end = new Date(event.ends_at!)
  return {
    ...base,
    allDay: "",
    date: toLocalDate(start, tz),
    endDate: "",
    startTime: toLocalTime(start, tz),
    endTime: toLocalTime(end, tz),
  }
}

type DaySpan = { day: LocalDate; start: Date; end: Date }

function span(day: LocalDate, tz: string): DaySpan {
  return { day, ...localDayRange(day, tz) }
}

function occursIn(event: CalendarEvent, { day, start, end }: DaySpan): boolean {
  if (event.all_day) return event.start_date! <= day && day <= event.end_date!
  return new Date(event.starts_at!) < end && new Date(event.ends_at!) > start
}

/** True if any part of the event falls on `day` in `tz`. */
export function eventOccursOn(
  event: CalendarEvent,
  day: LocalDate,
  tz: string,
): boolean {
  return occursIn(event, span(day, tz))
}

/** "All day", "09:00–10:00", "From 23:30" or "Until 00:30", as seen on `day`. */
export function eventTimeLabel(
  event: CalendarEvent,
  day: LocalDate,
  tz: string,
): string {
  if (event.all_day) return "All day"
  const start = new Date(event.starts_at!)
  const end = new Date(event.ends_at!)
  const startsToday = toLocalDate(start, tz) === day
  const endsToday = toLocalDate(new Date(end.getTime() - 1), tz) === day
  if (startsToday && endsToday)
    return `${toLocalTime(start, tz)}–${toLocalTime(end, tz)}`
  if (startsToday) return `From ${toLocalTime(start, tz)}`
  if (endsToday) return `Until ${toLocalTime(end, tz)}`
  return "All day"
}

/** All-day events first, then by start time, then title. */
function compareEvents(a: CalendarEvent, b: CalendarEvent): number {
  if (a.all_day !== b.all_day) return a.all_day ? -1 : 1
  const byStart = (a.starts_at ?? a.start_date ?? "").localeCompare(
    b.starts_at ?? b.start_date ?? "",
  )
  return byStart || a.title.localeCompare(b.title)
}

export type CalendarDay<T extends CalendarTask = CalendarTask> = {
  events: CalendarEvent[]
  tasks: T[]
}

/** Groups tasks (by due date) and events (by overlap) onto each visible day. */
export function groupByDay<T extends CalendarTask>(
  days: LocalDate[],
  tasks: T[],
  events: CalendarEvent[],
  tz: string,
): Map<LocalDate, CalendarDay<T>> {
  const result = new Map<LocalDate, CalendarDay<T>>()
  for (const day of days) {
    const daySpan = span(day, tz)
    result.set(day, {
      events: events.filter((e) => occursIn(e, daySpan)).sort(compareEvents),
      tasks: tasks.filter((t) => t.due_date === day && t.status !== "dropped"),
    })
  }
  return result
}
