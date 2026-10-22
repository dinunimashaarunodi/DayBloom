import { Target } from "lucide-react"
import Link from "next/link"

import { DashboardCard } from "@/components/layout/dashboard-card"

import { sortActiveGoals, targetLabel } from "../logic"
import { getGoals } from "../queries"
import { GoalProgress } from "./goal-progress"

const PREVIEW = 3

/** Today's dashboard: the active goals with the nearest targets. */
export async function TodayGoalsCard() {
  const { today, goals } = await getGoals()
  const active = sortActiveGoals(goals.filter((g) => g.status === "active"))

  return (
    <DashboardCard
      title="Goals"
      icon={Target}
      accent="sage"
      action={
        <Link
          href="/goals"
          className="text-xs font-medium text-primary underline-offset-4 hover:underline"
        >
          {active.length > 0 ? "All goals" : "Set a goal"}
        </Link>
      }
    >
      {active.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          Something you&apos;d like to work towards? Break it into small steps.
        </p>
      ) : (
        <ul aria-label="Active goals" className="grid gap-3">
          {active.slice(0, PREVIEW).map((goal) => {
            const target = targetLabel(goal.target_date, today)
            return (
              <li key={goal.id}>
                <Link
                  href={`/goals/${goal.id}`}
                  className="-mx-2 grid gap-1.5 rounded-lg px-2 py-1.5 outline-none hover:bg-muted/60 focus-visible:ring-3 focus-visible:ring-ring/50"
                >
                  <span className="grid gap-0.5">
                    <span className="truncate text-sm font-medium">
                      {goal.title}
                    </span>
                    {target && (
                      <span className="text-xs text-muted-foreground">
                        {target}
                      </span>
                    )}
                  </span>
                  <GoalProgress
                    milestones={goal.milestones}
                    label={goal.title}
                  />
                </Link>
              </li>
            )
          })}
        </ul>
      )}
    </DashboardCard>
  )
}
