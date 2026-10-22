import { addDays, startOfWeek, type LocalDate } from "@/lib/dates/local-date"

export const KINDS = [
  { value: "strength", label: "Strength" },
  { value: "cardio", label: "Cardio" },
  { value: "walk", label: "Walk" },
  { value: "yoga", label: "Yoga & mobility" },
  { value: "sport", label: "Sport" },
  { value: "other", label: "Other" },
] as const

export type WorkoutKind = (typeof KINDS)[number]["value"]

export const EFFORTS = [
  { value: 1, label: "Easy" },
  { value: 2, label: "Moderate" },
  { value: 3, label: "Hard" },
] as const

export type Workout = {
  id: string
  local_date: LocalDate
  kind: WorkoutKind
  title: string | null
  duration_minutes: number
  effort: number | null
  notes: string | null
}

export function kindLabel(kind: WorkoutKind): string {
  return KINDS.find((k) => k.value === kind)?.label ?? "Workout"
}

export function effortLabel(effort: number | null): string | null {
  return EFFORTS.find((e) => e.value === effort)?.label ?? null
}

/** The title, or the kind ("Strength"). */
export function workoutHeading(workout: Pick<Workout, "title" | "kind">) {
  return workout.title ?? kindLabel(workout.kind)
}

type Logged = Pick<Workout, "local_date" | "duration_minutes">

/** This week (Monday first): workouts, minutes and which days were active. */
export function weekSummary(workouts: Logged[], today: LocalDate) {
  const monday = startOfWeek(today)
  const sunday = addDays(monday, 6)
  const thisWeek = workouts.filter(
    (w) => w.local_date >= monday && w.local_date <= sunday,
  )
  const active = new Set(thisWeek.map((w) => w.local_date))
  return {
    count: thisWeek.length,
    minutes: thisWeek.reduce((sum, w) => sum + w.duration_minutes, 0),
    days: Array.from({ length: 7 }, (_, i) => {
      const date = addDays(monday, i)
      return { date, active: active.has(date), future: date > today }
    }),
  }
}

/**
 * Weeks in a row (Monday first) with at least one workout, up to this week.
 * An empty current week doesn't break the streak yet; it isn't over.
 */
export function weekStreak(dates: LocalDate[], today: LocalDate): number {
  const weeks = new Set(dates.map((d) => startOfWeek(d)))
  let week = startOfWeek(today)
  if (!weeks.has(week)) week = addDays(week, -7)
  let streak = 0
  while (weeks.has(week)) {
    streak++
    week = addDays(week, -7)
  }
  return streak
}
