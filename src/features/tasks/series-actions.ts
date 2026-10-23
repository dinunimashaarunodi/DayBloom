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

import { seriesFormSchema, seriesIdSchema } from "./schema"

const SAVE_ERROR = "We couldn't save that. Please try again."
const FIELDS = [
  "title",
  "notes",
  "priority",
  "kind",
  "monthDay",
  "startsOn",
  "endsOn",
]

function revalidateTaskPages() {
  revalidatePath("/today")
  revalidatePath("/tasks", "layout")
  revalidatePath("/calendar")
}

function readSeriesForm(formData: FormData) {
  const values = formValues(formData, FIELDS)
  const days = formData.getAll("days").filter((d) => typeof d === "string")
  const parsed = seriesFormSchema.safeParse({
    notes: "",
    monthDay: "",
    ...values,
    days,
  })
  // Days go back as a comma list so the form can refill after an error.
  return { values: { ...values, days: days.join(",") }, parsed }
}

/** Creates a repeating task; today's task appears at once if it's due today. */
export async function createSeries(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  await getCurrentUser()
  const { values, parsed } = readSeriesForm(formData)
  if (!parsed.success) return validationError(parsed.error, values)

  const supabase = await createClient()
  const { error } = await supabase.from("task_series").insert(parsed.data)
  if (error) return { status: "error", message: SAVE_ERROR, values }
  await supabase.rpc("ensure_repeating_tasks")

  revalidateTaskPages()
  redirect("/tasks?view=repeating")
}

/** Changes apply to future days; tasks already created stay as they are. */
export async function updateSeries(
  id: string,
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  await getCurrentUser()
  if (!seriesIdSchema.safeParse(id).success) {
    return { status: "error", message: SAVE_ERROR }
  }
  const { values, parsed } = readSeriesForm(formData)
  if (!parsed.success) return validationError(parsed.error, values)

  const supabase = await createClient()
  const { data, error } = await supabase
    .from("task_series")
    .update(parsed.data)
    .eq("id", id)
    .select("id")
  if (error || data.length === 0) {
    return { status: "error", message: SAVE_ERROR, values }
  }
  await supabase.rpc("ensure_repeating_tasks")

  revalidateTaskPages()
  return { status: "success", message: "Saved.", values }
}

/** "Stop repeating" archives the series; restarting brings it back. */
export async function setSeriesStopped(
  id: string,
  stopped: boolean,
): Promise<void> {
  await getCurrentUser()
  if (!seriesIdSchema.safeParse(id).success) return
  const supabase = await createClient()
  await supabase
    .from("task_series")
    .update({ archived_at: stopped ? new Date().toISOString() : null })
    .eq("id", id)
  if (!stopped) await supabase.rpc("ensure_repeating_tasks")
  revalidateTaskPages()
  redirect("/tasks?view=repeating")
}
