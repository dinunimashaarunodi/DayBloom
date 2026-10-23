"use server"

import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"

import { getProfile } from "@/features/profile/queries"
import {
  type ActionState,
  formValues,
  validationError,
} from "@/lib/action-state"
import { getCurrentUser } from "@/lib/auth/session"
import { localDateSchema } from "@/lib/dates/local-date"
import { createClient } from "@/lib/supabase/server"

import { eventInputToRow, moveEvent } from "./logic"
import { getEvent } from "./queries"
import { eventFormSchema, eventIdSchema } from "./schema"

const SAVE_ERROR = "We couldn't save that. Please try again."
const FIELDS = [
  "title",
  "notes",
  "allDay",
  "date",
  "endDate",
  "startTime",
  "endTime",
]
const DST_GAP_ERROR =
  "Those times don't exist that day because the clocks change. Please pick other times."

function revalidateCalendar() {
  revalidatePath("/calendar", "layout")
  revalidatePath("/today")
}

/** Validates the form and converts it to columns in the user's timezone. */
async function parseEventForm(formData: FormData) {
  const values = formValues(formData, FIELDS)
  const parsed = eventFormSchema.safeParse(values)
  if (!parsed.success) {
    return { ok: false as const, state: validationError(parsed.error, values) }
  }

  const { timezone } = await getProfile()
  const row = eventInputToRow(parsed.data, timezone)
  if (!row) {
    const state: ActionState = {
      status: "error",
      message: DST_GAP_ERROR,
      fieldErrors: { endTime: [DST_GAP_ERROR] },
      values,
    }
    return { ok: false as const, state }
  }
  const day = parsed.data.allDay ? parsed.data.startDate : parsed.data.date
  return { ok: true as const, row, day, values }
}

export async function createEvent(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  await getCurrentUser()
  const result = await parseEventForm(formData)
  if (!result.ok) return result.state

  const supabase = await createClient()
  const { error } = await supabase.from("events").insert(result.row)
  if (error)
    return { status: "error", message: SAVE_ERROR, values: result.values }

  revalidateCalendar()
  redirect(`/calendar?view=week&date=${result.day}`)
}

export async function updateEvent(
  id: string,
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  await getCurrentUser()
  if (!eventIdSchema.safeParse(id).success) {
    return { status: "error", message: SAVE_ERROR }
  }
  const result = await parseEventForm(formData)
  if (!result.ok) return result.state

  const supabase = await createClient()
  const { data, error } = await supabase
    .from("events")
    .update(result.row)
    .eq("id", id)
    .select("id")
  if (error || data.length === 0) {
    return { status: "error", message: SAVE_ERROR, values: result.values }
  }

  revalidateCalendar()
  return { status: "success", message: "Saved.", values: result.values }
}

/** Soft delete: hidden everywhere, kept for history. */
export async function deleteEvent(id: string): Promise<void> {
  await getCurrentUser()
  if (!eventIdSchema.safeParse(id).success) return
  const supabase = await createClient()
  await supabase
    .from("events")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", id)
  revalidateCalendar()
  redirect("/calendar")
}

/**
 * Drag and drop: moves an event from one day to another, keeping its local
 * times (or shifting an all-day event's days).
 */
export async function moveEventToDay(
  id: string,
  from: string,
  to: string,
): Promise<{ error?: string; title?: string }> {
  await getCurrentUser()
  const days = localDateSchema.array().length(2).safeParse([from, to])
  if (!eventIdSchema.safeParse(id).success || !days.success) {
    return { error: SAVE_ERROR }
  }
  const event = await getEvent(id)
  if (!event) return { error: SAVE_ERROR }
  const { timezone } = await getProfile()
  const moved = moveEvent(event, days.data[0]!, days.data[1]!, timezone)
  if (!moved) {
    return days.data[0] === days.data[1]
      ? { title: event.title }
      : { error: DST_GAP_ERROR }
  }

  const supabase = await createClient()
  const { error } = await supabase.from("events").update(moved).eq("id", id)
  if (error) return { error: SAVE_ERROR }

  revalidateCalendar()
  return { title: event.title }
}
