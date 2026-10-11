// Pure task presentation rules (no React, Next.js or Supabase), unit-tested.
import {
  daysBetween,
  formatLocalDate,
  type LocalDate,
} from "@/lib/dates/local-date"

import type { TaskPriority } from "./schema"

export type Task = {
  id: string
  title: string
  notes: string | null
  status: "todo" | "done" | "dropped"
  priority: TaskPriority
  due_date: LocalDate | null
  completed_at: string | null
  times_moved: number
}

/** Columns selected for a Task. Keep in sync with the Task type. */
export const TASK_COLUMNS =
  "id, title, notes, status, priority, due_date, completed_at, times_moved" as const

/** From this many postponements on, gently suggest breaking it down or letting it go. */
export const MOVE_WARNING_THRESHOLD = 2

export function shouldWarnAboutMoves(
  task: Pick<Task, "times_moved" | "status">,
): boolean {
  return task.status === "todo" && task.times_moved >= MOVE_WARNING_THRESHOLD
}

export function moveWarningText(timesMoved: number): string {
  return `Moved ${timesMoved} times. Would a smaller first step help, or is it time to let it go?`
}

/** Short, friendly label for a due date relative to the user's today. */
export function dueLabel(due: LocalDate | null, today: LocalDate): string {
  if (!due) return "No date"
  const days = daysBetween(today, due)
  if (days === 0) return "Today"
  if (days === 1) return "Tomorrow"
  if (days === -1) return "Yesterday"
  if (days < 0) return `${-days} days ago`
  return formatLocalDate(due, "short")
}

export function isOverdue(
  task: Pick<Task, "due_date" | "status">,
  today: LocalDate,
): boolean {
  return (
    task.status === "todo" && task.due_date !== null && task.due_date < today
  )
}
