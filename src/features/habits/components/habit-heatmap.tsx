import {
  addDays,
  formatLocalDate,
  startOfWeek,
  type LocalDate,
} from "@/lib/dates/local-date"
import { cn } from "@/lib/utils"

import { isScheduled, type Habit } from "../logic"

const WEEKS = 12

/**
 * The last 12 weeks as a Monday-first grid (columns are weeks). Three states,
 * each with its own shape, so colour is never the only cue:
 * done (filled), missed scheduled day (outlined), not scheduled (faint dot).
 */
export function HabitHeatmap({
  habit,
  done,
  today,
}: {
  habit: Habit
  done: ReadonlySet<string>
  today: LocalDate
}) {
  const firstMonday = addDays(startOfWeek(today), -(WEEKS - 1) * 7)
  const weeks = Array.from({ length: WEEKS }, (_, w) =>
    Array.from({ length: 7 }, (_, d) => addDays(firstMonday, w * 7 + d)),
  )
  const doneCount = weeks.flat().filter((d) => d <= today && done.has(d)).length

  return (
    <figure className="grid gap-2">
      <div
        className="grid w-max max-w-full auto-cols-max grid-flow-col grid-rows-7 gap-1 overflow-x-auto"
        aria-hidden="true"
      >
        {weeks.flat().map((date) => {
          const future = date > today
          const beforeStart = date < habit.started_on
          const isDone = done.has(date)
          const scheduled = isScheduled(habit.days_mask, date)
          return (
            <span
              key={date}
              title={`${formatLocalDate(date, "short")}: ${isDone ? "done" : scheduled ? "not done" : "not scheduled"}`}
              className={cn(
                "size-4 rounded-[4px]",
                future || beforeStart
                  ? "opacity-0"
                  : isDone
                    ? "bg-primary"
                    : scheduled
                      ? "border border-input"
                      : "scale-50 rounded-full bg-muted",
              )}
            />
          )
        })}
      </div>
      <figcaption className="text-xs text-muted-foreground">
        Last 12 weeks: {doneCount} check-in{doneCount === 1 ? "" : "s"}. Filled
        squares are done, outlined ones were scheduled.
      </figcaption>
    </figure>
  )
}
