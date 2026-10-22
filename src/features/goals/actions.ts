"use server"

import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"

import {
  type ActionState,
  formValues,
  validationError,
} from "@/lib/action-state"
import { getCurrentUser } from "@/lib/auth/session"
import { createClient } from "@/lib/supabase/server"

import {
  goalFormSchema,
  goalStatusSchema,
  idSchema,
  milestoneTitleSchema,
} from "./schema"

const SAVE_ERROR = "We couldn't save that. Please try again."
const FIELDS = ["title", "why", "target"]

function revalidateGoals() {
  revalidatePath("/goals", "layout")
  revalidatePath("/today")
}

function readGoalForm(formData: FormData) {
  const values = formValues(formData, FIELDS)
  return { values, parsed: goalFormSchema.safeParse(values) }
}

export async function createGoal(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  await getCurrentUser()
  const { values, parsed } = readGoalForm(formData)
  if (!parsed.success) return validationError(parsed.error, values)

  const supabase = await createClient()
  const { data, error } = await supabase
    .from("goals")
    .insert({
      title: parsed.data.title,
      why: parsed.data.why,
      target_date: parsed.data.target,
    })
    .select("id")
    .single()
  if (error) return { status: "error", message: SAVE_ERROR, values }

  revalidateGoals()
  // Next step: break it into milestones.
  redirect(`/goals/${data.id}`)
}

export async function updateGoal(
  id: string,
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  await getCurrentUser()
  if (!idSchema.safeParse(id).success) {
    return { status: "error", message: SAVE_ERROR }
  }
  const { values, parsed } = readGoalForm(formData)
  if (!parsed.success) return validationError(parsed.error, values)

  const supabase = await createClient()
  const { data, error } = await supabase
    .from("goals")
    .update({
      title: parsed.data.title,
      why: parsed.data.why,
      target_date: parsed.data.target,
    })
    .eq("id", id)
    .select("id")
  if (error || data.length === 0) {
    return { status: "error", message: SAVE_ERROR, values }
  }

  revalidateGoals()
  return { status: "success", message: "Saved.", values }
}

/** Achieve, archive or reactivate a goal (the database stamps achieved_at). */
export async function setGoalStatus(id: string, status: string): Promise<void> {
  await getCurrentUser()
  const parsedStatus = goalStatusSchema.safeParse(status)
  if (!idSchema.safeParse(id).success || !parsedStatus.success) return
  const supabase = await createClient()
  await supabase
    .from("goals")
    .update({ status: parsedStatus.data })
    .eq("id", id)
  revalidateGoals()
  redirect(parsedStatus.data === "archived" ? "/goals" : `/goals/${id}`)
}

export async function addMilestone(
  goalId: string,
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  await getCurrentUser()
  const values = formValues(formData, ["title"])
  if (!idSchema.safeParse(goalId).success) {
    return { status: "error", message: SAVE_ERROR }
  }
  const parsed = milestoneTitleSchema.safeParse(values.title ?? "")
  if (!parsed.success) {
    return {
      status: "error",
      fieldErrors: { title: [parsed.error.issues[0]!.message] },
      values,
    }
  }

  const supabase = await createClient()
  const { error } = await supabase
    .from("goal_milestones")
    .insert({ goal_id: goalId, title: parsed.data })
  if (error) return { status: "error", message: SAVE_ERROR, values }

  revalidateGoals()
  return { status: "success" }
}

export async function setMilestoneDone(
  id: string,
  done: boolean,
): Promise<{ error?: string }> {
  await getCurrentUser()
  if (!idSchema.safeParse(id).success) return { error: SAVE_ERROR }
  const supabase = await createClient()
  const { error } = await supabase
    .from("goal_milestones")
    .update({ done })
    .eq("id", id)
  if (error) return { error: SAVE_ERROR }
  revalidateGoals()
  return {}
}

export async function deleteMilestone(id: string): Promise<{ error?: string }> {
  await getCurrentUser()
  if (!idSchema.safeParse(id).success) return { error: SAVE_ERROR }
  const supabase = await createClient()
  const { error } = await supabase.from("goal_milestones").delete().eq("id", id)
  if (error) return { error: SAVE_ERROR }
  revalidateGoals()
  return {}
}
