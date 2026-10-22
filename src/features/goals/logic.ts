import {
  daysBetween,
  formatLocalDate,
  type LocalDate,
} from "@/lib/dates/local-date"

export type GoalStatus = "active" | "achieved" | "archived"

export type Milestone = {
  id: string
  title: string
  done: boolean
}

export type Goal = {
  id: string
  title: string
  why: string | null
  target_date: LocalDate | null
  status: GoalStatus
  achieved_at: string | null
  milestones: Milestone[]
}

/** Milestones done out of the total, and the share as a whole percent. */
export function progress(milestones: Pick<Milestone, "done">[]) {
  const total = milestones.length
  const done = milestones.filter((m) => m.done).length
  return {
    done,
    total,
    percent: total === 0 ? 0 : Math.round((done / total) * 100),
  }
}

/** Every milestone is done (and there is at least one). */
export function readyToAchieve(milestones: Pick<Milestone, "done">[]) {
  return milestones.length > 0 && milestones.every((m) => m.done)
}

/**
 * The target date in friendly words. A passed date is stated plainly, never
 * as a failure: plans change.
 */
export function targetLabel(
  target: LocalDate | null,
  today: LocalDate,
): string | null {
  if (!target) return null
  const days = daysBetween(today, target)
  const date = formatLocalDate(target, "short")
  if (days === 0) return `Target: today (${date})`
  if (days === 1) return `Target: tomorrow (${date})`
  if (days > 1) return `Target: ${date} · ${days} days to go`
  return `Target date was ${date}`
}

/** Active goals first by nearest target (no target last), then by title. */
export function sortActiveGoals<T extends Pick<Goal, "target_date" | "title">>(
  goals: T[],
): T[] {
  return [...goals].sort((a, b) => {
    if (a.target_date !== b.target_date) {
      if (!a.target_date) return 1
      if (!b.target_date) return -1
      return a.target_date < b.target_date ? -1 : 1
    }
    return a.title.localeCompare(b.title)
  })
}
