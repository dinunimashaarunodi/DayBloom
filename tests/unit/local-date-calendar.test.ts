import { describe, expect, it } from "vitest"

import {
  addMonths,
  dayOfWeek,
  formatLocalDate,
  isLocalTime,
  isSameMonth,
  localDateTimeToInstant,
  localTimeSchema,
  monthGrid,
  startOfMonth,
  startOfWeek,
  toLocalDate,
  toLocalTime,
  type LocalDate,
  type LocalTime,
} from "@/lib/dates/local-date"

const d = (value: string) => value as LocalDate
const t = (value: string) => value as LocalTime

describe("local times", () => {
  it("validates HH:MM in 24-hour form", () => {
    expect(isLocalTime("00:00")).toBe(true)
    expect(isLocalTime("23:59")).toBe(true)
    for (const bad of ["24:00", "7:30", "12:60", "12:30:00", ""]) {
      expect(isLocalTime(bad)).toBe(false)
    }
    expect(localTimeSchema.safeParse("25:00").error?.issues[0]?.message).toBe(
      "Choose a valid time.",
    )
  })

  it("converts a late-evening local time to the right instant and day", () => {
    // 23:30 in Colombo (UTC+5:30) is 18:00 UTC the same day.
    const instant = localDateTimeToInstant(
      d("2026-10-14"),
      t("23:30"),
      "Asia/Colombo",
    )
    expect(instant.toISOString()).toBe("2026-10-14T18:00:00.000Z")
    expect(toLocalDate(instant, "Asia/Colombo")).toBe("2026-10-14")
    expect(toLocalTime(instant, "Asia/Colombo")).toBe("23:30")
    // The same instant is the next morning in Auckland.
    expect(toLocalDate(instant, "Pacific/Auckland")).toBe("2026-10-15")
    expect(toLocalTime(instant, "Pacific/Auckland")).toBe("07:00")
  })

  it("round-trips every quarter hour of a DST-change day", () => {
    for (const [date, tz] of [
      ["2026-11-01", "America/New_York"], // 01:00–01:59 happens twice
      ["2026-03-08", "America/New_York"], // 02:00–02:59 never happens
    ] as const) {
      for (let minutes = 0; minutes < 24 * 60; minutes += 15) {
        const time = t(
          `${String(Math.floor(minutes / 60)).padStart(2, "0")}:${String(minutes % 60).padStart(2, "0")}`,
        )
        const instant = localDateTimeToInstant(d(date), time, tz)
        expect(toLocalDate(instant, tz)).toBe(date)
        const skipped =
          date === "2026-03-08" && time >= "02:00" && time < "03:00"
        expect(toLocalTime(instant, tz)).toBe(skipped ? "03:00" : time)
      }
    }
  })

  it("picks the earlier instant for a repeated time and the jump moment for a skipped one", () => {
    const repeated = localDateTimeToInstant(
      d("2026-11-01"),
      t("01:30"),
      "America/New_York",
    )
    expect(repeated.toISOString()).toBe("2026-11-01T05:30:00.000Z") // 01:30 EDT, not EST
    const skipped = localDateTimeToInstant(
      d("2026-03-08"),
      t("02:30"),
      "America/New_York",
    )
    expect(skipped.toISOString()).toBe("2026-03-08T07:00:00.000Z") // 03:00 EDT
  })
})

describe("weeks and months", () => {
  it("numbers weekdays Monday-first and finds the week start", () => {
    expect(dayOfWeek(d("2026-10-12"))).toBe(0) // Monday
    expect(dayOfWeek(d("2026-10-18"))).toBe(6) // Sunday
    expect(startOfWeek(d("2026-10-14"))).toBe("2026-10-12")
    expect(startOfWeek(d("2026-10-12"))).toBe("2026-10-12")
    expect(startOfWeek(d("2027-01-01"))).toBe("2026-12-28") // across a year
  })

  it("adds months, clamping to the end of shorter months", () => {
    expect(addMonths(d("2026-10-14"), 1)).toBe("2026-11-14")
    expect(addMonths(d("2026-01-31"), 1)).toBe("2026-02-28")
    expect(addMonths(d("2028-01-31"), 1)).toBe("2028-02-29")
    expect(addMonths(d("2026-12-15"), 1)).toBe("2027-01-15")
    expect(addMonths(d("2026-01-15"), -1)).toBe("2025-12-15")
    expect(addMonths(d("2026-03-31"), -1)).toBe("2026-02-28")
    expect(startOfMonth(d("2026-10-14"))).toBe("2026-10-01")
    expect(isSameMonth(d("2026-10-01"), d("2026-10-31"))).toBe(true)
    expect(isSameMonth(d("2026-10-31"), d("2026-11-01"))).toBe(false)
  })

  it("builds a Monday-first month grid of whole weeks", () => {
    const october = monthGrid(d("2026-10-14"))
    expect(october).toHaveLength(5)
    expect(october[0][0]).toBe("2026-09-28")
    expect(october.at(-1)!.at(-1)).toBe("2026-11-01")
    expect(october.every((week) => week.length === 7)).toBe(true)

    // February 2027 starts on a Monday and has exactly 4 weeks.
    const feb = monthGrid(d("2027-02-10"))
    expect(feb).toHaveLength(4)
    expect(feb[0][0]).toBe("2027-02-01")
    expect(feb[3][6]).toBe("2027-02-28")

    // A month needing 6 rows: August 2027 starts on a Sunday.
    expect(monthGrid(d("2027-08-01"))).toHaveLength(6)
  })

  it("formats months and weekday names", () => {
    expect(formatLocalDate(d("2026-10-14"), "month")).toBe("October 2026")
    expect(formatLocalDate(d("2026-10-14"), "weekday")).toBe("Wed")
  })
})
