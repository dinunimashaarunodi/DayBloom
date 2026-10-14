"use server"

import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"
import { z } from "zod"

import {
  type ActionState,
  formValues,
  validationError,
} from "@/lib/action-state"
import { getCurrentUser } from "@/lib/auth/session"
import { localDateSchema } from "@/lib/dates/local-date"
import { createClient } from "@/lib/supabase/server"

import { getUserToday } from "./queries"
import {
  TASK_DECISIONS,
  type TaskDecision,
  createTaskSchema,
  taskIdSchema,
  taskIdsSchema,
  updateTaskSchema,
} from "./schema"

const SAVE_ERROR = "We couldn't save that. Please try again."

function revalidateTaskPages() {
  revalidatePath("/today")
  revalidatePath("/tasks", "layout")
}

export async function createTask(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  await getCurrentUser()
  const values = formValues(formData, ["title", "dueDate"])
  const parsed = createTaskSchema.safeParse(values)
  if (!parsed.success) return validationError(parsed.error, values)

  const supabase = await createClient()
  const { error } = await supabase
    .from("tasks")
    .insert({ title: parsed.data.title, due_date: parsed.data.dueDate })
  if (error) return { status: "error", message: SAVE_ERROR, values }

  revalidateTaskPages()
  // Clear the title for the next task but keep the chosen date.
  return {
    status: "success",
    values: { title: "", dueDate: values.dueDate ?? "" },
  }
}

/** For buttons/checkboxes called from Client Components. */
export type MutationResult = { error?: string }

export async function setTaskDone(
  id: string,
  done: boolean,
): Promise<MutationResult> {
  await getCurrentUser()
  const parsed = z
    .object({ id: taskIdSchema, done: z.boolean() })
    .safeParse({ id, done })
  if (!parsed.success) return { error: SAVE_ERROR }

  const supabase = await createClient()
  const { error } = await supabase
    .from("tasks")
    .update({ status: parsed.data.done ? "done" : "todo" })
    .eq("id", parsed.data.id)
  if (error) return { error: SAVE_ERROR }

  revalidateTaskPages()
  return {}
}

export async function reorderTasks(ids: string[]): Promise<MutationResult> {
  await getCurrentUser()
  const parsed = taskIdsSchema.safeParse(ids)
  if (!parsed.success) return { error: SAVE_ERROR }

  const supabase = await createClient()
  const { error } = await supabase.rpc("reorder_tasks", {
    task_ids: parsed.data,
  })
  if (error) return { error: SAVE_ERROR }

  revalidateTaskPages()
  return {}
}

export async function updateTask(
  id: string,
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  await getCurrentUser()
  const values = formValues(formData, ["title", "notes", "dueDate", "priority"])
  if (!taskIdSchema.safeParse(id).success)
    return { status: "error", message: SAVE_ERROR, values }
  const parsed = updateTaskSchema.safeParse(values)
  if (!parsed.success) return validationError(parsed.error, values)

  const supabase = await createClient()
  const { data, error } = await supabase
    .from("tasks")
    .update({
      title: parsed.data.title,
      notes: parsed.data.notes,
      due_date: parsed.data.dueDate,
      priority: parsed.data.priority,
    })
    .eq("id", id)
    .select("id")
  if (error || data.length === 0)
    return { status: "error", message: SAVE_ERROR, values }

  revalidateTaskPages()
  return { status: "success", message: "Saved.", values }
}

/** "Let it go": the task stays in history as dropped, but leaves your lists. */
export async function letGoTask(id: string): Promise<void> {
  await getCurrentUser()
  if (!taskIdSchema.safeParse(id).success) return
  const supabase = await createClient()
  await supabase.from("tasks").update({ status: "dropped" }).eq("id", id)
  revalidateTaskPages()
  redirect("/today")
}

/** Soft delete: hidden everywhere, kept for history. */
export async function deleteTask(id: string): Promise<void> {
  await getCurrentUser()
  if (!taskIdSchema.safeParse(id).success) return
  const supabase = await createClient()
  await supabase
    .from("tasks")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", id)
  revalidateTaskPages()
  redirect("/tasks")
}

/**
 * The "Needs a decision" choices for an unfinished task from an earlier day.
 * Postponing is counted by the tasks trigger (times_moved).
 */
export async function decideTask(
  id: string,
  decision: TaskDecision,
  date?: string,
): Promise<MutationResult> {
  await getCurrentUser()
  if (
    !taskIdSchema.safeParse(id).success ||
    !TASK_DECISIONS.includes(decision)
  ) {
    return { error: SAVE_ERROR }
  }
  const { today } = await getUserToday()

  let update: { due_date: string } | { status: "dropped" }
  if (decision === "letGo") {
    update = { status: "dropped" }
  } else if (decision === "today") {
    update = { due_date: today }
  } else {
    const parsed = localDateSchema.safeParse(date)
    if (!parsed.success || parsed.data < today) {
      return { error: "Pick today or a later date." }
    }
    update = { due_date: parsed.data }
  }

  const supabase = await createClient()
  const { data, error } = await supabase
    .from("tasks")
    .update(update)
    .eq("id", id)
    .eq("status", "todo")
    .select("id")
  if (error || data.length === 0) return { error: SAVE_ERROR }

  revalidateTaskPages()
  return {}
}
