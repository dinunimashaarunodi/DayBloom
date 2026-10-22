import { describe, expect, it } from "vitest"

import {
  effortLabel,
  weekStreak,
  weekSummary,
  workoutHeading,
} from "@/features/workouts/logic"
import { workoutFormSchema } from "@/features/workouts/schema"
import type { LocalDate } from "@/lib/dates/local-date"
import { formatMinutes } from "@/lib/duration"

const d = (value: string) => value as LocalDate
// 2026-10-22 is a Thursday; its week runs Mon 19 – Sun 25 October.
const THU = d("2026-10-22")

describe("weekSummary", () => {
  it("counts this week's workouts and active days, Monday first", () => {
    const week = weekSummary(
      [
        { local_date: d("2026-10-19"), duration_minutes: 30 },
        { local_date: d("2026-10-19"), duration_minutes: 15 },
        { local_date: d("2026-10-22"), duration_minutes: 45 },
        { local_date: d("2026-10-18"), duration_minutes: 60 }, // last week
      ],
      THU,
    )
    expect(week.count).toBe(3)
    expect(week.minutes).toBe(90)
    expect(week.days.map((day) => day.date)).toEqual([
      "2026-10-19",
      "2026-10-20",
      "2026-10-21",
      "2026-10-22",
      "2026-10-23",
      "2026-10-24",
      "2026-10-25",
    ])
    expect(week.days.map((day) => day.active)).toEqual([
      true,
      false,
      false,
      true,
      false,
      false,
      false,
    ])
    expect(week.days.filter((day) => day.future)).toHaveLength(3)
  })

  it("handles an empty week", () => {
    expect(weekSummary([], THU)).toMatchObject({ count: 0, minutes: 0 })
  })
})

describe("weekStreak", () => {
  it("counts consecutive weeks with a workout", () => {
    const dates = [d("2026-10-20"), d("2026-10-14"), d("2026-10-05")]
    expect(weekStreak(dates, THU)).toBe(3)
  })

  it("doesn't break while the current week is still empty", () => {
    expect(weekStreak([d("2026-10-14"), d("2026-10-08")], THU)).toBe(2)
  })

  it("stops at a week without workouts", () => {
    expect(weekStreak([d("2026-10-21"), d("2026-10-01")], THU)).toBe(1)
    expect(weekStreak([d("2026-10-01")], THU)).toBe(0)
    expect(weekStreak([], THU)).toBe(0)
  })

  it("treats Sunday as the end of the week", () => {
    // Sunday 25th and Monday 19th are the same week.
    expect(weekStreak([d("2026-10-19")], d("2026-10-25"))).toBe(1)
  })
})

describe("labels", () => {
  it("uses the title, or the kind", () => {
    expect(workoutHeading({ title: "Morning run", kind: "cardio" })).toBe(
      "Morning run",
    )
    expect(workoutHeading({ title: null, kind: "yoga" })).toBe(
      "Yoga & mobility",
    )
    expect(effortLabel(3)).toBe("Hard")
    expect(effortLabel(null)).toBeNull()
  })

  it("formats minutes", () => {
    expect(formatMinutes(45)).toBe("45 min")
    expect(formatMinutes(90)).toBe("1 h 30 min")
  })
})

describe("workoutFormSchema", () => {
  const valid = {
    date: "2026-10-22",
    kind: "cardio",
    title: "  ",
    duration: "30",
    effort: "",
    notes: " ",
  }

  it("parses the form, with blank optional fields as null", () => {
    expect(workoutFormSchema.parse(valid)).toEqual({
      date: "2026-10-22",
      kind: "cardio",
      title: null,
      duration: 30,
      effort: null,
      notes: null,
    })
    expect(workoutFormSchema.parse({ ...valid, effort: "2" }).effort).toBe(2)
  })

  it("rejects bad values", () => {
    for (const change of [
      { kind: "swimming" },
      { kind: undefined },
      { duration: "0" },
      { duration: "601" },
      { duration: "" },
      { duration: "20.5" },
      { effort: "4" },
      { date: "yesterday" },
    ]) {
      expect(workoutFormSchema.safeParse({ ...valid, ...change }).success).toBe(
        false,
      )
    }
  })
})
