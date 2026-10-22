import { addDays, toLocalDate, type LocalDate } from "@/lib/dates/local-date"

export { formatMinutes } from "@/lib/duration"

export type FocusSession = {
  id: string
  label: string | null
  planned_minutes: number
  started_at: string
  ended_at: string | null
}

/** Durations offered on the start form, in minutes. */
export const DURATIONS = [15, 25, 45, 60, 90] as const
export const DEFAULT_DURATION = 25

/** When the countdown reaches zero. */
export function plannedEnd(session: FocusSession): Date {
  return new Date(
    Date.parse(session.started_at) + session.planned_minutes * 60_000,
  )
}

/** When the session ended: ended early, or its planned end (the DB caps the same way). */
export function sessionEnd(session: FocusSession): Date {
  const planned = plannedEnd(session)
  if (session.ended_at === null) return planned
  const ended = new Date(session.ended_at)
  return ended < planned ? ended : planned
}

/** Still counting down at `now`. */
export function isActive(session: FocusSession, now: Date): boolean {
  return session.ended_at === null && now < plannedEnd(session)
}

/** Seconds focused so far (up to `now` for an active session). */
export function focusedSeconds(session: FocusSession, now: Date): number {
  const end = Math.min(sessionEnd(session).getTime(), now.getTime())
  return Math.max(0, Math.floor((end - Date.parse(session.started_at)) / 1000))
}

/** Seconds left on an active session's countdown (0 when it's over). */
export function remainingSeconds(session: FocusSession, now: Date): number {
  if (session.ended_at !== null) return 0
  return Math.max(
    0,
    Math.ceil((plannedEnd(session).getTime() - now.getTime()) / 1000),
  )
}

/** Ran its full planned length. */
export function isComplete(session: FocusSession): boolean {
  return sessionEnd(session).getTime() >= plannedEnd(session).getTime()
}

/**
 * Focused minutes per local day for the `days` days ending today, oldest
 * first. A session counts on the day it started.
 */
export function dailyMinutes(
  sessions: FocusSession[],
  today: LocalDate,
  timezone: string,
  now: Date,
  days = 7,
): { date: LocalDate; minutes: number }[] {
  const seconds = new Map<string, number>()
  for (const session of sessions) {
    const day = toLocalDate(new Date(session.started_at), timezone)
    seconds.set(day, (seconds.get(day) ?? 0) + focusedSeconds(session, now))
  }
  return Array.from({ length: days }, (_, i) => {
    const date = addDays(today, i - days + 1)
    return { date, minutes: Math.floor((seconds.get(date) ?? 0) / 60) }
  })
}

/** A countdown clock: "4:05", "25:00", "1:30:00". */
export function formatClock(totalSeconds: number): string {
  const s = Math.max(0, Math.floor(totalSeconds))
  const h = Math.floor(s / 3600)
  const m = Math.floor((s % 3600) / 60)
  const sec = String(s % 60).padStart(2, "0")
  return h > 0 ? `${h}:${String(m).padStart(2, "0")}:${sec}` : `${m}:${sec}`
}
