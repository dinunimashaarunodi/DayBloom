import { ChevronRight, Repeat } from "lucide-react"
import Link from "next/link"

import type { LocalDate } from "@/lib/dates/local-date"
import { cn } from "@/lib/utils"

import { dueLabel } from "../logic"
import { describeRepeat, nextOccurrence, type TaskSeries } from "../repeat"

/** Repeating tasks with their schedule and next day, each linking to its page. */
export function SeriesList({
  label,
  series,
  today,
}: {
  label: string
  series: TaskSeries[]
  today: LocalDate
}) {
  return (
    <ul aria-label={label} className="divide-y overflow-hidden surface">
      {series.map((s) => {
        const next = nextOccurrence(s, today)
        return (
          <li key={s.id}>
            <Link
              href={`/tasks/repeating/${s.id}`}
              className="flex items-center gap-3 px-4 py-3 outline-none hover:bg-muted/60 focus-visible:bg-muted/60"
            >
              <span
                className={cn(
                  "grid size-9 shrink-0 place-items-center rounded-xl",
                  s.archived
                    ? "bg-muted text-muted-foreground"
                    : "bg-sage text-sage-ink",
                )}
              >
                <Repeat className="size-4.5" aria-hidden="true" />
              </span>
              <span className="grid min-w-0 flex-1 gap-0.5">
                <span className="truncate font-medium">{s.title}</span>
                <span className="text-xs text-muted-foreground">
                  {describeRepeat(s)}
                  {s.archived
                    ? " · Stopped"
                    : next
                      ? ` · Next: ${dueLabel(next, today)}`
                      : " · Finished"}
                </span>
              </span>
              <ChevronRight
                className="size-4 shrink-0 text-muted-foreground"
                aria-hidden="true"
              />
            </Link>
          </li>
        )
      })}
    </ul>
  )
}
