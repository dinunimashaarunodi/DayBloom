import { Languages } from "lucide-react"
import Link from "next/link"

import { DashboardCard } from "@/components/layout/dashboard-card"
import { formatMinutes } from "@/lib/duration"

import { dayMinutes, dayStreak, weekMinutes } from "../logic"
import { getLanguagesOverview } from "../queries"

/** Today's dashboard: language practice today and this week. */
export async function TodayLanguagesCard() {
  const { today, languages, practice } = await getLanguagesOverview()
  const active = languages.filter((l) => !l.archived)
  const todayMinutes = dayMinutes(practice, today)
  const streak = dayStreak(
    practice.map((p) => p.local_date),
    today,
  )

  return (
    <DashboardCard
      title="Languages"
      icon={Languages}
      accent="lavender"
      action={
        <Link
          href="/languages"
          className="text-xs font-medium text-primary underline-offset-4 hover:underline"
        >
          {active.length > 0 ? "Practise" : "Add a language"}
        </Link>
      }
    >
      {active.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          Learning a language? Track your practice and new words here.
        </p>
      ) : (
        <p className="grid gap-0.5 text-sm">
          <span className="text-muted-foreground">
            {todayMinutes > 0
              ? `${formatMinutes(todayMinutes)} practised today.`
              : "No practice logged today yet."}
          </span>
          <span className="tabular-nums">
            This week: {formatMinutes(weekMinutes(practice, today))}
            {streak > 1 && ` · ${streak}-day streak`}
          </span>
        </p>
      )}
    </DashboardCard>
  )
}
