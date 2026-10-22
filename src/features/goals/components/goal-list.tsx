import { Trophy } from "lucide-react"
import Link from "next/link"

import type { LocalDate } from "@/lib/dates/local-date"

import { targetLabel, type Goal } from "../logic"
import { GoalProgress } from "./goal-progress"

/** Goals as cards linking to their detail page. */
export function GoalList({
  label,
  goals,
  today,
}: {
  label: string
  goals: Goal[]
  today: LocalDate
}) {
  return (
    <ul aria-label={label} className="grid gap-3 sm:grid-cols-2">
      {goals.map((goal) => {
        const target =
          goal.status === "active" ? targetLabel(goal.target_date, today) : null
        return (
          <li key={goal.id}>
            <Link
              href={`/goals/${goal.id}`}
              className="grid h-full content-start gap-3 surface p-4 transition-colors duration-200 outline-none hover:bg-muted/40 focus-visible:ring-3 focus-visible:ring-ring/50"
            >
              <span className="grid gap-0.5">
                <span className="flex items-center gap-1.5 font-medium">
                  {goal.status === "achieved" && (
                    <Trophy
                      className="size-4 shrink-0 text-gold"
                      aria-label="Achieved"
                    />
                  )}
                  <span className="truncate">{goal.title}</span>
                </span>
                {target && (
                  <span className="text-xs text-muted-foreground">
                    {target}
                  </span>
                )}
              </span>
              <GoalProgress milestones={goal.milestones} label={goal.title} />
            </Link>
          </li>
        )
      })}
    </ul>
  )
}
