"use server"

import { revalidatePath } from "next/cache"

import {
  type ActionState,
  formValues,
  validationError,
} from "@/lib/action-state"
import { getCurrentUser } from "@/lib/auth/session"
import { createClient } from "@/lib/supabase/server"

import { pushSubscriptionSchema, reminderSettingsSchema } from "./schema"

const SAVE_ERROR = "We couldn't save that. Please try again."

export async function saveReminderSettings(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  await getCurrentUser()
  const values = formValues(formData, [
    "morningEnabled",
    "morningTime",
    "eveningEnabled",
    "eveningTime",
  ])
  const parsed = reminderSettingsSchema.safeParse(values)
  if (!parsed.success) return validationError(parsed.error, values)

  const supabase = await createClient()
  const { error } = await supabase
    .from("reminder_settings")
    // user_id isn't sent: the database fills it in (auth.uid()), and users
    // may only write the reminder columns.
    .upsert(parsed.data, { onConflict: "user_id" })
  if (error) return { status: "error", message: SAVE_ERROR, values }

  revalidatePath("/settings")
  return { status: "success", message: "Reminder times saved.", values }
}

/**
 * Saves this device's push subscription. Re-subscribing refreshes it, so the
 * account that turned reminders on last on a shared device gets them.
 */
export async function savePushSubscription(
  subscription: unknown,
): Promise<{ error?: string }> {
  await getCurrentUser()
  const parsed = pushSubscriptionSchema.safeParse(subscription)
  if (!parsed.success) return { error: SAVE_ERROR }
  const { endpoint, keys } = parsed.data

  const supabase = await createClient()
  await supabase.from("push_subscriptions").delete().eq("endpoint", endpoint)
  const { error } = await supabase
    .from("push_subscriptions")
    .insert({ endpoint, p256dh: keys.p256dh, auth: keys.auth })
  if (error) return { error: SAVE_ERROR }

  revalidatePath("/settings")
  return {}
}

/** Stops reminders on this device. */
export async function removePushSubscription(
  endpoint: string,
): Promise<{ error?: string }> {
  await getCurrentUser()
  if (typeof endpoint !== "string" || endpoint.length > 1000) {
    return { error: SAVE_ERROR }
  }
  const supabase = await createClient()
  const { error } = await supabase
    .from("push_subscriptions")
    .delete()
    .eq("endpoint", endpoint)
  if (error) return { error: SAVE_ERROR }
  revalidatePath("/settings")
  return {}
}
