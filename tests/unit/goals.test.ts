import { describe, expect, it } from "vitest"

import {
  progress,
  readyToAchieve,
  sortActiveGoals,
  targetLabel,
} from "@/features/goals/logic"
import { goalFormSchema, milestoneTitleSchema } from "@/features/goals/schema"
import type { LocalDate } from "@/lib/dates/local-date"

const d = (value: string) => value as LocalDate
const TODAY = d("2026-10-22")
const done = (...flags: boolean[]) => flags.map((f) => ({ done: f }))

describe("progress", () => {
  it("counts done milestones as a rounded percent", () => {
    expect(progress(done(true, false, false))).toEqual({
      done: 1,
      total: 3,
      percent: 33,
    })
    expect(progress(done(true, true))).toMatchObject({ percent: 100 })
    expect(progress([])).toEqual({ done: 0, total: 0, percent: 0 })
  })

  it("is ready to achieve only when every milestone is done", () => {
    expect(readyToAchieve(done(true, true))).toBe(true)
    expect(readyToAchieve(done(true, false))).toBe(false)
    expect(readyToAchieve([])).toBe(false)
  })
})

describe("targetLabel", () => {
  it("describes the target in friendly words", () => {
    expect(targetLabel(null, TODAY)).toBeNull()
    expect(targetLabel(TODAY, TODAY)).toBe("Target: today (Thu 22 Oct)")
    expect(targetLabel(d("2026-10-23"), TODAY)).toBe(
      "Target: tomorrow (Fri 23 Oct)",
    )
    expect(targetLabel(d("2026-11-01"), TODAY)).toBe(
      "Target: Sun 1 Nov · 10 days to go",
    )
  })

  it("states a passed date plainly, without blame", () => {
    expect(targetLabel(d("2026-10-01"), TODAY)).toBe(
      "Target date was Thu 1 Oct",
    )
  })
})

describe("sortActiveGoals", () => {
  it("puts the nearest targets first and undated goals last", () => {
    const goals = [
      { title: "Read 12 books", target_date: null },
      { title: "Run a 10K", target_date: d("2026-12-01") },
      { title: "Learn to swim", target_date: d("2026-11-01") },
      { title: "Bake bread", target_date: null },
    ]
    expect(sortActiveGoals(goals).map((g) => g.title)).toEqual([
      "Learn to swim",
      "Run a 10K",
      "Bake bread",
      "Read 12 books",
    ])
  })
})

describe("schemas", () => {
  it("parses the goal form", () => {
    expect(
      goalFormSchema.parse({ title: " Run a 10K ", why: " ", target: "" }),
    ).toEqual({ title: "Run a 10K", why: null, target: null })
    expect(
      goalFormSchema.parse({ title: "x", why: "", target: "2026-12-01" })
        .target,
    ).toBe("2026-12-01")
  })

  it("rejects a missing title or a bad date", () => {
    expect(
      goalFormSchema.safeParse({ title: " ", why: "", target: "" }).success,
    ).toBe(false)
    expect(
      goalFormSchema.safeParse({ title: "x", why: "", target: "2026-13-01" })
        .success,
    ).toBe(false)
    expect(milestoneTitleSchema.safeParse("  ").success).toBe(false)
    expect(milestoneTitleSchema.safeParse("a".repeat(101)).success).toBe(false)
  })
})
