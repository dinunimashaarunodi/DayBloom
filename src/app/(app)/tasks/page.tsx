import { CalendarClock, CircleCheck, Inbox, ListChecks } from "lucide-react"
import type { Metadata } from "next"
import { Suspense } from "react"

import { EmptyState } from "@/components/empty-state"
import { PageHeader } from "@/components/layout/page-header"
import { QuickAddTask } from "@/features/tasks/components/quick-add-task"
import { TaskList } from "@/features/tasks/components/task-list"
import { TaskListSkeleton } from "@/features/tasks/components/task-list-skeleton"
import { TaskViewsNav } from "@/features/tasks/components/task-views-nav"
import { getTasks } from "@/features/tasks/queries"
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
