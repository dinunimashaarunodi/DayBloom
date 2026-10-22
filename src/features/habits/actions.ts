"use server"

import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"

import { type ActionState, validationError } from "@/lib/action-state"
import { getCurrentUser } from "@/lib/auth/session"
import { createClient } from "@/lib/supabase/server"

import { checkInSchema, habitFormSchema, habitIdSchema } from "./schema"

const SAVE_ERROR = "We couldn't save that. Please try again."

function revalidateHabits() {
  revalidatePath("/habits", "layout")
  revalidatePath("/today")
}

function readHabitForm(formData: FormData) {
  const name = formData.get("name")
  const values = {
    name: typeof name === "string" ? name : "",
    days: formData.getAll("days").filter((d) => typeof d === "string"),
  }
  return { values, parsed: habitFormSchema.safeParse(values) }
}

/** Form values for refilling after an error (days as a comma list). */
function echo(values: { name: string; days: string[] }) {
  return { name: values.name, days: values.days.join(",") }
}

export async function createHabit(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  await getCurrentUser()
  const { values, parsed } = readHabitForm(formData)
  if (!parsed.success) return validationError(parsed.error, echo(values))

  const supabase = await createClient()
  const { error } = await supabase
    .from("habits")
    .insert({ name: parsed.data.name, days_mask: parsed.data.days })
  if (error)
    return { status: "error", message: SAVE_ERROR, values: echo(values) }

  revalidateHabits()
  return { status: "success", message: "Habit added." }
}

export async function updateHabit(
  id: string,
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  await getCurrentUser()
  const { values, parsed } = readHabitForm(formData)
  if (!habitIdSchema.safeParse(id).success) {
    return { status: "error", message: SAVE_ERROR }
  }
  if (!parsed.success) return validationError(parsed.error, echo(values))

  const supabase = await createClient()
  const { data, error } = await supabase
    .from("habits")
    .update({ name: parsed.data.name, days_mask: parsed.data.days })
    .eq("id", id)
    .select("id")
  if (error || data.length === 0) {
    return { status: "error", message: SAVE_ERROR, values: echo(values) }
  }

  revalidateHabits()
  return { status: "success", message: "Saved.", values: echo(values) }
}

/** Archive hides the habit from today's list; its history is kept. */
export async function setHabitArchived(
  id: string,
  archived: boolean,
): Promise<void> {
  await getCurrentUser()
  if (!habitIdSchema.safeParse(id).success) return
  const supabase = await createClient()
  await supabase
    .from("habits")
    .update({ archived_at: archived ? new Date().toISOString() : null })
    .eq("id", id)
  revalidateHabits()
  redirect(archived ? "/habits" : `/habits/${id}`)
}

/** Tick or untick a habit for a day (today or the 7 days before it). */
export async function setCheckIn(
  habitId: string,
  date: string,
  done: boolean,
): Promise<{ error?: string }> {
  await getCurrentUser()
  const parsed = checkInSchema.safeParse({ habitId, date, done })
  if (!parsed.success) return { error: SAVE_ERROR }

  const supabase = await createClient()
  const { error } = parsed.data.done
    ? await supabase
        .from("habit_logs")
        .upsert(
          { habit_id: parsed.data.habitId, local_date: parsed.data.date },
          { onConflict: "habit_id,local_date", ignoreDuplicates: true },
        )
    : await supabase
        .from("habit_logs")
        .delete()
        .eq("habit_id", parsed.data.habitId)
        .eq("local_date", parsed.data.date)
  if (error) return { error: SAVE_ERROR }

  revalidateHabits()
  return {}
}
