import "server-only"

import { cache } from "react"

import { getUserToday } from "@/features/tasks/queries"
import { getCurrentUser } from "@/lib/auth/session"
import { addDays } from "@/lib/dates/local-date"
import { createClient } from "@/lib/supabase/server"

import type { Language, Level, Practice, Word } from "./logic"

/** How far back practice is loaded (streaks and weekly totals look within this). */
const HISTORY_DAYS = 366
/** Recent practice entries listed on a language's page. */
export const RECENT_PRACTICE = 20

type LanguageRow = {
  id: string
  name: string
  level: string | null
  archived_at: string | null
}

function toLanguage(row: LanguageRow): Language {
  return {
    id: row.id,
    name: row.name,
    level: row.level as Level | null,
    archived: row.archived_at !== null,
  }
}

function failed(): never {
  throw new Error("We couldn't load your languages.")
}

/**
 * All languages with word counts, plus every practice entry of the last year
 * (all languages), for the overview, streak and Today card.
 */
export const getLanguagesOverview = cache(async () => {
  const user = await getCurrentUser()
  const { today } = await getUserToday()
  const supabase = await createClient()

  const [languages, practice, words] = await Promise.all([
    supabase
      .from("languages")
      .select("id, name, level, archived_at")
      .eq("user_id", user.id)
      .order("created_at"),
    supabase
      .from("language_practice")
      .select("id, language_id, local_date, minutes, activity, notes")
      .eq("user_id", user.id)
      .gte("local_date", addDays(today, -HISTORY_DAYS))
      .order("local_date", { ascending: false })
      .order("created_at", { ascending: false }),
    supabase
      .from("language_words")
      .select("language_id, learned")
      .eq("user_id", user.id),
  ])
  if (languages.error || practice.error || words.error) failed()

  const counts = new Map<string, { words: number; learned: number }>()
  for (const w of words.data) {
    const c = counts.get(w.language_id) ?? { words: 0, learned: 0 }
    c.words++
    if (w.learned) c.learned++
    counts.set(w.language_id, c)
  }

  return {
    today,
    languages: (languages.data as LanguageRow[]).map((row) => ({
      ...toLanguage(row),
      ...(counts.get(row.id) ?? { words: 0, learned: 0 }),
    })),
    practice: practice.data as Practice[],
  }
})

/** One language with its words (newest first), or null. */
export async function getLanguage(id: string) {
  const user = await getCurrentUser()
  const supabase = await createClient()
  const [language, words] = await Promise.all([
    supabase
      .from("languages")
      .select("id, name, level, archived_at")
      .eq("user_id", user.id)
      .eq("id", id)
      .maybeSingle(),
    supabase
      .from("language_words")
      .select("id, term, meaning, example, learned")
      .eq("user_id", user.id)
      .eq("language_id", id)
      .order("created_at", { ascending: false }),
  ])
  if (language.error || words.error) failed()
  if (!language.data) return null
  return {
    language: toLanguage(language.data as LanguageRow),
    words: words.data as Word[],
  }
}
