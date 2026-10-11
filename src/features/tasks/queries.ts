import "server-only"

import { cache } from "react"

import { getProfile } from "@/features/profile/queries"
import { getCurrentUser } from "@/lib/auth/session"
import { localDayRange, todayIn, type LocalDate } from "@/lib/dates/local-date"
import { createClient } from "@/lib/supabase/server"

import { TASK_COLUMNS, type Task } from "./logic"
import type { TaskView } from "./schema"

/** The signed-in user's calendar day, in their profile timezone. */
export const getUserToday = cache(async () => {
  const profile = await getProfile()
  // Safe at request time: createClient() already called connection().
  return {
    today: todayIn(profile.timezone, new Date()),
    timezone: profile.timezone,
  }
})

function failed(): never {
  throw new Error("We couldn't load your tasks.")
}

// Supabase types `date` columns as string; they are always "YYYY-MM-DD".
const asTasks = (rows: unknown) => rows as Task[]

export async function getTodayTasks(): Promise<{
  today: LocalDate
  overdue: Task[]
  planned: Task[]
  done: Task[]
}> {
  const user = await getCurrentUser()
  const { today, timezone } = await getUserToday()
  const { start, end } = localDayRange(today, timezone)
  const supabase = await createClient()

  const [open, done] = await Promise.all([
    supabase
      .from("tasks")
      .select(TASK_COLUMNS)
      .eq("user_id", user.id)
      .eq("status", "todo")
      .is("deleted_at", null)
      .lte("due_date", today)
      .order("due_date")
      .order("position")
      .order("created_at"),
    supabase
      .from("tasks")
      .select(TASK_COLUMNS)
      .eq("user_id", user.id)
      .eq("status", "done")
      .is("deleted_at", null)
      .gte("completed_at", start.toISOString())
      .lt("completed_at", end.toISOString())
      .order("completed_at"),
  ])
  if (open.error || done.error) failed()

  const openTasks = asTasks(open.data)
  return {
    today,
    overdue: openTasks.filter((t) => t.due_date! < today),
    planned: openTasks.filter((t) => t.due_date === today),
    done: asTasks(done.data),
  }
}

export async function getTasks(
  view: TaskView,
): Promise<{ today: LocalDate; tasks: Task[] }> {
  const user = await getCurrentUser()
  const { today } = await getUserToday()
  const supabase = await createClient()

  const base = supabase
    .from("tasks")
    .select(TASK_COLUMNS)
    .eq("user_id", user.id)
    .is("deleted_at", null)

  const query =
    view === "done"
      ? base
          .eq("status", "done")
          .order("completed_at", { ascending: false })
          .limit(100)
      : view === "someday"
        ? base
            .eq("status", "todo")
            .is("due_date", null)
            .order("position")
            .order("created_at")
        : (view === "today"
            ? base.eq("status", "todo").lte("due_date", today)
            : base.eq("status", "todo").gt("due_date", today)
          )
            .order("due_date")
            .order("position")
            .order("created_at")

  const { data, error } = await query
  if (error) failed()
  return { today, tasks: asTasks(data) }
}

/** One of the user's tasks, or null if it doesn't exist (or isn't theirs). */
export async function getTask(id: string): Promise<Task | null> {
  const user = await getCurrentUser()
  const supabase = await createClient()
  const { data, error } = await supabase
    .from("tasks")
    .select(TASK_COLUMNS)
    .eq("user_id", user.id)
    .eq("id", id)
    .is("deleted_at", null)
    .maybeSingle()
  if (error) failed()
  return data as Task | null
}
