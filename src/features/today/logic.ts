/**
 * Today's dashboard guidance: one suggested next step and a line of
 * encouragement. Pure functions (no React, no clock): pass the counts in.
 * The tone is supportive; it never nudges anyone to postpone.
 */

export type DaySnapshot = {
  /** Unfinished tasks from earlier days, waiting for a decision. */
  overdue: number
  /** Tasks planned for today and not done yet. */
  planned: number
  /** Tasks finished today. */
  done: number
  /** Habits scheduled today that aren't checked in yet. */
  habitsLeft: number
  /** Today's reflection is saved. */
  reflected: boolean
  /** Local hour, 0–23. */
  hour: number
}

export type NextStep = {
  key: "decide" | "plan" | "focus" | "habits" | "reflect" | "done"
  title: string
  description: string
  /** Where the call to action goes; absent when there's nothing to do. */
  href?: string
  cta?: string
}

const EVENING = 18

const plural = (n: number, one: string, many = `${one}s`) =>
  `${n} ${n === 1 ? one : many}`

/** The single most useful thing to do next, in priority order. */
export function suggestNextStep(day: DaySnapshot): NextStep {
  if (day.overdue > 0) {
    return {
      key: "decide",
      title: `${plural(day.overdue, "task")} from earlier need a decision`,
      description: "A quick choice for each keeps today clear.",
      href: "#needs-decision",
      cta: "Decide now",
    }
  }
  if (day.planned === 0 && day.done === 0 && day.hour < EVENING) {
    return {
      key: "plan",
      title: "Plan your day",
      description: "Add one thing you'd like to get done today.",
      href: "#quick-add",
      cta: "Add a task",
    }
  }
  if (day.planned > 0) {
    return {
      key: "focus",
      title: `${plural(day.planned, "task")} left for today`,
      description: "Pick the next one and give it your full attention.",
      href: "/focus",
      cta: "Start a focus session",
    }
  }
  if (day.habitsLeft > 0) {
    return {
      key: "habits",
      title: `${plural(day.habitsLeft, "habit")} still open today`,
      description: "A small check-in keeps your streak growing.",
      href: "/habits",
      cta: "Check in",
    }
  }
  if (!day.reflected && day.hour >= EVENING) {
    return {
      key: "reflect",
      title: "Reflect on your day",
      description: "A minute to notice how today went.",
      href: "#reflect",
      cta: "Reflect",
    }
  }
  return {
    key: "done",
    title: "You're all set",
    description: "Everything for today is taken care of. Enjoy the rest of it!",
  }
}

/** A short, positive line about today's task progress. */
export function encouragement(done: number, planned: number): string {
  const total = done + planned
  if (total === 0) return "A fresh page. What would make today feel good?"
  if (planned === 0) return "Everything done. Well bloomed!"
  if (done === 0) return "Your plan is set. One step at a time."
  if (done >= planned) return `${done} done, ${planned} to go. Great momentum!`
  return `${done} done, ${planned} to go. Nice start.`
}

/** "Good morning" / "Good afternoon" / "Good evening" for a local hour. */
export function greeting(hour: number): string {
  if (hour < 12) return "Good morning"
  if (hour < 18) return "Good afternoon"
  return "Good evening"
}
