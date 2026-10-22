import { describe, expect, it } from "vitest"

import { ACHIEVEMENTS } from "@/features/achievements/definitions"
import { buildAchievements, progressLabel } from "@/features/achievements/logic"

describe("buildAchievements", () => {
  const rows = [
    { code: "tasks_25", progress: 5, target: 25 },
    { code: "first_task", progress: 1, target: 1 },
    { code: "first_entry", progress: 1, target: 1 },
    { code: "tasks_100", progress: 5, target: 100 },
    { code: "unknown_code", progress: 1, target: 1 },
  ]

  it("joins copy, works out unlocked/new, and skips unknown codes", () => {
    const list = buildAchievements(rows, new Set(["first_entry"]))
    expect(list.map((a) => a.code)).toEqual([
      "first_task", // new
      "first_entry", // unlocked, seen
      "tasks_25", // 20%
      "tasks_100", // 5%
    ])
    expect(list[0]).toMatchObject({
      title: ACHIEVEMENTS.first_task!.title,
      unlocked: true,
      isNew: true,
      percent: 100,
    })
    expect(list[1]).toMatchObject({ unlocked: true, isNew: false })
    expect(list[2]).toMatchObject({
      unlocked: false,
      isNew: false,
      percent: 20,
    })
  })
})

describe("progressLabel", () => {
  it("counts things, and shows hours for time-based ones", () => {
    expect(progressLabel({ code: "tasks_25", progress: 3, target: 25 })).toBe(
      "3 of 25",
    )
    expect(
      progressLabel({ code: "focus_10h", progress: 150, target: 600 }),
    ).toBe("2 h 30 min of 10 h")
    expect(
      progressLabel({ code: "practice_10h", progress: 60, target: 600 }),
    ).toBe("1 h of 10 h")
  })
})
