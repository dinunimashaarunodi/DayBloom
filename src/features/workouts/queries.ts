import "server-only"

import { cache } from "react"

import { getUserToday } from "@/features/tasks/queries"
import { getCurrentUser } from "@/lib/auth/session"
import { addDays, startOfWeek, type LocalDate } from "@/lib/dates/local-date"
import { createClient } from "@/lib/supabase/server"

import type { Workout } from "./logic"

/** Workouts shown per page of the log; "Show older" adds another page. */
export const PAGE_SIZE = 30
/** How far back the week streak looks. */
const STREAK_WEEKS = 52

const COLUMNS = "id, local_date, kind, title, duration_minutes, effort, notes"

function failed(): never {
  throw new Error("We couldn't load your workouts.")
}

/** Newest workouts first. */
export async function getWorkouts(limit: number) {
  const user = await getCurrentUser()
  const supabase = await createClient()
  const { data, error } = await supabase
    .from("workouts")
    .select(COLUMNS)
    .eq("user_id", user.id)
    .order("local_date", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(limit + 1)
  if (error) failed()
  return {
    workouts: data.slice(0, limit) as Workout[],
    hasMore: data.length > limit,
  }
}

export async function getWorkout(id: string): Promise<Workout | null> {
  const user = await getCurrentUser()
  const supabase = await createClient()
  const { data, error } = await supabase
    .from("workouts")
    .select(COLUMNS)
    .eq("user_id", user.id)
    .eq("id", id)
    .maybeSingle()
  if (error) failed()
  return data as Workout | null
}

/** Days and minutes of the last year's workouts, for weekly stats and streaks. */
export const getWorkoutDays = cache(async () => {
  const user = await getCurrentUser()
  const { today } = await getUserToday()
  const supabase = await createClient()
  const since = addDays(startOfWeek(today), -7 * STREAK_WEEKS)
  const { data, error } = await supabase
    .from("workouts")
    .select("local_date, duration_minutes")
    .eq("user_id", user.id)
    .gte("local_date", since)
  if (error) failed()
  return {
    today,
    logged: data as { local_date: LocalDate; duration_minutes: number }[],
  }
})
