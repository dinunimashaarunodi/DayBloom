// Repeating-task schedules (pure, unit-tested). occursOn() must agree with
// public.task_series_occurs_on() in the repeating_tasks migration (DB-tested).
import {
  addDays,
  addMonths,
  dayOfMonth,
  dayOfWeek,
  startOfMonth,
  type LocalDate,
} from "@/lib/dates/local-date"

export const EVERY_DAY = 0b1111111
export const WEEKDAYS = 0b0011111
export const WEEKENDS = 0b1100000

const SHORT_DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]

/** Either weekdays (days_mask, bit 0 = Monday) or a day of the month. */
export type RepeatRule =
  | { days_mask: number; month_day: null }
  | { days_mask: null; month_day: number }

export type TaskSeries = {
  id: string
  title: string
  notes: string | null
  priority: "low" | "normal" | "high"
  starts_on: LocalDate
  ends_on: LocalDate | null
  archived: boolean
} & RepeatRule

/** Columns selected for a TaskSeries (archived comes from archived_at). */
export const SERIES_COLUMNS =
  "id, title, notes, priority, days_mask, month_day, starts_on, ends_on, archived_at" as const

function lastDayOfMonth(date: LocalDate): number {
  return dayOfMonth(addDays(addMonths(startOfMonth(date), 1), -1))
}

/** Does the rule fall on this day? Month days past the month's end mean its last day. */
export function occursOn(rule: RepeatRule, date: LocalDate): boolean {
  if (rule.days_mask !== null) {
    return (rule.days_mask & (1 << dayOfWeek(date))) !== 0
  }
  return dayOfMonth(date) === Math.min(rule.month_day, lastDayOfMonth(date))
}

/**
 * The first day on or after `from` when the series is due, or null if it has
 * ended (or is archived). Looks at most a little over a year ahead.
 */
export function nextOccurrence(
  series: Pick<TaskSeries, "starts_on" | "ends_on" | "archived"> & RepeatRule,
  from: LocalDate,
): LocalDate | null {
  if (series.archived) return null
  let day = from < series.starts_on ? series.starts_on : from
  for (let i = 0; i < 400; i++, day = addDays(day, 1)) {
    if (series.ends_on !== null && day > series.ends_on) return null
    if (occursOn(series, day)) return day
  }
  return null
}

function ordinal(n: number): string {
  const rem100 = n % 100
  if (rem100 >= 11 && rem100 <= 13) return `${n}th`
  return `${n}${{ 1: "st", 2: "nd", 3: "rd" }[n % 10] ?? "th"}`
}

/** "Every day", "Weekdays", "Mon, Wed", "Monthly on the 15th". */
export function describeRepeat(rule: RepeatRule): string {
  if (rule.month_day !== null) {
    return rule.month_day >= 29
      ? `Monthly on the ${ordinal(rule.month_day)} (or the month's last day)`
      : `Monthly on the ${ordinal(rule.month_day)}`
  }
  if (rule.days_mask === EVERY_DAY) return "Every day"
  if (rule.days_mask === WEEKDAYS) return "Weekdays"
  if (rule.days_mask === WEEKENDS) return "Weekends"
  return SHORT_DAYS.filter((_, i) => rule.days_mask & (1 << i)).join(", ")
}
