// Calendar-day logic. A LocalDate is a day on the user's own calendar, e.g. the
// day a task is due. It has no time and no timezone: "2026-10-11" means the same
// day in Colombo and in New York. Timezones only matter when converting between
// a LocalDate and a real instant (a Date), and that only happens in this file.
//
// Rules (see CLAUDE.md):
// - Always pass `now` in explicitly. Never read the clock inside these helpers.
// - Never add 24h of milliseconds to a Date to move a day; use addDays().
//
// Conversions use only the built-in Intl API, whose results never depend on the
// machine's own timezone. (@date-fns/tz 1.5.0 was dropped: its TZDate returned
// the wrong day start when the machine's timezone also changed DST that day.)
import { z } from "zod"

/** "YYYY-MM-DD", the same format Postgres `date` columns use via Supabase. */
export type LocalDate = string & { readonly __brand: "LocalDate" }

const PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/
const MS_PER_DAY = 86_400_000

type Parts = { year: number; month: number; day: number } // month is 1–12

function parts(date: LocalDate): Parts {
  const [, y, m, d] = PATTERN.exec(date)!
  return { year: Number(y), month: Number(m), day: Number(d) }
}

function fromParts({ year, month, day }: Parts): LocalDate {
  const pad = (n: number, width: number) => String(n).padStart(width, "0")
  return `${pad(year, 4)}-${pad(month, 2)}-${pad(day, 2)}` as LocalDate
}

/**
 * Calendar arithmetic is done on UTC midnights. UTC has no daylight saving,
 * so every UTC day is exactly 24h and this is pure calendar math, not a
 * timezone conversion.
 */
function toUtcMidnight(date: LocalDate): number {
  const { year, month, day } = parts(date)
  return Date.UTC(year, month - 1, day)
}

function fromUtcMidnight(ms: number): LocalDate {
  const d = new Date(ms)
  return fromParts({
    year: d.getUTCFullYear(),
    month: d.getUTCMonth() + 1,
    day: d.getUTCDate(),
  })
}

/** True for a real calendar day in "YYYY-MM-DD" form (rejects 2026-02-30). */
export function isLocalDate(value: unknown): value is LocalDate {
  if (typeof value !== "string") return false
  const match = PATTERN.exec(value)
  if (!match) return false
  const [year, month, day] = [
    Number(match[1]),
    Number(match[2]),
    Number(match[3]),
  ]
  if (year < 1000) return false
  const d = new Date(Date.UTC(year, month - 1, day))
  return (
    d.getUTCFullYear() === year &&
    d.getUTCMonth() === month - 1 &&
    d.getUTCDate() === day
  )
}

/** Zod schema for date inputs (`<input type="date">` submits "YYYY-MM-DD"). */
export const localDateSchema = z
  .string()
  .refine(isLocalDate, "Choose a valid date.")
  .transform((value) => value as LocalDate)

// ---------------------------------------------------------------------------
// Instant ⇄ calendar day (the only timezone-aware functions)
// ---------------------------------------------------------------------------

const formatters = new Map<string, Intl.DateTimeFormat>()

function formatterFor(tz: string): Intl.DateTimeFormat {
  let formatter = formatters.get(tz)
  if (!formatter) {
    formatter = new Intl.DateTimeFormat("en-US", {
      timeZone: tz,
      hourCycle: "h23",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    })
    formatters.set(tz, formatter)
  }
  return formatter
}

/**
 * The wall-clock reading in `tz` at instant `ms`, expressed as milliseconds
 * since the epoch as if that reading were UTC. Comparing it with UTC midnights
 * tells us which local day an instant belongs to.
 */
function wallClock(ms: number, tz: string): number {
  const p: Record<string, number> = {}
  for (const { type, value } of formatterFor(tz).formatToParts(ms)) {
    if (type !== "literal") p[type] = Number(value)
  }
  const millis = ((ms % 1000) + 1000) % 1000
  return (
    Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute, p.second) + millis
  )
}

/** The calendar day that `instant` falls on in `tz`. */
export function toLocalDate(instant: Date, tz: string): LocalDate {
  const wall = wallClock(instant.getTime(), tz)
  return fromUtcMidnight(Math.floor(wall / MS_PER_DAY) * MS_PER_DAY)
}

/** The user's "today": the calendar day `now` falls on in their timezone. */
export function todayIn(tz: string, now: Date): LocalDate {
  return toLocalDate(now, tz)
}

/**
 * The first instant of `date` in `tz`. Usually local midnight; where midnight
 * is skipped by a daylight-saving change it is the first time that exists
 * (e.g. 01:00).
 */
export function startOfLocalDay(date: LocalDate, tz: string): Date {
  return new Date(wallToInstant(toUtcMidnight(date), tz))
}

/**
 * The instant at which the clock in `tz` shows `wall` (a wall-clock reading
 * written as if it were UTC).
 * - Repeated times (clocks went back): the earlier occurrence.
 * - Skipped times (clocks jumped forward): the moment of the jump, e.g. a
 *   02:30 that never happened becomes the instant clocks showed 03:00.
 */
function wallToInstant(wall: number, tz: string): number {
  const offsetAt = (ms: number) => wallClock(ms, tz) - ms

  // The answer is wall minus the UTC offset in force at that moment. Try the
  // offsets from a day before and a day after, which covers any daylight-saving
  // change nearby. If both are valid (the hour repeats), take the earlier.
  const candidates = [
    wall - offsetAt(wall - MS_PER_DAY),
    wall - offsetAt(wall + MS_PER_DAY),
  ].filter((ms) => wallClock(ms, tz) === wall)
  if (candidates.length > 0) return Math.min(...candidates)

  // The time doesn't exist. Find the first instant whose wall clock is on or
  // after it. UTC offsets are within -12h…+14h.
  let before = wall - 15 * 3_600_000 // definitely earlier on the wall clock
  let after = wall + 13 * 3_600_000 // definitely later on the wall clock
  while (after - before > 1) {
    const mid = Math.floor((before + after) / 2)
    if (wallClock(mid, tz) >= wall) after = mid
    else before = mid
  }
  return after
}

// ---------------------------------------------------------------------------
// Local times of day ("HH:MM", 24-hour, as <input type="time"> submits)
// ---------------------------------------------------------------------------

export type LocalTime = string & { readonly __brand: "LocalTime" }

const TIME_PATTERN = /^([01]\d|2[0-3]):([0-5]\d)$/

export function isLocalTime(value: unknown): value is LocalTime {
  return typeof value === "string" && TIME_PATTERN.test(value)
}

export const localTimeSchema = z
  .string()
  .refine(isLocalTime, "Choose a valid time.")
  .transform((value) => value as LocalTime)

/** The instant when the clock in `tz` shows `time` on `date` (see wallToInstant for DST gaps). */
export function localDateTimeToInstant(
  date: LocalDate,
  time: LocalTime,
  tz: string,
): Date {
  const [, h, m] = TIME_PATTERN.exec(time)!
  const wall = toUtcMidnight(date) + (Number(h) * 60 + Number(m)) * 60_000
  return new Date(wallToInstant(wall, tz))
}

/** The clock time ("HH:MM") in `tz` at `instant`. */
export function toLocalTime(instant: Date, tz: string): LocalTime {
  const minutes = Math.floor(
    (wallClock(instant.getTime(), tz) % MS_PER_DAY) / 60_000,
  )
  const pad = (n: number) => String(n).padStart(2, "0")
  return `${pad(Math.floor(minutes / 60))}:${pad(minutes % 60)}` as LocalTime
}

/**
 * The real-time span of `date` in `tz` as a half-open range [start, end).
 * Use it to query `timestamptz` columns:
 * `.gte("completed_at", start.toISOString()).lt("completed_at", end.toISOString())`.
 * Days are 23h or 25h long when daylight saving starts or ends.
 */
export function localDayRange(
  date: LocalDate,
  tz: string,
): { start: Date; end: Date } {
  return {
    start: startOfLocalDay(date, tz),
    end: startOfLocalDay(addDays(date, 1), tz),
  }
}

// ---------------------------------------------------------------------------
// Pure calendar arithmetic (no timezone involved)
// ---------------------------------------------------------------------------

/** `date` moved by `amount` calendar days (negative moves back). */
export function addDays(date: LocalDate, amount: number): LocalDate {
  if (!Number.isInteger(amount))
    throw new RangeError("amount must be a whole number of days")
  return fromUtcMidnight(toUtcMidnight(date) + amount * MS_PER_DAY)
}

/** Whole calendar days from `from` to `to` (negative if `to` is earlier). */
export function daysBetween(from: LocalDate, to: LocalDate): number {
  return Math.round((toUtcMidnight(to) - toUtcMidnight(from)) / MS_PER_DAY)
}

/** Negative if a is earlier, 0 if the same day, positive if later. Usable with Array.sort. */
export function compareLocalDates(a: LocalDate, b: LocalDate): number {
  return a < b ? -1 : a > b ? 1 : 0
}

export function isBeforeDay(a: LocalDate, b: LocalDate): boolean {
  return a < b
}

/** Day of the month, 1–31. */
export function dayOfMonth(date: LocalDate): number {
  return parts(date).day
}

/** 0 = Monday … 6 = Sunday (ISO order). */
export function dayOfWeek(date: LocalDate): number {
  return (new Date(toUtcMidnight(date)).getUTCDay() + 6) % 7
}

/** The Monday on or before `date`. Weeks start on Monday. */
export function startOfWeek(date: LocalDate): LocalDate {
  return addDays(date, -dayOfWeek(date))
}

export function startOfMonth(date: LocalDate): LocalDate {
  return fromParts({ ...parts(date), day: 1 })
}

/** Same day `amount` months later, clamped to the month's end (31 Jan + 1 → 28/29 Feb). */
export function addMonths(date: LocalDate, amount: number): LocalDate {
  if (!Number.isInteger(amount))
    throw new RangeError("amount must be a whole number of months")
  const { year, month, day } = parts(date)
  const index = year * 12 + (month - 1) + amount
  const target = { year: Math.floor(index / 12), month: (index % 12) + 1 }
  const lastDay = new Date(Date.UTC(target.year, target.month, 0)).getUTCDate()
  return fromParts({ ...target, day: Math.min(day, lastDay) })
}

export function isSameMonth(a: LocalDate, b: LocalDate): boolean {
  return a.slice(0, 7) === b.slice(0, 7)
}

/** Full Monday-to-Sunday weeks covering the month that contains `date` (4–6 rows). */
export function monthGrid(date: LocalDate): LocalDate[][] {
  const first = startOfMonth(date)
  const nextMonth = addMonths(first, 1)
  const weeks: LocalDate[][] = []
  for (let day = startOfWeek(first); day < nextMonth; day = addDays(day, 7)) {
    weeks.push(Array.from({ length: 7 }, (_, i) => addDays(day, i)))
  }
  return weeks
}

// ---------------------------------------------------------------------------
// Display
// ---------------------------------------------------------------------------

const FORMATS = {
  /** "Monday 12 October" */
  long: { weekday: "long", day: "numeric", month: "long" },
  /** "Mon 12 Oct" */
  short: { weekday: "short", day: "numeric", month: "short" },
  /** "12 October 2026" */
  full: { day: "numeric", month: "long", year: "numeric" },
  /** "Monday 12 October 2026" */
  longYear: { weekday: "long", day: "numeric", month: "long", year: "numeric" },
  /** "October 2026" */
  month: { month: "long", year: "numeric" },
  /** "Mon" */
  weekday: { weekday: "short" },
} satisfies Record<string, Intl.DateTimeFormatOptions>

/** Formats a calendar day for display. No timezone shift can occur. */
export function formatLocalDate(
  date: LocalDate,
  style: keyof typeof FORMATS = "long",
  locale = "en-GB",
): string {
  return new Intl.DateTimeFormat(locale, {
    ...FORMATS[style],
    timeZone: "UTC",
  }).format(new Date(toUtcMidnight(date)))
}
