import "server-only"

import { cache } from "react"

import { getUserToday } from "@/features/tasks/queries"
import { getCurrentUser } from "@/lib/auth/session"
import { addDays, startOfLocalDay } from "@/lib/dates/local-date"
import { createClient } from "@/lib/supabase/server"

import { isActive, type FocusSession } from "./logic"

/** Days of history the focus page and Today card look at. */
export const RECENT_DAYS = 7

/**
 * Sessions started in the last RECENT_DAYS local days (newest first), the
 * active one if any, and the moment ("now") the numbers are computed for.
 */
export const getFocusOverview = cache(async () => {
  const user = await getCurrentUser()
  const { today, timezone } = await getUserToday()
  const supabase = await createClient()
  const since = startOfLocalDay(addDays(today, -(RECENT_DAYS - 1)), timezone)

  const { data, error } = await supabase
    .from("focus_sessions")
    .select("id, label, planned_minutes, started_at, ended_at")
    .eq("user_id", user.id)
    .gte("started_at", since.toISOString())
    .order("started_at", { ascending: false })
  if (error) throw new Error("We couldn't load your focus sessions.")

  const now = new Date()
  const sessions = data as FocusSession[]
  return {
    today,
    timezone,
    now,
    sessions,
    active: sessions.find((s) => isActive(s, now)) ?? null,
  }
})
