import { Plus, Repeat } from "lucide-react"
import type { Metadata } from "next"
import { Suspense } from "react"

import { EmptyState } from "@/components/empty-state"
import { DashboardCard } from "@/components/layout/dashboard-card"
import { PageHeader } from "@/components/layout/page-header"
import { Skeleton } from "@/components/ui/skeleton"
import { createHabit } from "@/features/habits/actions"
import { HabitForm } from "@/features/habits/components/habit-form"
import { HabitList } from "@/features/habits/components/habit-list"
import { toListItems } from "@/features/habits/components/to-list-items"
import { getHabits } from "@/features/habits/queries"

export const metadata: Metadata = { title: "Habits" }

export default function HabitsPage() {
  return (
    <>
      <PageHeader
        title="Habits"
        description="Small things, done often. Tap a circle to check in for that day."
      />
      <div className="grid gap-6 md:gap-8 lg:grid-cols-[minmax(0,1fr)_20rem]">
        <aside className="order-first lg:order-last">
          <DashboardCard title="New habit" icon={Plus} accent="sage">
            <HabitForm action={createHabit} submitLabel="Add habit" />
          </DashboardCard>
        </aside>
        <Suspense fallback={<Skeleton className="h-64 rounded-xl" />}>
          <Habits />
        </Suspense>
      </div>
    </>
  )
}

async function Habits() {
  const { today, habits } = await getHabits()
  if (habits.length === 0) {
    return (
      <EmptyState icon={Repeat} title="No habits yet">
        Start with one small habit you&apos;d like to do regularly.
      </EmptyState>
    )
  }
  return (
    <div className="grid content-start gap-2">
      <HabitList items={toListItems(habits, today)} today={today} />
      <p className="text-xs text-muted-foreground">
        You can check in for today and the 7 days before it. Dashed circles are
        days off; checking in on them still counts.
      </p>
    </div>
  )
}
