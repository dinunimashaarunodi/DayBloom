import "server-only"

import { getCurrentUser } from "@/lib/auth/session"
import { createClient } from "@/lib/supabase/server"

export type ReminderSettings = {
  morning_enabled: boolean
  morning_time: string
  evening_enabled: boolean
  evening_time: string
}

/** Off at 08:00 and 20:30 until the user saves their own choice. */
const DEFAULTS: ReminderSettings = {
  morning_enabled: false,
  morning_time: "08:00",
  evening_enabled: false,
  evening_time: "20:30",
}

/** The user's reminder settings and how many devices can receive them. */
export async function getReminders(): Promise<{
  settings: ReminderSettings
  devices: number
}> {
  const user = await getCurrentUser()
  const supabase = await createClient()
  const [settings, devices] = await Promise.all([
    supabase
      .from("reminder_settings")
      .select("morning_enabled, morning_time, evening_enabled, evening_time")
      .eq("user_id", user.id)
      .maybeSingle(),
    supabase
      .from("push_subscriptions")
      .select("*", { count: "exact", head: true })
      .eq("user_id", user.id),
  ])
  if (settings.error || devices.error) {
    throw new Error("We couldn't load your reminders.")
  }
  const row = settings.data ?? DEFAULTS
  return {
    // Postgres returns "08:00:00"; the form works in "HH:MM".
    settings: {
      ...row,
      morning_time: row.morning_time.slice(0, 5),
      evening_time: row.evening_time.slice(0, 5),
    },
    devices: devices.count ?? 0,
  }
}
