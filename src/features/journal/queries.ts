import "server-only"

import { cache } from "react"

import { getUserToday } from "@/features/tasks/queries"
import { getCurrentUser } from "@/lib/auth/session"
import type { LocalDate } from "@/lib/dates/local-date"
import { createClient } from "@/lib/supabase/server"

import { containsFilter, type JournalEntry } from "./logic"

/** Entries shown per page of the journal; "Show older" adds another page. */
export const PAGE_SIZE = 30

const COLUMNS = "id, local_date, title, body, created_at, updated_at"

function failed(): never {
  throw new Error("We couldn't load your journal.")
}

/** Newest entries first, optionally only those containing `query`. */
export async function getEntries({
  query,
  limit,
}: {
  query: string | null
  limit: number
}): Promise<{ entries: JournalEntry[]; hasMore: boolean }> {
  const user = await getCurrentUser()
  const supabase = await createClient()
  let request = supabase
    .from("journal_entries")
    .select(COLUMNS)
    .eq("user_id", user.id)
    .order("local_date", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(limit + 1)
  if (query) request = request.or(containsFilter(["title", "body"], query))
  const { data, error } = await request
  if (error) failed()
  return {
    entries: data.slice(0, limit) as JournalEntry[],
    hasMore: data.length > limit,
  }
}

/** One entry, or null. */
export async function getEntry(id: string): Promise<JournalEntry | null> {
  const user = await getCurrentUser()
  const supabase = await createClient()
  const { data, error } = await supabase
    .from("journal_entries")
    .select(COLUMNS)
    .eq("user_id", user.id)
    .eq("id", id)
    .maybeSingle()
  if (error) failed()
  return data as JournalEntry | null
}

/** A day's entries, oldest first (for Today and History). */
export const getEntriesOn = cache(
  async (date: LocalDate): Promise<JournalEntry[]> => {
    const user = await getCurrentUser()
    const supabase = await createClient()
    const { data, error } = await supabase
      .from("journal_entries")
      .select(COLUMNS)
      .eq("user_id", user.id)
      .eq("local_date", date)
      .order("created_at")
    if (error) failed()
    return data as JournalEntry[]
  },
)

/** Today's entries in the user's timezone. */
export async function getTodayEntries() {
  const { today } = await getUserToday()
  return { today, entries: await getEntriesOn(today) }
}
