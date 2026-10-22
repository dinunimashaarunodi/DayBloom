import { Timer } from "lucide-react"
import Link from "next/link"

import { DashboardCard } from "@/components/layout/dashboard-card"
import { toLocalTime } from "@/lib/dates/local-date"

import { dailyMinutes, formatMinutes, plannedEnd } from "../logic"
import { getFocusOverview } from "../queries"

/** Today's dashboard: focused time today, or the session that's running. */
export async function TodayFocusCard() {
  const { today, timezone, now, sessions, active } = await getFocusOverview()
  const minutes = dailyMinutes(sessions, today, timezone, now, 1)[0]!.minutes

  return (
    <DashboardCard
      title="Focus"
      icon={Timer}
      accent="lavender"
      action={
        <Link
          href="/focus"
          className="text-xs font-medium text-primary underline-offset-4 hover:underline"
        >
          {active ? "Open timer" : "Start focus"}
        </Link>
      }
    >
      {active ? (
        <p className="grid gap-0.5">
          <span className="truncate font-medium">
            {active.label ?? "Focus session"}
          </span>
          <span className="text-sm text-muted-foreground tabular-nums">
            In progress, until {toLocalTime(plannedEnd(active), timezone)}
          </span>
        </p>
      ) : (
        <p className="grid gap-0.5">
          <span className="text-2xl font-semibold tabular-nums">
            {formatMinutes(minutes)}
          </span>
          <span className="text-sm text-muted-foreground">focused today</span>
        </p>
      )}
    </DashboardCard>
  )
}
