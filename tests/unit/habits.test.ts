import { describe, expect, it } from "vitest"

import {
  bestStreak,
  completionRate,
  currentStreak,
  describeSchedule,
  EVERY_DAY,
  isScheduled,
  recentDays,
  WEEKDAYS,
  WEEKENDS,
  type Habit,
} from "@/features/habits/logic"
import type { LocalDate } from "@/lib/dates/local-date"

const d = (value: string) => value as LocalDate
// 2026-10-19 is a Monday.
const MON = d("2026-10-19")

function habit(days_mask = EVERY_DAY, started_on = "2026-09-01"): Habit {
  return { id: "h", name: "Read", days_mask, started_on: d(started_on) }
}
const set = (...dates: string[]) => new Set(dates)

describe("schedules", () => {
  it("maps weekdays to bits, Monday first", () => {
    expect(isScheduled(WEEKDAYS, MON)).toBe(true)
    expect(isScheduled(WEEKDAYS, d("2026-10-24"))).toBe(false) // Saturday
    expect(isScheduled(WEEKENDS, d("2026-10-25"))).toBe(true) // Sunday
  })

  it("describes schedules in plain words", () => {
    expect(describeSchedule(EVERY_DAY)).toBe("Every day")
    expect(describeSchedule(WEEKDAYS)).toBe("Weekdays")
    expect(describeSchedule(WEEKENDS)).toBe("Weekends")
    expect(describeSchedule(0b0010101)).toBe("Mon, Wed, Fri")
  })
})

describe("currentStreak", () => {
  it("counts consecutive days ending today", () => {
    expect(
      currentStreak(
        habit(),
        set("2026-10-17", "2026-10-18", "2026-10-19"),
        MON,
      ),
    ).toBe(3)
  })

  it("doesn't break just because today isn't done yet", () => {
    expect(currentStreak(habit(), set("2026-10-17", "2026-10-18"), MON)).toBe(2)
  })

  it("breaks on a missed scheduled day", () => {
    expect(
      currentStreak(
        habit(),
        set("2026-10-16", "2026-10-18", "2026-10-19"),
        MON,
      ),
    ).toBe(2)
  })

  it("skips unscheduled days, and counts check-ins on them as a bonus", () => {
    // Weekdays only: Fri 16 + Mon 19 done, weekend off.
    expect(
      currentStreak(habit(WEEKDAYS), set("2026-10-16", "2026-10-19"), MON),
    ).toBe(2)
    expect(
      currentStreak(
        habit(WEEKDAYS),
        set("2026-10-16", "2026-10-17", "2026-10-19"),
        MON,
      ),
    ).toBe(3)
  })

  it("never counts before the habit started", () => {
    expect(
      currentStreak(
        habit(EVERY_DAY, "2026-10-18"),
        set("2026-10-18", "2026-10-19"),
        MON,
      ),
    ).toBe(2)
    expect(currentStreak(habit(EVERY_DAY, "2026-10-19"), set(), MON)).toBe(0)
  })
})

describe("bestStreak", () => {
  it("finds the longest run, ignoring unscheduled gaps", () => {
    const done = set(
      "2026-10-01",
      "2026-10-02",
      "2026-10-03",
      "2026-10-07",
      "2026-10-08",
    )
    expect(bestStreak(habit(EVERY_DAY, "2026-10-01"), done, MON)).toBe(3)
    // Weekdays: Fri 2 → Mon 5 (weekend skipped) → Tue 6 missing.
    const weekdays = set("2026-10-01", "2026-10-02", "2026-10-05")
    expect(bestStreak(habit(WEEKDAYS, "2026-10-01"), weekdays, MON)).toBe(3)
  })
})

describe("completionRate", () => {
  it("is done / scheduled days, from the habit's start", () => {
    const h = habit(WEEKDAYS, "2026-10-14") // Wed
    // Scheduled from Wed 14 to Mon 19: 14,15,16,19 = 4 days.
    expect(
      completionRate(h, set("2026-10-14", "2026-10-16"), d("2026-10-01"), MON),
    ).toEqual({
      done: 2,
      scheduled: 4,
      percent: 50,
    })
  })

  it("returns null when nothing was scheduled", () => {
    expect(completionRate(habit(WEEKENDS), set(), MON, MON).percent).toBeNull()
  })
})

describe("recentDays", () => {
  it("lists the last days oldest first, ending today", () => {
    const days = recentDays(MON, 7)
    expect(days[0]).toEqual({ date: "2026-10-13", label: "Tue" })
    expect(days[6]).toEqual({ date: "2026-10-19", label: "Mon" })
  })
})
