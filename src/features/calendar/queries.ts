import "server-only"

import { getCurrentUser } from "@/lib/auth/session"
import { localDayRange, type LocalDate } from "@/lib/dates/local-date"
import { createClient } from "@/lib/supabase/server"

import { EVENT_COLUMNS, type CalendarEvent } from "./logic"

function failed(): never {
  throw new Error("We couldn't load your calendar.")
}

/** Events overlapping the local days from..to (inclusive) in `tz`. */
export async function getEvents(
  from: LocalDate,
  to: LocalDate,
  tz: string,
): Promise<CalendarEvent[]> {
  const user = await getCurrentUser()
  const supabase = await createClient()
  const rangeStart = localDayRange(from, tz).start.toISOString()
  const rangeEnd = localDayRange(to, tz).end.toISOString()

  const base = () =>
    supabase
      .from("events")
      .select(EVENT_COLUMNS)
      .eq("user_id", user.id)
      .is("deleted_at", null)

  const [timed, allDay] = await Promise.all([
    base()
      .eq("all_day", false)
      .lt("starts_at", rangeEnd)
      .gt("ends_at", rangeStart),
    base().eq("all_day", true).lte("start_date", to).gte("end_date", from),
  ])
  if (timed.error || allDay.error) failed()
  return [...timed.data, ...allDay.data] as CalendarEvent[]
}

/** One of the user's events, or null. */
export async function getEvent(id: string): Promise<CalendarEvent | null> {
  const user = await getCurrentUser()
  const supabase = await createClient()
  const { data, error } = await supabase
    .from("events")
    .select(EVENT_COLUMNS)
    .eq("user_id", user.id)
    .eq("id", id)
    .is("deleted_at", null)
    .maybeSingle()
  if (error) failed()
  return data as CalendarEvent | null
}
