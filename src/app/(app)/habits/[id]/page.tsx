import { Archive, ArchiveRestore } from "lucide-react"
import type { Metadata } from "next"
import { notFound } from "next/navigation"
import { Suspense } from "react"

import { BackLink } from "@/components/layout/back-link"
import { PageHeader } from "@/components/layout/page-header"
import { Section } from "@/components/layout/section"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { Skeleton } from "@/components/ui/skeleton"
import { setHabitArchived, updateHabit } from "@/features/habits/actions"
import { HabitForm } from "@/features/habits/components/habit-form"
import { HabitHeatmap } from "@/features/habits/components/habit-heatmap"
import {
  bestStreak,
  completionRate,
  currentStreak,
  describeSchedule,
} from "@/features/habits/logic"
import { getHabit } from "@/features/habits/queries"
import { habitIdSchema } from "@/features/habits/schema"
import { addDays } from "@/lib/dates/local-date"

export const metadata: Metadata = { title: "Habit" }

export default function HabitPage({ params }: PageProps<"/habits/[id]">) {
  return (
    <>
      <BackLink href="/habits" label="Habits" />
      <Suspense fallback={<Skeleton className="h-96" />}>
        <HabitDetail params={params} />
      </Suspense>
    </>
  )
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid gap-0.5 surface p-4">
      <p className="text-sm text-muted-foreground">{label}</p>
      <p className="text-2xl font-semibold tabular-nums">{value}</p>
    </div>
  )
}

async function HabitDetail({
  params,
}: Pick<PageProps<"/habits/[id]">, "params">) {
  const { id } = await params
  if (!habitIdSchema.safeParse(id).success) notFound()
  const { today, habit } = await getHabit(id)
  if (!habit) notFound()

  const done = new Set<string>(habit.done)
  const streak = currentStreak(habit, done, today)
  const best = bestStreak(habit, done, today)
  const month = completionRate(habit, done, addDays(today, -29), today)
  const days = (n: number) => `${n} day${n === 1 ? "" : "s"}`

  return (
    <>
      <PageHeader
        title={habit.name}
        description={
          habit.archived
            ? `${describeSchedule(habit.days_mask)} · Archived`
            : describeSchedule(habit.days_mask)
        }
      />
      <div className="grid gap-8">
        <div className="grid gap-4 sm:grid-cols-3">
          <Stat label="Current streak" value={days(streak)} />
          <Stat label="Best streak" value={days(best)} />
          <Stat
            label="Last 30 days"
            value={month.percent === null ? "–" : `${month.percent}%`}
          />
        </div>

        <Section id="history" title="History">
          <div className="surface p-4 sm:p-5">
            <HabitHeatmap habit={habit} done={done} today={today} />
          </div>
        </Section>

        {!habit.archived && (
          <Section id="edit" title="Edit habit">
            <div className="max-w-xl">
              <HabitForm
                action={updateHabit.bind(null, habit.id)}
                submitLabel="Save changes"
                name={habit.name}
                daysMask={habit.days_mask}
              />
            </div>
          </Section>
        )}

        <Separator />
        <form action={setHabitArchived.bind(null, habit.id, !habit.archived)}>
          <Button type="submit" variant="outline" className="h-10 px-4">
            {habit.archived ? (
              <>
                <ArchiveRestore aria-hidden="true" />
                Restore habit
              </>
            ) : (
              <>
                <Archive aria-hidden="true" />
                Archive habit
              </>
            )}
          </Button>
          {!habit.archived && (
            <p className="mt-2 text-xs text-muted-foreground">
              Archiving hides it from your lists and keeps its history.
            </p>
          )}
        </form>
      </div>
    </>
  )
}
