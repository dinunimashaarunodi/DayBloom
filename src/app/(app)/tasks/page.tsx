import {
  CalendarClock,
  CircleCheck,
  Inbox,
  ListChecks,
  Plus,
  Repeat,
} from "lucide-react"
import type { Metadata } from "next"
import { Suspense } from "react"

import { EmptyState } from "@/components/empty-state"
import { DashboardCard } from "@/components/layout/dashboard-card"
import { PageHeader } from "@/components/layout/page-header"
import { Section } from "@/components/layout/section"
import { QuickAddTask } from "@/features/tasks/components/quick-add-task"
import { SeriesForm } from "@/features/tasks/components/series-form"
import { SeriesList } from "@/features/tasks/components/series-list"
import { TaskList } from "@/features/tasks/components/task-list"
import { TaskListSkeleton } from "@/features/tasks/components/task-list-skeleton"
import { TaskViewsNav } from "@/features/tasks/components/task-views-nav"
import {
  ensureRepeatingTasks,
  getSeriesList,
  getTasks,
  getUserToday,
} from "@/features/tasks/queries"
import { createSeries } from "@/features/tasks/series-actions"
import { parseTaskView, type TaskView } from "@/features/tasks/schema"
import { addDays } from "@/lib/dates/local-date"

export const metadata: Metadata = { title: "Tasks" }

const EMPTY: Record<
  TaskView,
  { icon: typeof ListChecks; title: string; body: string }
> = {
  today: {
    icon: ListChecks,
    title: "Nothing due today",
    body: "Add a task, or enjoy the free space.",
  },
  upcoming: {
    icon: CalendarClock,
    title: "Nothing planned ahead",
    body: "Tasks with a future date show up here.",
  },
  someday: {
    icon: Inbox,
    title: "No undated tasks",
    body: "Ideas without a date land here until you're ready to plan them.",
  },
  repeating: {
    icon: Repeat,
    title: "No repeating tasks yet",
    body: "Add something you do regularly, and it appears on each day it's due.",
  },
  done: {
    icon: CircleCheck,
    title: "Nothing finished yet",
    body: "Completed tasks will collect here.",
  },
}

export default function TasksPage({ searchParams }: PageProps<"/tasks">) {
  return (
    <>
      <PageHeader
        title="Tasks"
        description="Everything you plan to do, in one place."
      />
      <Suspense fallback={<TaskListSkeleton />}>
        <TaskViewContent searchParams={searchParams} />
      </Suspense>
    </>
  )
}

async function TaskViewContent({
  searchParams,
}: Pick<PageProps<"/tasks">, "searchParams">) {
  const view = parseTaskView((await searchParams).view)
  if (view === "repeating") return <RepeatingView />
  await ensureRepeatingTasks()
  const { today, tasks } = await getTasks(view)
  const empty = EMPTY[view]
  const defaultDueDate =
    view === "today" ? today : view === "upcoming" ? addDays(today, 1) : ""

  return (
    <>
      <TaskViewsNav current={view} />
      <div className="grid gap-6">
        {view !== "done" && (
          // Keyed by view so the date default resets when switching lists.
          <QuickAddTask key={view} defaultDueDate={defaultDueDate} />
        )}
        {tasks.length > 0 ? (
          <TaskList
            label={`${view} tasks`}
            tasks={tasks}
            today={today}
            reorderable={view === "someday"}
          />
        ) : (
          <EmptyState icon={empty.icon} title={empty.title}>
            {empty.body}
          </EmptyState>
        )}
      </div>
    </>
  )
}

async function RepeatingView() {
  const [{ today }, series] = await Promise.all([
    getUserToday(),
    getSeriesList(),
  ])
  const active = series.filter((s) => !s.archived)
  const stopped = series.filter((s) => s.archived)

  return (
    <>
      <TaskViewsNav current="repeating" />
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_22rem]">
        <div className="grid content-start gap-6">
          {active.length > 0 ? (
            <SeriesList label="Repeating tasks" series={active} today={today} />
          ) : (
            <EmptyState
              icon={EMPTY.repeating.icon}
              title={EMPTY.repeating.title}
            >
              {EMPTY.repeating.body}
            </EmptyState>
          )}
          {stopped.length > 0 && (
            <Section
              id="stopped"
              title="Stopped"
              description="These no longer repeat. Open one to start it again."
            >
              <SeriesList label="Stopped" series={stopped} today={today} />
            </Section>
          )}
          <p className="text-xs text-muted-foreground">
            Each repeat appears in your list on the day it&apos;s due. If one
            isn&apos;t finished, you decide what to do with it, as with any
            task.
          </p>
        </div>
        <aside>
          <DashboardCard title="New repeating task" icon={Plus} accent="sage">
            <SeriesForm
              action={createSeries}
              submitLabel="Add repeating task"
              today={today}
            />
          </DashboardCard>
        </aside>
      </div>
    </>
  )
}
