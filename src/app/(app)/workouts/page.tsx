import { CalendarCheck, Dumbbell, Plus } from "lucide-react"
import type { Metadata } from "next"
import Link from "next/link"
import { Suspense } from "react"

import { EmptyState } from "@/components/empty-state"
import { DashboardCard } from "@/components/layout/dashboard-card"
import { PageHeader } from "@/components/layout/page-header"
import { Section } from "@/components/layout/section"
import { buttonVariants } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { getUserToday } from "@/features/tasks/queries"
import { createWorkout } from "@/features/workouts/actions"
import { WeekStrip } from "@/features/workouts/components/week-strip"
import { WorkoutForm } from "@/features/workouts/components/workout-form"
import { WorkoutList } from "@/features/workouts/components/workout-list"
import { weekStreak, weekSummary } from "@/features/workouts/logic"
import {
  getWorkoutDays,
  getWorkouts,
  PAGE_SIZE,
} from "@/features/workouts/queries"
import { formatMinutes } from "@/lib/duration"
import { cn } from "@/lib/utils"

export const metadata: Metadata = { title: "Workouts" }

export default function WorkoutsPage({ searchParams }: PageProps<"/workouts">) {
  return (
    <>
      <PageHeader
        title="Workouts"
        description="Every bit of movement counts. Log it and watch your weeks fill up."
      />
      <div className="grid gap-6 md:gap-8 lg:grid-cols-[minmax(0,1fr)_22rem]">
        <aside className="order-first lg:order-last">
          <DashboardCard title="Log a workout" icon={Plus} accent="mint">
            <Suspense fallback={<Skeleton className="h-80" />}>
              <NewWorkoutForm />
            </Suspense>
          </DashboardCard>
        </aside>
        <div className="grid content-start gap-8">
          <Suspense fallback={<Skeleton className="h-36 rounded-xl" />}>
            <ThisWeek />
          </Suspense>
          <Suspense fallback={<Skeleton className="h-64 rounded-xl" />}>
            <Recent searchParams={searchParams} />
          </Suspense>
        </div>
      </div>
    </>
  )
}

async function NewWorkoutForm() {
  const { today } = await getUserToday()
  return (
    <WorkoutForm
      action={createWorkout}
      submitLabel="Log workout"
      today={today}
    />
  )
}

async function ThisWeek() {
  const { today, logged } = await getWorkoutDays()
  const week = weekSummary(logged, today)
  const streak = weekStreak(
    logged.map((w) => w.local_date),
    today,
  )

  return (
    <DashboardCard title="This week" icon={CalendarCheck} accent="mint">
      <div className="grid gap-4">
        <WeekStrip days={week.days} today={today} />
        <dl className="grid grid-cols-3 gap-2 text-sm">
          <div className="grid gap-0.5">
            <dt className="text-muted-foreground">Workouts</dt>
            <dd className="text-xl font-semibold tabular-nums">{week.count}</dd>
          </div>
          <div className="grid gap-0.5">
            <dt className="text-muted-foreground">Time</dt>
            <dd className="text-xl font-semibold tabular-nums">
              {formatMinutes(week.minutes)}
            </dd>
          </div>
          <div className="grid gap-0.5">
            <dt className="text-muted-foreground">Active weeks</dt>
            <dd className="text-xl font-semibold tabular-nums">
              {streak} in a row
            </dd>
          </div>
        </dl>
      </div>
    </DashboardCard>
  )
}

function pageCount(value: string | string[] | undefined) {
  const n = Number(Array.isArray(value) ? value[0] : value)
  return Number.isInteger(n) && n >= 1 && n <= 50 ? n : 1
}

async function Recent({
  searchParams,
}: Pick<PageProps<"/workouts">, "searchParams">) {
  const pages = pageCount((await searchParams).pages)
  const { workouts, hasMore } = await getWorkouts(pages * PAGE_SIZE)

  return (
    <Section id="recent" title="Recent workouts">
      {workouts.length === 0 ? (
        <EmptyState icon={Dumbbell} accent="mint" title="No workouts yet">
          A walk, a stretch or a full session: log your first one to start your
          week.
        </EmptyState>
      ) : (
        <>
          <WorkoutList workouts={workouts} />
          {hasMore && (
            <Link
              href={`/workouts?pages=${pages + 1}`}
              scroll={false}
              className={cn(
                buttonVariants({ variant: "outline" }),
                "h-10 justify-self-start px-4",
              )}
            >
              Show older workouts
            </Link>
          )}
        </>
      )}
    </Section>
  )
}
