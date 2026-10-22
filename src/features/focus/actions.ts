"use server"

import { revalidatePath } from "next/cache"

import {
  type ActionState,
  formValues,
  validationError,
} from "@/lib/action-state"
import { getCurrentUser } from "@/lib/auth/session"
import { createClient } from "@/lib/supabase/server"

import { sessionIdSchema, startFocusSchema } from "./schema"

const SAVE_ERROR = "We couldn't save that. Please try again."

function revalidateFocus() {
  revalidatePath("/focus")
  revalidatePath("/today")
}

/** Starts a countdown. The database sets the start time and closes any open session. */
export async function startFocus(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  await getCurrentUser()
  const values = formValues(formData, ["label", "minutes"])
  const parsed = startFocusSchema.safeParse(values)
  if (!parsed.success) return validationError(parsed.error, values)

  const supabase = await createClient()
  const { error } = await supabase.from("focus_sessions").insert({
    label: parsed.data.label,
    planned_minutes: parsed.data.minutes,
  })
  if (error) return { status: "error", message: SAVE_ERROR, values }

  revalidateFocus()
  return { status: "success" }
}

/** Ends a session now. The database stamps the time (never later than planned). */
export async function endFocus(id: string): Promise<{ error?: string }> {
  await getCurrentUser()
  if (!sessionIdSchema.safeParse(id).success) return { error: SAVE_ERROR }
  const supabase = await createClient()
  const { error } = await supabase
    .from("focus_sessions")
    .update({ ended_at: new Date().toISOString() })
    .eq("id", id)
  if (error) return { error: SAVE_ERROR }
  revalidateFocus()
  return {}
}

/** Removes a session, e.g. one started by mistake. */
export async function deleteFocusSession(id: string): Promise<void> {
  await getCurrentUser()
  if (!sessionIdSchema.safeParse(id).success) return
  const supabase = await createClient()
  await supabase.from("focus_sessions").delete().eq("id", id)
  revalidateFocus()
}
