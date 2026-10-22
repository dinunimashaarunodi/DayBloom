"use server"

import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"

import { getUserToday } from "@/features/tasks/queries"
import {
  type ActionState,
  formValues,
  validationError,
} from "@/lib/action-state"
import { getCurrentUser } from "@/lib/auth/session"
import { createClient } from "@/lib/supabase/server"

import { workoutFormSchema, workoutIdSchema } from "./schema"

const SAVE_ERROR = "We couldn't save that. Please try again."
const FIELDS = ["date", "kind", "title", "duration", "effort", "notes"]

function revalidateWorkouts() {
  revalidatePath("/workouts", "layout")
  revalidatePath("/today")
}

/** Validates the form, including "not in the future" (also enforced by RLS). */
async function readWorkoutForm(formData: FormData) {
  const values = formValues(formData, FIELDS)
  const parsed = workoutFormSchema.safeParse({ effort: "", ...values })
  if (!parsed.success) {
    return { values, error: validationError(parsed.error, values) }
  }
  const { today } = await getUserToday()
  if (parsed.data.date > today) {
    const error: ActionState = {
      status: "error",
      message: "Please fix the highlighted fields.",
      fieldErrors: { date: ["Pick today or an earlier day."] },
      values,
    }
    return { values, error }
  }
  const { date, kind, title, duration, effort, notes } = parsed.data
  return {
    values,
    row: {
      local_date: date,
      kind,
      title,
      duration_minutes: duration,
      effort,
      notes,
    },
  }
}

export async function createWorkout(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  await getCurrentUser()
  const { values, row, error } = await readWorkoutForm(formData)
  if (!row) return error

  const supabase = await createClient()
  const { error: insertError } = await supabase.from("workouts").insert(row)
  if (insertError) return { status: "error", message: SAVE_ERROR, values }

  revalidateWorkouts()
  return { status: "success", message: "Workout logged. Nice work!" }
}

export async function updateWorkout(
  id: string,
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  await getCurrentUser()
  if (!workoutIdSchema.safeParse(id).success) {
    return { status: "error", message: SAVE_ERROR }
  }
  const { values, row, error } = await readWorkoutForm(formData)
  if (!row) return error

  const supabase = await createClient()
  const { data, error: updateError } = await supabase
    .from("workouts")
    .update(row)
    .eq("id", id)
    .select("id")
  if (updateError || data.length === 0) {
    return { status: "error", message: SAVE_ERROR, values }
  }

  revalidateWorkouts()
  redirect("/workouts")
}

/** Removes a workout, e.g. one logged by mistake. */
export async function deleteWorkout(id: string): Promise<void> {
  await getCurrentUser()
  if (!workoutIdSchema.safeParse(id).success) return
  const supabase = await createClient()
  await supabase.from("workouts").delete().eq("id", id)
  revalidateWorkouts()
  redirect("/workouts")
}
