import { PartyPopper } from "lucide-react"
import type { Metadata } from "next"
import { Suspense } from "react"

import { PageHeader } from "@/components/layout/page-header"
import { Section } from "@/components/layout/section"
import { Skeleton } from "@/components/ui/skeleton"
import { AchievementGrid } from "@/features/achievements/components/achievement-grid"
import { MarkSeen } from "@/features/achievements/components/mark-seen"
import { getAchievements } from "@/features/achievements/queries"

export const metadata: Metadata = { title: "Achievements" }

export default function AchievementsPage() {
  return (
    <>
      <PageHeader
        title="Achievements"
        description="Milestones you reach just by showing up. No rush, no pressure."
      />
      <Suspense fallback={<Skeleton className="h-96 rounded-xl" />}>
        <Achievements />
      </Suspense>
    </>
  )
}

async function Achievements() {
  const achievements = await getAchievements()
  const fresh = achievements.filter((a) => a.isNew)
  const unlocked = achievements.filter((a) => a.unlocked && !a.isNew)
  const locked = achievements.filter((a) => !a.unlocked)
  const total = achievements.length

  return (
    <div className="grid gap-8">
      <MarkSeen codes={fresh.map((a) => a.code)} />
      <div className="grid gap-2 surface p-4">
        <p className="text-sm text-muted-foreground">Unlocked</p>
        <p className="text-2xl font-semibold tabular-nums">
          {total - locked.length} of {total}
        </p>
      </div>

      {fresh.length > 0 && (
        <Section
          id="new"
          title={
            <span className="inline-flex items-center gap-2">
              <PartyPopper className="size-4 text-gold" aria-hidden="true" />
              New for you
            </span>
          }
        >
          <AchievementGrid label="New achievements" achievements={fresh} />
        </Section>
      )}

      {unlocked.length > 0 && (
        <Section id="unlocked" title="Unlocked">
          <AchievementGrid
            label="Unlocked achievements"
            achievements={unlocked}
          />
        </Section>
      )}

      {locked.length > 0 && (
        <Section
          id="in-progress"
          title="Still to come"
          description="Closest first."
        >
          <AchievementGrid
            label="Achievements still to come"
            achievements={locked}
          />
        </Section>
      )}
    </div>
  )
}
