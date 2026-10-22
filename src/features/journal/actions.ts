"use server"

import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"

import { getUserToday } from "@/features/tasks/queries"
import {
  type ActionState,
  formValues,
  validationError,
} from "@/lib/action-state"
import { getCurrentUser } from "@/lib/auth/session"
import { createClient } from "@/lib/supabase/server"

import { entryIdSchema, journalEntrySchema } from "./schema"

const SAVE_ERROR = "We couldn't save that. Please try again."
const FIELDS = ["date", "title", "body"]

function revalidateJournal() {
  revalidatePath("/journal", "layout")
  revalidatePath("/today")
  revalidatePath("/history", "layout")
}

/** Validates the form, including "not in the future" (also enforced by RLS). */
async function readEntryForm(formData: FormData) {
  const values = formValues(formData, FIELDS)
  const parsed = journalEntrySchema.safeParse(values)
  if (!parsed.success) {
    return { values, error: validationError(parsed.error, values) }
  }
  const { today } = await getUserToday()
  if (parsed.data.date > today) {
    const error: ActionState = {
      status: "error",
      message: "Please fix the highlighted fields.",
      fieldErrors: { date: ["Pick today or an earlier day."] },
      values,
    }
    return { values, error }
  }
  return { values, data: parsed.data }
}

export async function createEntry(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  await getCurrentUser()
  const { values, data, error } = await readEntryForm(formData)
  if (!data) return error

  const supabase = await createClient()
  const { data: entry, error: insertError } = await supabase
    .from("journal_entries")
    .insert({ local_date: data.date, title: data.title, body: data.body })
    .select("id")
    .single()
  if (insertError) return { status: "error", message: SAVE_ERROR, values }

  revalidateJournal()
  redirect(`/journal/${entry.id}`)
}

export async function updateEntry(
  id: string,
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  await getCurrentUser()
  if (!entryIdSchema.safeParse(id).success) {
    return { status: "error", message: SAVE_ERROR }
  }
  const { values, data, error } = await readEntryForm(formData)
  if (!data) return error

  const supabase = await createClient()
  const { data: rows, error: updateError } = await supabase
    .from("journal_entries")
    .update({ local_date: data.date, title: data.title, body: data.body })
    .eq("id", id)
    .select("id")
  if (updateError || rows.length === 0) {
    return { status: "error", message: SAVE_ERROR, values }
  }

  revalidateJournal()
  redirect(`/journal/${id}`)
}

/** Deleting removes the entry for good (nothing else refers to it). */
export async function deleteEntry(id: string): Promise<void> {
  await getCurrentUser()
  if (!entryIdSchema.safeParse(id).success) return
  const supabase = await createClient()
  await supabase.from("journal_entries").delete().eq("id", id)
  revalidateJournal()
  redirect("/journal")
}
