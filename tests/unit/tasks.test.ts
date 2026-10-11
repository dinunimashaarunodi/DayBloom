import { describe, expect, it } from "vitest"

import {
  dueLabel,
  isOverdue,
  moveWarningText,
  shouldWarnAboutMoves,
} from "@/features/tasks/logic"
import {
  createTaskSchema,
  parseTaskView,
  taskIdsSchema,
  updateTaskSchema,
} from "@/features/tasks/schema"
import type { LocalDate } from "@/lib/dates/local-date"

const d = (value: string) => value as LocalDate
const today = d("2026-10-11")

describe("dueLabel", () => {
  it.each([
    [null, "No date"],
    ["2026-10-11", "Today"],
    ["2026-10-12", "Tomorrow"],
    ["2026-10-10", "Yesterday"],
    ["2026-10-08", "3 days ago"],
    ["2026-10-16", "Fri 16 Oct"],
    ["2027-01-01", "Fri 1 Jan"],
  ])("labels %s as %j", (due, label) => {
    expect(dueLabel(due as LocalDate | null, today)).toBe(label)
  })
})

describe("isOverdue", () => {
  it("is true only for unfinished tasks dated before today", () => {
    expect(
      isOverdue({ status: "todo", due_date: d("2026-10-10") }, today),
    ).toBe(true)
    expect(isOverdue({ status: "todo", due_date: today }, today)).toBe(false)
    expect(isOverdue({ status: "todo", due_date: null }, today)).toBe(false)
    expect(
      isOverdue({ status: "done", due_date: d("2026-10-01") }, today),
    ).toBe(false)
  })
})

describe("move warning", () => {
  it("starts at two postponements, for unfinished tasks only", () => {
    expect(shouldWarnAboutMoves({ status: "todo", times_moved: 1 })).toBe(false)
    expect(shouldWarnAboutMoves({ status: "todo", times_moved: 2 })).toBe(true)
    expect(shouldWarnAboutMoves({ status: "done", times_moved: 5 })).toBe(false)
  })

  it("is supportive, not guilt-tripping, and never suggests postponing", () => {
    const text = moveWarningText(3)
    expect(text).toContain("Moved 3 times")
    expect(text).toMatch(/smaller first step|let it go/)
    expect(text).not.toMatch(/tomorrow|later|snooze|postpone/i)
  })
})

describe("createTaskSchema", () => {
  it("trims the title and treats an empty date as no date", () => {
    expect(createTaskSchema.parse({ title: "  Read  ", dueDate: "" })).toEqual({
      title: "Read",
      dueDate: null,
    })
    expect(createTaskSchema.parse({ title: "Read" }).dueDate).toBeNull()
  })

  it("rejects blank titles, overly long titles and impossible dates", () => {
    expect(createTaskSchema.safeParse({ title: "   " }).success).toBe(false)
    expect(createTaskSchema.safeParse({ title: "x".repeat(201) }).success).toBe(
      false,
    )
    expect(
      createTaskSchema.safeParse({ title: "Ok", dueDate: "2026-02-30" })
        .success,
    ).toBe(false)
  })
})

describe("updateTaskSchema", () => {
  const valid = {
    title: "Plan trip",
    notes: "",
    dueDate: "2026-10-20",
    priority: "high",
  }

  it("normalises empty notes to null", () => {
    expect(updateTaskSchema.parse(valid)).toEqual({
      title: "Plan trip",
      notes: null,
      dueDate: "2026-10-20",
      priority: "high",
    })
  })

  it("rejects unknown priorities", () => {
    expect(
      updateTaskSchema.safeParse({ ...valid, priority: "urgent" }).success,
    ).toBe(false)
  })
})

describe("misc", () => {
  it("falls back to the today view for unknown values", () => {
    expect(parseTaskView("upcoming")).toBe("upcoming")
    expect(parseTaskView("../admin")).toBe("today")
    expect(parseTaskView(undefined)).toBe("today")
  })

  it("only accepts UUIDs for reorder", () => {
    expect(taskIdsSchema.safeParse(["not-a-uuid"]).success).toBe(false)
    expect(
      taskIdsSchema.safeParse(["7f9c2a52-3b1e-4c8e-9a51-2a8f7d5c1e10"]).success,
    ).toBe(true)
  })
})
