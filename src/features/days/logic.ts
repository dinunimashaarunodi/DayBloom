// Pure rules for days, reviews and snapshots (no React, Next.js or Supabase).
import { daysBetween, type LocalDate } from "@/lib/dates/local-date"

export type SummaryTaskStatus = "done" | "unfinished" | "dropped"

/** The frozen snapshot written by private.day_summary() when a day closes. */
export type DaySummary = {
  version: 1
  timezone: string
  /** Tasks that were due that day, with their status at the end of the day. */
  planned: { id: string; title: string; status: SummaryTaskStatus }[]
  /** Every task finished that day (whatever its due date). */
  completed: { id: string; title: string; due_date: LocalDate | null }[]
  events: {
    id: string
    title: string
    all_day: boolean
    starts_at: string | null
    ends_at: string | null
    start_date: LocalDate | null
    end_date: LocalDate | null
  }[]
}

export type Day = {
  local_date: LocalDate
  status: "open" | "closed"
  summary: DaySummary | null
  mood: number | null
  energy: number | null
  wins: string | null
  reflection: string | null
  reviewed_at: string | null
}

export const DAY_COLUMNS =
  "local_date, status, summary, mood, energy, wins, reflection, reviewed_at" as const

/** Reviews can be written or edited for today and the 7 days before it. */
export const REVIEW_WINDOW_DAYS = 7

export function canEditReview(date: LocalDate, today: LocalDate): boolean {
  const age = daysBetween(date, today)
  return age >= 0 && age <= REVIEW_WINDOW_DAYS
}

export const MOODS = [
  { value: 1, emoji: "😞", label: "Rough" },
  { value: 2, emoji: "🙁", label: "Low" },
  { value: 3, emoji: "😐", label: "Okay" },
  { value: 4, emoji: "🙂", label: "Good" },
  { value: 5, emoji: "😄", label: "Great" },
] as const

export const ENERGY_LEVELS = [
  { value: 1, label: "Drained" },
  { value: 2, label: "Low" },
  { value: 3, label: "Steady" },
  { value: 4, label: "Good" },
  { value: 5, label: "Full" },
] as const

export function moodFor(value: number | null) {
  return MOODS.find((m) => m.value === value) ?? null
}

export function energyFor(value: number | null) {
  return ENERGY_LEVELS.find((e) => e.value === value) ?? null
}

export function summaryCounts(summary: DaySummary) {
  const count = (status: SummaryTaskStatus) =>
    summary.planned.filter((t) => t.status === status).length
  return {
    planned: summary.planned.length,
    plannedDone: count("done"),
    unfinished: count("unfinished"),
    dropped: count("dropped"),
    completed: summary.completed.length,
    events: summary.events.length,
  }
}

/** One friendly line for the history list, e.g. "3 of 4 planned done · 5 finished in total". */
export function summaryLine(summary: DaySummary): string {
  const c = summaryCounts(summary)
  const parts: string[] = []
  if (c.planned > 0) parts.push(`${c.plannedDone} of ${c.planned} planned done`)
  if (c.completed > c.plannedDone)
    parts.push(`${c.completed} finished in total`)
  if (c.events > 0) parts.push(`${c.events} event${c.events === 1 ? "" : "s"}`)
  return parts.length > 0 ? parts.join(" · ") : "A quiet day"
}
