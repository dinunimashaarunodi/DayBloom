import { Trophy } from "lucide-react"
import Link from "next/link"

import { DashboardCard } from "@/components/layout/dashboard-card"

import { getAchievements } from "../queries"

/** Today's dashboard: how many are unlocked, and any new ones to celebrate. */
export async function TodayAchievementsCard() {
  const achievements = await getAchievements()
  const unlocked = achievements.filter((a) => a.unlocked).length
  const fresh = achievements.filter((a) => a.isNew)
  const next = achievements.find((a) => !a.unlocked)

  return (
    <DashboardCard
      title="Achievements"
      icon={Trophy}
      accent="rose"
      action={
        <Link
          href="/achievements"
          className="text-xs font-medium text-primary underline-offset-4 hover:underline"
        >
          {fresh.length > 0 ? "Celebrate" : "See all"}
        </Link>
      }
    >
      <p className="grid gap-0.5 text-sm">
        {fresh.length > 0 ? (
          <span className="font-medium">
            New: {fresh.map((a) => a.title).join(", ")}
          </span>
        ) : (
          next && (
            <span className="text-muted-foreground">
              Next up: {next.title}. {next.description}
            </span>
          )
        )}
        <span className="tabular-nums">
          {unlocked} of {achievements.length} unlocked
        </span>
      </p>
    </DashboardCard>
  )
}
