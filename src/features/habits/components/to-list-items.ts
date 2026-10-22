import type { LocalDate } from "@/lib/dates/local-date"

import {
  currentStreak,
  describeSchedule,
  isScheduled,
  recentDays,
} from "../logic"
import type { HabitWithHistory } from "../queries"
import type { HabitListItem } from "./habit-list"

/** Shapes habits for <HabitList> (server side): last 7 days and streaks. */
export function toListItems(
  habits: HabitWithHistory[],
  today: LocalDate,
): HabitListItem[] {
  return habits.map((habit) => {
    const done = new Set<string>(habit.done)
    return {
      id: habit.id,
      name: habit.name,
      schedule: describeSchedule(habit.days_mask),
      streak: currentStreak(habit, done, today),
      days: recentDays(today, 7)
        .filter((day) => day.date >= habit.started_on)
        .map((day) => ({
          ...day,
          scheduled: isScheduled(habit.days_mask, day.date),
          done: done.has(day.date),
        })),
    }
  })
}
