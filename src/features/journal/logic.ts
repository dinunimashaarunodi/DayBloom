import { daysBetween, type LocalDate } from "@/lib/dates/local-date"

export type JournalEntry = {
  id: string
  local_date: LocalDate
  title: string | null
  body: string
  created_at: string
  updated_at: string
}

/** Longest title the form and database accept. */
export const TITLE_MAX = 120
/** Longest entry body the form and database accept. */
export const BODY_MAX = 20_000

/** The body as one line, cut at a word boundary. */
export function excerpt(body: string, max = 160): string {
  const flat = body.replace(/\s+/g, " ").trim()
  if (flat.length <= max) return flat
  const cut = flat.slice(0, max)
  const space = cut.lastIndexOf(" ")
  return `${(space > max * 0.6 ? cut.slice(0, space) : cut).trimEnd()}…`
}

/** A heading for an entry: its title, or the start of its first line. */
export function entryHeading(entry: Pick<JournalEntry, "title" | "body">) {
  if (entry.title) return entry.title
  const firstLine = entry.body.trim().split("\n")[0] ?? ""
  return excerpt(firstLine, 60)
}

export function wordCount(body: string): number {
  const words = body.trim().match(/\S+/g)
  return words ? words.length : 0
}

/** Entries grouped by day, keeping their order (newest first from the query). */
export function groupByDate<T extends Pick<JournalEntry, "local_date">>(
  entries: T[],
): { date: LocalDate; entries: T[] }[] {
  const groups: { date: LocalDate; entries: T[] }[] = []
  for (const entry of entries) {
    const last = groups.at(-1)
    if (last?.date === entry.local_date) last.entries.push(entry)
    else groups.push({ date: entry.local_date, entries: [entry] })
  }
  return groups
}

const PROMPTS = [
  "What made you smile today?",
  "What's on your mind right now?",
  "What are you grateful for today?",
  "What did you learn today?",
  "What would make tomorrow a good day?",
  "Who did you enjoy spending time with?",
  "What felt hard, and how did you handle it?",
  "What's something small you noticed today?",
] as const

/** A gentle writing prompt that changes each day (the same all day). */
export function writingPrompt(date: LocalDate): string {
  const n = daysBetween("2026-01-01" as LocalDate, date)
  return PROMPTS[((n % PROMPTS.length) + PROMPTS.length) % PROMPTS.length]!
}

/**
 * A PostgREST `or` filter matching `query` anywhere in the given columns,
 * case-insensitively. LIKE wildcards in the query match literally, and the
 * value is quoted so commas or parentheses can't change the filter.
 */
export function containsFilter(columns: string[], query: string): string {
  const like = `%${query.replace(/[\\%_]/g, (c) => `\\${c}`)}%`
  const quoted = `"${like.replace(/[\\"]/g, (c) => `\\${c}`)}"`
  return columns.map((column) => `${column}.ilike.${quoted}`).join(",")
}
