// Pure habit rules (no React, Next.js or Supabase), unit-tested.
import {
  addDays,
  dayOfWeek,
  formatLocalDate,
  type LocalDate,
} from "@/lib/dates/local-date"

export type Habit = {
  id: string
  name: string
  days_mask: number
  /** Local day the habit was created (streaks never count before it). */
  started_on: LocalDate
}

export const EVERY_DAY = 0b1111111
export const WEEKDAYS = 0b0011111
export const WEEKENDS = 0b1100000

/** Bit for a weekday: 0 = Monday … 6 = Sunday. */
export const dayBit = (weekday: number) => 1 << weekday

export function isScheduled(mask: number, date: LocalDate): boolean {
  return (mask & dayBit(dayOfWeek(date))) !== 0
}

const SHORT_DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]

export function describeSchedule(mask: number): string {
  if (mask === EVERY_DAY) return "Every day"
  if (mask === WEEKDAYS) return "Weekdays"
  if (mask === WEEKENDS) return "Weekends"
  return SHORT_DAYS.filter((_, i) => mask & dayBit(i)).join(", ")
}

/**
 * Consecutive scheduled days completed, ending today. Unscheduled days are
 * skipped. Today counts if done, but an unfinished today doesn't break the
 * streak: the day isn't over yet.
 */
export function currentStreak(
  habit: Habit,
  done: ReadonlySet<string>,
  today: LocalDate,
): number {
  let streak = 0
  let date = today
  if (!done.has(today)) date = addDays(today, -1)
  for (; date >= habit.started_on; date = addDays(date, -1)) {
    if (!isScheduled(habit.days_mask, date)) {
      // A check-in on an unscheduled day is a bonus, never a break.
      if (done.has(date)) streak++
      continue
    }
    if (!done.has(date)) break
    streak++
  }
  return streak
}

/** The longest run of completed scheduled days from the start until today. */
export function bestStreak(
  habit: Habit,
  done: ReadonlySet<string>,
  today: LocalDate,
): number {
  let best = 0
  let run = 0
  for (let date = habit.started_on; date <= today; date = addDays(date, 1)) {
    if (done.has(date)) {
      run++
      best = Math.max(best, run)
    } else if (isScheduled(habit.days_mask, date) && date !== today) {
      run = 0
    }
  }
  return best
}

/** Completed scheduled days / scheduled days in [from, to], clamped to the start. */
export function completionRate(
  habit: Habit,
  done: ReadonlySet<string>,
  from: LocalDate,
  to: LocalDate,
): { done: number; scheduled: number; percent: number | null } {
  let scheduled = 0
  let completed = 0
  const start = from < habit.started_on ? habit.started_on : from
  for (let date = start; date <= to; date = addDays(date, 1)) {
    if (!isScheduled(habit.days_mask, date)) continue
    scheduled++
    if (done.has(date)) completed++
  }
  return {
    done: completed,
    scheduled,
    percent: scheduled === 0 ? null : Math.round((completed / scheduled) * 100),
  }
}

/** The last `count` days ending today, oldest first, with a short label. */
export function recentDays(
  today: LocalDate,
  count: number,
): { date: LocalDate; label: string }[] {
  return Array.from({ length: count }, (_, i) => {
    const date = addDays(today, i - count + 1)
    return { date, label: formatLocalDate(date, "weekday") }
  })
}
