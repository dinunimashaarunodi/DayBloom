import { Dumbbell } from "lucide-react"
import Link from "next/link"

import { DashboardCard } from "@/components/layout/dashboard-card"
import { formatMinutes } from "@/lib/duration"

import { weekSummary } from "../logic"
import { getWorkoutDays } from "../queries"

/** Today's dashboard: this week's workouts at a glance. */
export async function TodayWorkoutsCard() {
  const { today, logged } = await getWorkoutDays()
  const week = weekSummary(logged, today)
  const todayMinutes = logged
    .filter((w) => w.local_date === today)
    .reduce((sum, w) => sum + w.duration_minutes, 0)

  return (
    <DashboardCard
      title="Workouts"
      icon={Dumbbell}
      accent="mint"
      action={
        <Link
          href="/workouts"
          className="text-xs font-medium text-primary underline-offset-4 hover:underline"
        >
          Log a workout
        </Link>
      }
    >
      <p className="grid gap-0.5">
        <span className="text-sm text-muted-foreground">
          {todayMinutes > 0
            ? `Moved ${formatMinutes(todayMinutes)} today. Nice!`
            : "Nothing logged today yet."}
        </span>
        <span className="text-sm tabular-nums">
          This week: {week.count} workout{week.count === 1 ? "" : "s"}
          {week.minutes > 0 && `, ${formatMinutes(week.minutes)}`}
        </span>
      </p>
    </DashboardCard>
  )
}
