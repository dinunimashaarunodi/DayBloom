import { describe, expect, it } from "vitest"

import {
  dailyMinutes,
  focusedSeconds,
  formatClock,
  formatMinutes,
  isActive,
  isComplete,
  remainingSeconds,
  sessionEnd,
  type FocusSession,
} from "@/features/focus/logic"
import { startFocusSchema } from "@/features/focus/schema"
import type { LocalDate } from "@/lib/dates/local-date"

const START = "2026-10-22T10:00:00Z"
const at = (iso: string) => new Date(iso)

function session(extra: Partial<FocusSession> = {}): FocusSession {
  return {
    id: "s",
    label: null,
    planned_minutes: 25,
    started_at: START,
    ended_at: null,
    ...extra,
  }
}

describe("a running session", () => {
  it("counts down from the stored start time", () => {
    const s = session()
    const now = at("2026-10-22T10:10:00Z")
    expect(isActive(s, now)).toBe(true)
    expect(remainingSeconds(s, now)).toBe(15 * 60)
    expect(focusedSeconds(s, now)).toBe(10 * 60)
  })

  it("finishes by itself at the planned end, even if nobody ends it", () => {
    const s = session()
    const later = at("2026-10-22T13:00:00Z")
    expect(isActive(s, later)).toBe(false)
    expect(remainingSeconds(s, later)).toBe(0)
    expect(focusedSeconds(s, later)).toBe(25 * 60)
    expect(isComplete(s)).toBe(true)
  })

  it("rounds the remaining time up, so it never shows 0:00 early", () => {
    expect(remainingSeconds(session(), at("2026-10-22T10:24:59.500Z"))).toBe(1)
  })
})

describe("an ended session", () => {
  it("counts only up to when it was ended early", () => {
    const s = session({ ended_at: "2026-10-22T10:12:30Z" })
    expect(isActive(s, at("2026-10-22T10:13:00Z"))).toBe(false)
    expect(focusedSeconds(s, at("2026-10-22T11:00:00Z"))).toBe(750)
    expect(isComplete(s)).toBe(false)
    expect(remainingSeconds(s, at("2026-10-22T10:13:00Z"))).toBe(0)
  })

  it("never counts past the planned end", () => {
    const s = session({ ended_at: "2026-10-22T12:00:00Z" })
    expect(sessionEnd(s).toISOString()).toBe("2026-10-22T10:25:00.000Z")
    expect(isComplete(s)).toBe(true)
  })
})

describe("dailyMinutes", () => {
  it("adds up focused minutes per local day, oldest first", () => {
    const today = "2026-10-22" as LocalDate
    // Colombo is UTC+5:30: 20:00Z on the 21st is 01:30 on the 22nd.
    const sessions = [
      session({ id: "a", started_at: "2026-10-22T04:00:00Z" }),
      session({ id: "b", started_at: "2026-10-21T20:00:00Z" }),
      session({
        id: "c",
        started_at: "2026-10-20T05:00:00Z",
        planned_minutes: 60,
        ended_at: "2026-10-20T05:40:00Z",
      }),
    ]
    const now = at("2026-10-22T12:00:00Z")
    expect(dailyMinutes(sessions, today, "Asia/Colombo", now, 3)).toEqual([
      { date: "2026-10-20", minutes: 40 },
      { date: "2026-10-21", minutes: 0 },
      { date: "2026-10-22", minutes: 50 },
    ])
  })

  it("counts a running session up to now", () => {
    const s = session({ started_at: "2026-10-22T04:00:00Z" })
    const now = at("2026-10-22T04:07:30Z")
    expect(
      dailyMinutes([s], "2026-10-22" as LocalDate, "Asia/Colombo", now, 1),
    ).toEqual([{ date: "2026-10-22", minutes: 7 }])
  })
})

describe("formatting", () => {
  it("formats minutes", () => {
    expect(formatMinutes(0)).toBe("0 min")
    expect(formatMinutes(45)).toBe("45 min")
    expect(formatMinutes(60)).toBe("1 h")
    expect(formatMinutes(125)).toBe("2 h 5 min")
  })

  it("formats a countdown clock", () => {
    expect(formatClock(0)).toBe("0:00")
    expect(formatClock(245)).toBe("4:05")
    expect(formatClock(25 * 60)).toBe("25:00")
    expect(formatClock(90 * 60)).toBe("1:30:00")
    expect(formatClock(-3)).toBe("0:00")
  })
})

describe("startFocusSchema", () => {
  it("accepts a length and an optional label", () => {
    expect(startFocusSchema.parse({ label: "  ", minutes: "25" })).toEqual({
      label: null,
      minutes: 25,
    })
    expect(
      startFocusSchema.parse({ label: " Essay ", minutes: "90" }).label,
    ).toBe("Essay")
  })

  it("rejects missing or out-of-range lengths", () => {
    for (const minutes of [undefined, "", "0", "241", "2.5", "abc"]) {
      expect(startFocusSchema.safeParse({ label: "", minutes }).success).toBe(
        false,
      )
    }
  })
})
