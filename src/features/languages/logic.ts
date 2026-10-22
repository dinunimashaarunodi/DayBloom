import { addDays, startOfWeek, type LocalDate } from "@/lib/dates/local-date"

export const LEVELS = ["A1", "A2", "B1", "B2", "C1", "C2"] as const
export type Level = (typeof LEVELS)[number]

export const ACTIVITIES = [
  { value: "lesson", label: "Lesson" },
  { value: "vocabulary", label: "Vocabulary" },
  { value: "reading", label: "Reading" },
  { value: "listening", label: "Listening" },
  { value: "speaking", label: "Speaking" },
  { value: "writing", label: "Writing" },
  { value: "other", label: "Other" },
] as const
export type Activity = (typeof ACTIVITIES)[number]["value"]

export type Language = {
  id: string
  name: string
  level: Level | null
  archived: boolean
}

export type Practice = {
  id: string
  language_id: string
  local_date: LocalDate
  minutes: number
  activity: Activity
  notes: string | null
}

export type Word = {
  id: string
  term: string
  meaning: string
  example: string | null
  learned: boolean
}

export function activityLabel(activity: Activity): string {
  return ACTIVITIES.find((a) => a.value === activity)?.label ?? "Practice"
}

type Logged = Pick<Practice, "local_date" | "minutes">

/** Minutes practised from Monday of this week to today. */
export function weekMinutes(practice: Logged[], today: LocalDate): number {
  const monday = startOfWeek(today)
  return practice
    .filter((p) => p.local_date >= monday && p.local_date <= today)
    .reduce((sum, p) => sum + p.minutes, 0)
}

/** Minutes practised on one day. */
export function dayMinutes(practice: Logged[], date: LocalDate): number {
  return practice
    .filter((p) => p.local_date === date)
    .reduce((sum, p) => sum + p.minutes, 0)
}

/**
 * Days in a row with any practice, up to today. Today without practice
 * doesn't break the streak yet; the day isn't over.
 */
export function dayStreak(dates: LocalDate[], today: LocalDate): number {
  const days = new Set(dates)
  let day = days.has(today) ? today : addDays(today, -1)
  let streak = 0
  while (days.has(day)) {
    streak++
    day = addDays(day, -1)
  }
  return streak
}

/**
 * The review deck: words still being learned, shuffled with `random` (a
 * function returning [0, 1), so tests can pass a fixed one).
 */
export function reviewDeck<T extends Pick<Word, "learned">>(
  words: T[],
  random: () => number = Math.random,
): T[] {
  const deck = words.filter((w) => !w.learned)
  for (let i = deck.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1))
    ;[deck[i], deck[j]] = [deck[j]!, deck[i]!]
  }
  return deck
}
