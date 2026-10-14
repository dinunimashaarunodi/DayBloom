import { describe, expect, it } from "vitest"

import {
  canEditReview,
  moodFor,
  summaryCounts,
  summaryLine,
  type DaySummary,
} from "@/features/days/logic"
import { historyCursorSchema, reviewSchema } from "@/features/days/schema"
import type { LocalDate } from "@/lib/dates/local-date"

const d = (value: string) => value as LocalDate

function summary(partial: Partial<DaySummary>): DaySummary {
  return {
    version: 1,
    timezone: "Asia/Colombo",
    planned: [],
    completed: [],
    events: [],
    ...partial,
  }
}

describe("canEditReview", () => {
  const today = d("2026-10-14")
  it("allows today and the 7 days before it, nothing else", () => {
    expect(canEditReview(today, today)).toBe(true)
    expect(canEditReview(d("2026-10-07"), today)).toBe(true)
    expect(canEditReview(d("2026-10-06"), today)).toBe(false)
    expect(canEditReview(d("2026-10-15"), today)).toBe(false)
  })
})

describe("summary helpers", () => {
  const s = summary({
    planned: [
      { id: "1", title: "A", status: "done" },
      { id: "2", title: "B", status: "unfinished" },
      { id: "3", title: "C", status: "dropped" },
    ],
    completed: [
      { id: "1", title: "A", due_date: d("2026-10-13") },
      { id: "9", title: "Bonus", due_date: null },
    ],
    events: [
      {
        id: "e",
        title: "Dentist",
        all_day: false,
        starts_at: "2026-10-13T04:30:00Z",
        ends_at: "2026-10-13T05:00:00Z",
        start_date: null,
        end_date: null,
      },
    ],
  })

  it("counts planned outcomes and everything finished", () => {
    expect(summaryCounts(s)).toEqual({
      planned: 3,
      plannedDone: 1,
      unfinished: 1,
      dropped: 1,
      completed: 2,
      events: 1,
    })
  })

  it("describes a day in one friendly line", () => {
    expect(summaryLine(s)).toBe(
      "1 of 3 planned done · 2 finished in total · 1 event",
    )
    expect(summaryLine(summary({}))).toBe("A quiet day")
  })

  it("maps mood values to labels", () => {
    expect(moodFor(5)).toMatchObject({ label: "Great" })
    expect(moodFor(null)).toBeNull()
  })
})

describe("reviewSchema", () => {
  it("accepts a partial review and turns empty fields into null", () => {
    expect(
      reviewSchema.parse({
        date: "2026-10-14",
        mood: "4",
        energy: "",
        wins: "  ",
        reflection: "Calm",
      }),
    ).toEqual({
      date: "2026-10-14",
      mood: 4,
      energy: null,
      wins: null,
      reflection: "Calm",
    })
  })

  it("rejects out-of-range scales, long text and bad dates", () => {
    expect(
      reviewSchema.safeParse({ date: "2026-10-14", mood: "6" }).success,
    ).toBe(false)
    expect(
      reviewSchema.safeParse({ date: "2026-10-14", mood: "2.5" }).success,
    ).toBe(false)
    expect(
      reviewSchema.safeParse({ date: "2026-10-14", wins: "x".repeat(2001) })
        .success,
    ).toBe(false)
    expect(reviewSchema.safeParse({ date: "yesterday" }).success).toBe(false)
  })

  it("ignores invalid history cursors", () => {
    expect(historyCursorSchema.parse("2026-10-01")).toBe("2026-10-01")
    expect(historyCursorSchema.parse("drop table")).toBeUndefined()
  })
})
