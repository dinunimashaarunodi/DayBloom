import {
  addDays,
  daysBetween,
  startOfWeek,
  type LocalDate,
} from "@/lib/dates/local-date"

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
  /** Leitner box: 0 new, 1–5 reviewed (higher = known better). */
  box: number
  /** Next review day; null = due now (new words). */
  due_on: LocalDate | null
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
 * Days until a word comes back after a review leaves it in `box` (1–5).
 * Mirrors public.word_review_interval() (DB-tested).
 */
export function reviewIntervalDays(box: number): number {
  return [1, 1, 3, 7, 14, 30][Math.min(Math.max(box, 1), 5)]!
}

/** Still being learned and due today (or earlier, or never reviewed). */
export function isDue(
  word: Pick<Word, "learned" | "due_on">,
  today: LocalDate,
): boolean {
  return !word.learned && (word.due_on === null || word.due_on <= today)
}

/** "Due now", "Tomorrow", "In 3 days" for a word's next review. */
export function nextReviewLabel(
  word: Pick<Word, "learned" | "due_on">,
  today: LocalDate,
): string | null {
  if (word.learned) return null
  if (isDue(word, today)) return "Due now"
  const days = daysBetween(today, word.due_on!)
  return days === 1 ? "Review tomorrow" : `Review in ${days} days`
}

/** The earliest upcoming review among words not due yet, or null. */
export function nextReviewDay(
  words: Pick<Word, "learned" | "due_on">[],
  today: LocalDate,
): LocalDate | null {
  const upcoming = words
    .filter((w) => !w.learned && w.due_on !== null && w.due_on > today)
    .map((w) => w.due_on!)
    .sort()
  return upcoming[0] ?? null
}

/**
 * The review deck: words due today, shuffled with `random` (a function
 * returning [0, 1), so tests can pass a fixed one).
 */
export function reviewDeck<T extends Pick<Word, "learned" | "due_on">>(
  words: T[],
  today: LocalDate,
  random: () => number = Math.random,
): T[] {
  const deck = words.filter((w) => isDue(w, today))
  for (let i = deck.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1))
    ;[deck[i], deck[j]] = [deck[j]!, deck[i]!]
  }
  return deck
}
