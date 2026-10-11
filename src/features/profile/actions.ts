"use server"

import { revalidatePath } from "next/cache"

import { type ActionState, formValues, validationError } from "@/lib/action-state"
import { getCurrentUser } from "@/lib/auth/session"
import { createClient } from "@/lib/supabase/server"

import { profileSchema } from "./schema"

export async function updateProfile(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const user = await getCurrentUser()
  const values = formValues(formData, ["displayName", "timezone"])
  const parsed = profileSchema.safeParse(values)
  if (!parsed.success) return validationError(parsed.error, values)

  const supabase = await createClient()
  const { error } = await supabase
    .from("profiles")
    .update({ display_name: parsed.data.displayName, timezone: parsed.data.timezone })
    .eq("user_id", user.id)

  if (error) {
    return { status: "error", message: "We couldn't save your changes. Please try again.", values }
  }

  revalidatePath("/", "layout")
  return { status: "success", message: "Saved.", values }
}
