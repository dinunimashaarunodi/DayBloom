import { Plus, Target } from "lucide-react"
import type { Metadata } from "next"
import { Suspense } from "react"

import { EmptyState } from "@/components/empty-state"
import { DashboardCard } from "@/components/layout/dashboard-card"
import { PageHeader } from "@/components/layout/page-header"
import { Section } from "@/components/layout/section"
import { Skeleton } from "@/components/ui/skeleton"
import { createGoal } from "@/features/goals/actions"
import { GoalForm } from "@/features/goals/components/goal-form"
import { GoalList } from "@/features/goals/components/goal-list"
import { sortActiveGoals } from "@/features/goals/logic"
import { getGoals } from "@/features/goals/queries"

export const metadata: Metadata = { title: "Goals" }

export default function GoalsPage() {
  return (
    <>
      <PageHeader
        title="Goals"
        description="Bigger things you're working towards, one milestone at a time."
      />
      <div className="grid gap-6 md:gap-8 lg:grid-cols-[minmax(0,1fr)_20rem]">
        {/* After the list on phones: returning users come for their goals. */}
        <aside className="order-last">
          <DashboardCard title="New goal" icon={Plus} accent="sage">
            <GoalForm action={createGoal} submitLabel="Create goal" />
          </DashboardCard>
        </aside>
        <Suspense fallback={<Skeleton className="h-64 rounded-xl" />}>
          <Goals />
        </Suspense>
      </div>
    </>
  )
}

async function Goals() {
  const { today, goals } = await getGoals()
  const active = sortActiveGoals(goals.filter((g) => g.status === "active"))
  const achieved = goals.filter((g) => g.status === "achieved")
  const archived = goals.filter((g) => g.status === "archived")

  return (
    <div className="grid content-start gap-8">
      <Section id="active" title="In progress">
        {active.length === 0 ? (
          <EmptyState icon={Target} title="No goals in progress">
            Pick something that matters to you, then break it into small
            milestones.
          </EmptyState>
        ) : (
          <GoalList label="In progress" goals={active} today={today} />
        )}
      </Section>

      {achieved.length > 0 && (
        <Section
          id="achieved"
          title={`Achieved · ${achieved.length}`}
          description="Look how far you've come."
        >
          <GoalList label="Achieved" goals={achieved} today={today} />
        </Section>
      )}

      {archived.length > 0 && (
        <details className="group grid gap-3">
          <summary className="cursor-pointer rounded-sm font-medium outline-none focus-visible:ring-3 focus-visible:ring-ring/50">
            Archived · {archived.length}
          </summary>
          <div className="mt-3">
            <GoalList label="Archived" goals={archived} today={today} />
          </div>
        </details>
      )}
    </div>
  )
}
