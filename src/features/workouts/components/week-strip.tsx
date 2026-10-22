import { Check } from "lucide-react"

import { formatLocalDate, type LocalDate } from "@/lib/dates/local-date"
import { cn } from "@/lib/utils"

/**
 * Monday to Sunday of this week: a filled circle with a tick for each active
 * day, so colour is never the only cue. Future days are faint.
 */
export function WeekStrip({
  days,
  today,
}: {
  days: { date: LocalDate; active: boolean; future: boolean }[]
  today: LocalDate
}) {
  return (
    <ol aria-label="This week" className="flex gap-1.5">
      {days.map((day) => {
        const name = formatLocalDate(day.date, "weekday")
        return (
          <li
            key={day.date}
            className="grid justify-items-center gap-1"
            aria-label={`${name}${day.date === today ? " (today)" : ""}: ${day.active ? "worked out" : day.future ? "still ahead" : "rest day"}`}
          >
            <span
              className="text-[11px] text-muted-foreground"
              aria-hidden="true"
            >
              {name.slice(0, 1)}
            </span>
            <span
              aria-hidden="true"
              className={cn(
                "grid size-8 place-items-center rounded-full border",
                day.active
                  ? "border-primary bg-primary text-primary-foreground"
                  : day.future
                    ? "border-dashed border-border"
                    : "border-input",
                day.date === today && !day.active && "border-primary",
              )}
            >
              {day.active && <Check className="size-4" />}
            </span>
          </li>
        )
      })}
    </ol>
  )
}
