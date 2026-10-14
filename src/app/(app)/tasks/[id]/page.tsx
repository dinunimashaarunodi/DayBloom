import type { Metadata } from "next"
import { notFound } from "next/navigation"
import { Suspense } from "react"

import { BackLink } from "@/components/layout/back-link"
import { PageHeader } from "@/components/layout/page-header"
import { Separator } from "@/components/ui/separator"
import { Skeleton } from "@/components/ui/skeleton"
import { MovedWarning } from "@/features/tasks/components/moved-warning"
import { TaskActions } from "@/features/tasks/components/task-actions"
import { TaskEditForm } from "@/features/tasks/components/task-edit-form"
import { shouldWarnAboutMoves } from "@/features/tasks/logic"
import { getTask } from "@/features/tasks/queries"
import { taskIdSchema } from "@/features/tasks/schema"

export const metadata: Metadata = { title: "Edit task" }

export default function TaskPage({ params }: PageProps<"/tasks/[id]">) {
  return (
    <>
      <BackLink href="/tasks" label="All tasks" />
      <PageHeader title="Edit task" />
      <Suspense fallback={<Skeleton className="h-80" />}>
        <TaskEditor params={params} />
      </Suspense>
    </>
  )
}

async function TaskEditor({
  params,
}: Pick<PageProps<"/tasks/[id]">, "params">) {
  const { id } = await params
  if (!taskIdSchema.safeParse(id).success) notFound()
  const task = await getTask(id)
  if (!task) notFound()

  return (
    <div className="grid gap-6">
      {shouldWarnAboutMoves(task) && (
        <MovedWarning timesMoved={task.times_moved} />
      )}
      <TaskEditForm task={task} />
      <Separator />
      <TaskActions taskId={task.id} canLetGo={task.status === "todo"} />
    </div>
  )
}
