import { Sun } from "lucide-react"
import type { Metadata } from "next"
import { connection } from "next/server"
import { Suspense } from "react"

import { EmptyState } from "@/components/empty-state"
import { PageHeader } from "@/components/layout/page-header"
import { Section } from "@/components/layout/section"
import { Skeleton } from "@/components/ui/skeleton"
import { getProfile } from "@/features/profile/queries"
import { QuickAddTask } from "@/features/tasks/components/quick-add-task"
import { TaskList } from "@/features/tasks/components/task-list"
import { TaskListSkeleton } from "@/features/tasks/components/task-list-skeleton"
import { getTodayTasks } from "@/features/tasks/queries"
import { formatLongDate, localHour } from "@/lib/dates/timezone"

export const metadata: Metadata = { title: "Today" }

export default function TodayPage() {
  return (
    <>
      <Suspense fallback={<HeaderSkeleton />}>
        <TodayHeader />
      </Suspense>
      <Suspense fallback={<TaskListSkeleton />}>
        <TodayTasks />
      </Suspense>
    </>
  )
}

async function TodayHeader() {
  const profile = await getProfile()
  await connection() // "now" must be read at request time, never at build time.
  const now = new Date()
  const hour = localHour(now, profile.timezone)
  const greeting =
    hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening"
  const name = profile.displayName ? `, ${profile.displayName}` : ""

  return (
    <PageHeader
      title={`${greeting}${name}`}
      description={formatLongDate(now, profile.timezone)}
    />
  )
}

async function TodayTasks() {
  const { today, overdue, planned, done } = await getTodayTasks()

  return (
    <div className="grid gap-8">
      <QuickAddTask fixedDueDate={today} />

      {overdue.length > 0 && (
        <Section
          id="earlier"
          title="From earlier days"
          description="Still open. Open one to give it a new date, or let it go."
        >
          <TaskList label="From earlier days" tasks={overdue} today={today} />
        </Section>
      )}

      <Section id="today" title="Today">
        {planned.length > 0 ? (
          <TaskList
            label="Today"
            tasks={planned}
            today={today}
            reorderable
            hideDueToday
          />
        ) : (
          <EmptyState icon={Sun} title="Your day is a blank page">
            Add something you&apos;d like to get done today.
          </EmptyState>
        )}
      </Section>

      {done.length > 0 && (
        <Section
          id="done"
          title={`Done today · ${done.length}`}
          description="Nice work. Every one counts."
        >
          <TaskList
            label="Done today"
            tasks={done}
            today={today}
            hideDueToday
          />
        </Section>
      )}
    </div>
  )
}

function HeaderSkeleton() {
  return (
    <div className="mb-6 grid gap-2" aria-hidden="true">
      <Skeleton className="h-8 w-64" />
      <Skeleton className="h-4 w-40" />
    </div>
  )
}
