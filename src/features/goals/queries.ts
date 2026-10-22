import "server-only"

import { cache } from "react"

import { getUserToday } from "@/features/tasks/queries"
import { getCurrentUser } from "@/lib/auth/session"
import type { LocalDate } from "@/lib/dates/local-date"
import { createClient } from "@/lib/supabase/server"

import type { Goal, GoalStatus } from "./logic"

const COLUMNS =
  "id, title, why, target_date, status, achieved_at, goal_milestones(id, title, done, position)"

type GoalRow = Omit<Goal, "milestones" | "target_date" | "status"> & {
  target_date: string | null
  status: string
  goal_milestones: {
    id: string
    title: string
    done: boolean
    position: number
  }[]
}

function toGoal(row: GoalRow): Goal {
  return {
    id: row.id,
    title: row.title,
    why: row.why,
    target_date: row.target_date as LocalDate | null,
    status: row.status as GoalStatus,
    achieved_at: row.achieved_at,
    milestones: [...row.goal_milestones]
      .sort((a, b) => a.position - b.position)
      .map(({ id, title, done }) => ({ id, title, done })),
  }
}

function failed(): never {
  throw new Error("We couldn't load your goals.")
}

/** All goals with their milestones (newest first), and today. */
export const getGoals = cache(async () => {
  const user = await getCurrentUser()
  const { today } = await getUserToday()
  const supabase = await createClient()
  const { data, error } = await supabase
    .from("goals")
    .select(COLUMNS)
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
  if (error) failed()
  return { today, goals: (data as GoalRow[]).map(toGoal) }
})

/** One goal with its milestones, or null. */
export async function getGoal(id: string) {
  const user = await getCurrentUser()
  const { today } = await getUserToday()
  const supabase = await createClient()
  const { data, error } = await supabase
    .from("goals")
    .select(COLUMNS)
    .eq("user_id", user.id)
    .eq("id", id)
    .maybeSingle()
  if (error) failed()
  return { today, goal: data ? toGoal(data as GoalRow) : null }
}
