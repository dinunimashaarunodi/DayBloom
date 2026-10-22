import { describe, expect, it } from "vitest"

import {
  encouragement,
  greeting,
  suggestNextStep,
  type DaySnapshot,
} from "@/features/today/logic"

const day = (change: Partial<DaySnapshot> = {}): DaySnapshot => ({
  overdue: 0,
  planned: 0,
  done: 0,
  habitsLeft: 0,
  reflected: false,
  hour: 10,
  ...change,
})

describe("suggestNextStep", () => {
  it("asks for decisions on unfinished tasks first", () => {
    const step = suggestNextStep(day({ overdue: 2, planned: 3 }))
    expect(step).toMatchObject({ key: "decide", href: "#needs-decision" })
    expect(step.title).toBe("2 tasks from earlier need a decision")
    expect(suggestNextStep(day({ overdue: 1 })).title).toBe(
      "1 task from earlier need a decision",
    )
  })

  it("suggests planning an empty day before the evening", () => {
    expect(suggestNextStep(day()).key).toBe("plan")
    expect(suggestNextStep(day({ hour: 20 })).key).toBe("reflect")
  })

  it("suggests focusing on what's left, then habits", () => {
    expect(suggestNextStep(day({ planned: 1, done: 2 }))).toMatchObject({
      key: "focus",
      title: "1 task left for today",
      href: "/focus",
    })
    expect(suggestNextStep(day({ done: 2, habitsLeft: 2 })).key).toBe("habits")
  })

  it("suggests reflecting in the evening, then says all is well", () => {
    expect(suggestNextStep(day({ done: 3, hour: 19 })).key).toBe("reflect")
    const done = suggestNextStep(day({ done: 3, hour: 19, reflected: true }))
    expect(done.key).toBe("done")
    expect(done.href).toBeUndefined()
  })
})

describe("encouragement", () => {
  it("stays positive at every stage", () => {
    expect(encouragement(0, 0)).toMatch(/fresh page/)
    expect(encouragement(0, 3)).toMatch(/plan is set/)
    expect(encouragement(1, 3)).toBe("1 done, 3 to go. Nice start.")
    expect(encouragement(3, 1)).toBe("3 done, 1 to go. Great momentum!")
    expect(encouragement(4, 0)).toMatch(/Well bloomed/)
  })
})

describe("greeting", () => {
  it("follows the local hour", () => {
    expect(greeting(6)).toBe("Good morning")
    expect(greeting(13)).toBe("Good afternoon")
    expect(greeting(21)).toBe("Good evening")
  })
})
