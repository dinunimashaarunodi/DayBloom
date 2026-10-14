import "server-only"

import { cache } from "react"

import { getCurrentUser } from "@/lib/auth/session"
import type { LocalDate } from "@/lib/dates/local-date"
import { createClient } from "@/lib/supabase/server"

import { DAY_COLUMNS, type Day } from "./logic"

const HISTORY_PAGE_SIZE = 30

function failed(): never {
  throw new Error("We couldn't load your days.")
}

/**
 * Closes any past days that are still open (lazy, idempotent). Run before
 * reading days. Failure isn't fatal: the hourly job closes them anyway.
 */
export const ensurePastDaysClosed = cache(async (): Promise<void> => {
  await getCurrentUser()
  const supabase = await createClient()
  const { error } = await supabase.rpc("close_past_days")
  if (error) console.error("close_past_days failed", error.message)
})

/** The user's record for one day, or null if nothing was recorded. */
export async function getDay(date: LocalDate): Promise<Day | null> {
  const user = await getCurrentUser()
  const supabase = await createClient()
  const { data, error } = await supabase
    .from("days")
    .select(DAY_COLUMNS)
    .eq("user_id", user.id)
    .eq("local_date", date)
    .maybeSingle()
  if (error) failed()
  return data as Day | null
}

/** Closed days, newest first, before `before` (exclusive) when given. */
export async function getHistory(
  before?: LocalDate,
): Promise<{ days: Day[]; nextBefore: LocalDate | null }> {
  const user = await getCurrentUser()
  const supabase = await createClient()
  let query = supabase
    .from("days")
    .select(DAY_COLUMNS)
    .eq("user_id", user.id)
    .eq("status", "closed")
    .order("local_date", { ascending: false })
    .limit(HISTORY_PAGE_SIZE + 1)
  if (before) query = query.lt("local_date", before)

  const { data, error } = await query
  if (error) failed()
  const rows = data as Day[]
  const days = rows.slice(0, HISTORY_PAGE_SIZE)
  return {
    days,
    nextBefore:
      rows.length > HISTORY_PAGE_SIZE ? days[days.length - 1].local_date : null,
  }
}
