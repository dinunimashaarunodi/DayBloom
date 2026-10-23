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

import {
  idSchema,
  languageFormSchema,
  practiceFormSchema,
  wordFormSchema,
} from "./schema"

const SAVE_ERROR = "We couldn't save that. Please try again."
const DUPLICATE: ActionState = {
  status: "error",
  message: "Please fix the highlighted fields.",
  fieldErrors: { name: ["You're already learning this language."] },
}

function revalidateLanguages() {
  revalidatePath("/languages", "layout")
  revalidatePath("/today")
}

export async function createLanguage(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  await getCurrentUser()
  const values = formValues(formData, ["name", "level"])
  const parsed = languageFormSchema.safeParse({ level: "", ...values })
  if (!parsed.success) return validationError(parsed.error, values)

  const supabase = await createClient()
  const { data, error } = await supabase
    .from("languages")
    .insert(parsed.data)
    .select("id")
    .single()
  if (error?.code === "23505") return { ...DUPLICATE, values }
  if (error) return { status: "error", message: SAVE_ERROR, values }

  revalidateLanguages()
  redirect(`/languages/${data.id}`)
}

export async function updateLanguage(
  id: string,
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  await getCurrentUser()
  const values = formValues(formData, ["name", "level"])
  if (!idSchema.safeParse(id).success) {
    return { status: "error", message: SAVE_ERROR }
  }
  const parsed = languageFormSchema.safeParse({ level: "", ...values })
  if (!parsed.success) return validationError(parsed.error, values)

  const supabase = await createClient()
  const { data, error } = await supabase
    .from("languages")
    .update(parsed.data)
    .eq("id", id)
    .select("id")
  if (error?.code === "23505") return { ...DUPLICATE, values }
  if (error || data.length === 0) {
    return { status: "error", message: SAVE_ERROR, values }
  }

  revalidateLanguages()
  return { status: "success", message: "Saved.", values }
}

/** Archive hides a language; its practice and words are kept. */
export async function setLanguageArchived(
  id: string,
  archived: boolean,
): Promise<void> {
  await getCurrentUser()
  if (!idSchema.safeParse(id).success) return
  const supabase = await createClient()
  await supabase
    .from("languages")
    .update({ archived_at: archived ? new Date().toISOString() : null })
    .eq("id", id)
  revalidateLanguages()
  redirect(archived ? "/languages" : `/languages/${id}`)
}

export async function logPractice(
  languageId: string,
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  await getCurrentUser()
  const values = formValues(formData, ["date", "minutes", "activity", "notes"])
  if (!idSchema.safeParse(languageId).success) {
    return { status: "error", message: SAVE_ERROR }
  }
  const parsed = practiceFormSchema.safeParse(values)
  if (!parsed.success) return validationError(parsed.error, values)
  const { today } = await getUserToday()
  if (parsed.data.date > today) {
    return {
      status: "error",
      message: "Please fix the highlighted fields.",
      fieldErrors: { date: ["Pick today or an earlier day."] },
      values,
    }
  }

  const supabase = await createClient()
  const { error } = await supabase.from("language_practice").insert({
    language_id: languageId,
    local_date: parsed.data.date,
    minutes: parsed.data.minutes,
    activity: parsed.data.activity,
    notes: parsed.data.notes,
  })
  if (error) return { status: "error", message: SAVE_ERROR, values }

  revalidateLanguages()
  return { status: "success", message: "Practice logged. Well done!" }
}

export async function deletePractice(id: string): Promise<{ error?: string }> {
  await getCurrentUser()
  if (!idSchema.safeParse(id).success) return { error: SAVE_ERROR }
  const supabase = await createClient()
  const { error } = await supabase
    .from("language_practice")
    .delete()
    .eq("id", id)
  if (error) return { error: SAVE_ERROR }
  revalidateLanguages()
  return {}
}

export async function addWord(
  languageId: string,
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  await getCurrentUser()
  const values = formValues(formData, ["term", "meaning", "example"])
  if (!idSchema.safeParse(languageId).success) {
    return { status: "error", message: SAVE_ERROR }
  }
  const parsed = wordFormSchema.safeParse(values)
  if (!parsed.success) return validationError(parsed.error, values)

  const supabase = await createClient()
  const { error } = await supabase
    .from("language_words")
    .insert({ language_id: languageId, ...parsed.data })
  if (error) return { status: "error", message: SAVE_ERROR, values }

  revalidateLanguages()
  return { status: "success", message: "Word added." }
}

export async function setWordLearned(
  id: string,
  learned: boolean,
): Promise<{ error?: string }> {
  await getCurrentUser()
  if (!idSchema.safeParse(id).success) return { error: SAVE_ERROR }
  const supabase = await createClient()
  const { error } = await supabase
    .from("language_words")
    .update({ learned })
    .eq("id", id)
  if (error) return { error: SAVE_ERROR }
  revalidateLanguages()
  return {}
}

/**
 * Records a flashcard answer. The database schedules the next review (see
 * the word_review_schedule migration) and may mark the word learned.
 */
export async function reviewWord(
  id: string,
  remembered: boolean,
): Promise<{ error?: string; learned?: boolean; dueOn?: string | null }> {
  await getCurrentUser()
  if (!idSchema.safeParse(id).success) return { error: SAVE_ERROR }
  const supabase = await createClient()
  const { data, error } = await supabase
    .rpc("review_word", { word_id: id, remembered })
    .single()
  if (error) return { error: SAVE_ERROR }
  revalidateLanguages()
  return { learned: data.learned, dueOn: data.due_on }
}

export async function deleteWord(id: string): Promise<{ error?: string }> {
  await getCurrentUser()
  if (!idSchema.safeParse(id).success) return { error: SAVE_ERROR }
  const supabase = await createClient()
  const { error } = await supabase.from("language_words").delete().eq("id", id)
  if (error) return { error: SAVE_ERROR }
  revalidateLanguages()
  return {}
}
