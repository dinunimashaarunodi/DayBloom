import "server-only"

import { cache } from "react"

import { getProfile } from "@/features/profile/queries"
import { getCurrentUser } from "@/lib/auth/session"
import {
  addDays,
  todayIn,
  toLocalDate,
  type LocalDate,
} from "@/lib/dates/local-date"
import { createClient } from "@/lib/supabase/server"

import type { Habit } from "./logic"

/** How far back check-ins are loaded (streaks and stats look within this). */
export const HISTORY_DAYS = 366

function failed(): never {
  throw new Error("We couldn't load your habits.")
}

type HabitRow = {
  id: string
  name: string
  days_mask: number
  created_at: string
  archived_at: string | null
}

export type HabitWithHistory = Habit & {
  archived: boolean
  /** Local days with a check-in, within HISTORY_DAYS. */
  done: LocalDate[]
}

async function loadHabits(filter: {
  id?: string
  activeOnly: boolean
}): Promise<{ today: LocalDate; habits: HabitWithHistory[] }> {
  const user = await getCurrentUser()
  const { timezone } = await getProfile()
  const supabase = await createClient()
  const today = todayIn(timezone, new Date())

  let query = supabase
    .from("habits")
    .select("id, name, days_mask, created_at, archived_at")
    .eq("user_id", user.id)
    .order("position")
    .order("created_at")
  if (filter.id) query = query.eq("id", filter.id)
  if (filter.activeOnly) query = query.is("archived_at", null)
  const { data: rows, error } = await query
  if (error) failed()

  const ids = (rows as HabitRow[]).map((h) => h.id)
  const logs = new Map<string, LocalDate[]>()
  if (ids.length > 0) {
    const { data, error: logError } = await supabase
      .from("habit_logs")
      .select("habit_id, local_date")
      .eq("user_id", user.id)
      .in("habit_id", ids)
      .gte("local_date", addDays(today, -HISTORY_DAYS))
    if (logError) failed()
    for (const log of data) {
      logs.set(log.habit_id, [
        ...(logs.get(log.habit_id) ?? []),
        log.local_date as LocalDate,
      ])
    }
  }

  return {
    today,
    habits: (rows as HabitRow[]).map((h) => ({
      id: h.id,
      name: h.name,
      days_mask: h.days_mask,
      started_on: toLocalDate(new Date(h.created_at), timezone),
      archived: h.archived_at !== null,
      done: logs.get(h.id) ?? [],
    })),
  }
}

/** Active habits with their recent check-ins. */
export const getHabits = cache(() => loadHabits({ activeOnly: true }))

/** One habit (archived included), or null. */
export async function getHabit(id: string) {
  const { today, habits } = await loadHabits({ id, activeOnly: false })
  return { today, habit: habits[0] ?? null }
}
