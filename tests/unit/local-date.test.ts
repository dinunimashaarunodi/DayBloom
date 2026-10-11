import { describe, expect, it } from "vitest"

import {
  addDays,
  compareLocalDates,
  daysBetween,
  formatLocalDate,
  isBeforeDay,
  isLocalDate,
  localDateSchema,
  localDayRange,
  startOfLocalDay,
  todayIn,
  toLocalDate,
  type LocalDate,
} from "@/lib/dates/local-date"

const d = (value: string) => value as LocalDate
const HOUR = 3_600_000
const hoursIn = (date: string, tz: string) => {
  const { start, end } = localDayRange(d(date), tz)
  return (end.getTime() - start.getTime()) / HOUR
}

describe("isLocalDate / localDateSchema", () => {
  it("accepts real calendar days", () => {
    expect(isLocalDate("2026-10-11")).toBe(true)
    expect(isLocalDate("2028-02-29")).toBe(true) // leap year
  })

  it.each([
    "2026-02-30",
    "2027-02-29",
    "2026-13-01",
    "2026-1-1",
    "2026-10-11T00:00",
    "",
    "0999-01-01",
  ])("rejects %j", (value) => {
    expect(isLocalDate(value)).toBe(false)
  })

  it("rejects non-strings and gives a friendly form error", () => {
    expect(isLocalDate(20261011)).toBe(false)
    const result = localDateSchema.safeParse("2026-02-30")
    expect(result.success).toBe(false)
    expect(result.error?.issues[0]?.message).toBe("Choose a valid date.")
  })
})

describe("todayIn: the user's today, never the server's", () => {
  // The server runs in UTC. 20:00 UTC on 11 Oct is already 12 Oct in Colombo.
  const now = new Date("2026-10-11T20:00:00Z")

  it("depends on the user's timezone", () => {
    expect(todayIn("UTC", now)).toBe("2026-10-11")
    expect(todayIn("Asia/Colombo", now)).toBe("2026-10-12")
    expect(todayIn("America/New_York", now)).toBe("2026-10-11")
    expect(todayIn("Pacific/Auckland", now)).toBe("2026-10-12")
  })

  it("switches exactly at local midnight in a half-hour offset zone (UTC+5:30)", () => {
    expect(todayIn("Asia/Colombo", new Date("2026-10-11T18:29:59.999Z"))).toBe(
      "2026-10-11",
    )
    expect(todayIn("Asia/Colombo", new Date("2026-10-11T18:30:00.000Z"))).toBe(
      "2026-10-12",
    )
  })

  it("handles the date line (Pacific/Kiritimati is UTC+14)", () => {
    expect(
      todayIn("Pacific/Kiritimati", new Date("2026-12-31T10:00:00Z")),
    ).toBe("2027-01-01")
  })
})

describe("localDayRange", () => {
  it("is 24h on an ordinary day and starts at local midnight", () => {
    const { start, end } = localDayRange(d("2026-10-12"), "Asia/Colombo")
    expect(start.toISOString()).toBe("2026-10-11T18:30:00.000Z")
    expect(end.toISOString()).toBe("2026-10-12T18:30:00.000Z")
  })

  it("is 23h when daylight saving starts and 25h when it ends (New York)", () => {
    expect(hoursIn("2026-03-08", "America/New_York")).toBe(23)
    expect(hoursIn("2026-11-01", "America/New_York")).toBe(25)
    expect(hoursIn("2026-11-02", "America/New_York")).toBe(24)
  })

  it("handles southern-hemisphere daylight saving (Auckland)", () => {
    expect(hoursIn("2026-09-27", "Pacific/Auckland")).toBe(23)
    expect(hoursIn("2026-04-05", "Pacific/Auckland")).toBe(25)
  })

  it("uses the first existing instant when midnight is skipped (Santiago)", () => {
    // On 6 Sep 2026 Chilean clocks jump from 00:00 straight to 01:00.
    const start = startOfLocalDay(d("2026-09-06"), "America/Santiago")
    expect(start.toISOString()).toBe("2026-09-06T04:00:00.000Z") // 01:00 local
    expect(toLocalDate(start, "America/Santiago")).toBe("2026-09-06")
    expect(toLocalDate(new Date(start.getTime() - 1), "America/Santiago")).toBe(
      "2026-09-05",
    )
    expect(hoursIn("2026-09-06", "America/Santiago")).toBe(23)
  })

  // Property check: for every day of a year, the range covers exactly that day
  // and days tile without gaps or overlaps. Independent of tzdata rule details.
  it.each([
    "Asia/Colombo",
    "America/New_York",
    "Pacific/Auckland",
    "America/Santiago",
    "Europe/London",
    "Australia/Lord_Howe",
  ])("tiles every day of 2026 exactly in %s", (tz) => {
    let date = d("2026-01-01")
    for (let i = 0; i < 366; i++) {
      const { start, end } = localDayRange(date, tz)
      expect(toLocalDate(start, tz)).toBe(date)
      expect(toLocalDate(new Date(start.getTime() - 1), tz)).toBe(
        addDays(date, -1),
      )
      expect(toLocalDate(new Date(end.getTime() - 1), tz)).toBe(date)
      expect(localDayRange(addDays(date, 1), tz).start).toEqual(end)
      date = addDays(date, 1)
    }
  })
})

describe("calendar arithmetic", () => {
  it("adds days across month, year and leap-day boundaries", () => {
    expect(addDays(d("2026-10-31"), 1)).toBe("2026-11-01")
    expect(addDays(d("2026-12-31"), 1)).toBe("2027-01-01")
    expect(addDays(d("2028-02-28"), 1)).toBe("2028-02-29")
    expect(addDays(d("2027-02-28"), 1)).toBe("2027-03-01")
    expect(addDays(d("2026-03-01"), -1)).toBe("2026-02-28")
    expect(addDays(d("2026-10-11"), 0)).toBe("2026-10-11")
  })

  it("is unaffected by daylight saving (calendar days, not 24h blocks)", () => {
    expect(addDays(d("2026-03-07"), 2)).toBe("2026-03-09")
    expect(daysBetween(d("2026-03-07"), d("2026-03-09"))).toBe(2)
  })

  it("rejects fractional day amounts", () => {
    expect(() => addDays(d("2026-10-11"), 0.5)).toThrow(RangeError)
  })

  it("counts days between dates in both directions", () => {
    expect(daysBetween(d("2026-10-11"), d("2026-10-11"))).toBe(0)
    expect(daysBetween(d("2026-10-11"), d("2027-10-11"))).toBe(365)
    expect(daysBetween(d("2026-10-11"), d("2026-10-01"))).toBe(-10)
  })

  it("compares and sorts dates", () => {
    expect(isBeforeDay(d("2026-09-30"), d("2026-10-01"))).toBe(true)
    expect(isBeforeDay(d("2026-10-01"), d("2026-10-01"))).toBe(false)
    expect(compareLocalDates(d("2026-10-01"), d("2026-10-01"))).toBe(0)
    const sorted = [d("2026-12-01"), d("2026-01-15"), d("2026-10-11")].sort(
      compareLocalDates,
    )
    expect(sorted).toEqual(["2026-01-15", "2026-10-11", "2026-12-01"])
  })
})

describe("formatLocalDate", () => {
  it("formats the calendar day itself, with no timezone shift", () => {
    expect(formatLocalDate(d("2026-10-12"))).toBe("Monday 12 October")
    expect(formatLocalDate(d("2026-10-12"), "short")).toBe("Mon 12 Oct")
    expect(formatLocalDate(d("2026-10-12"), "full")).toBe("12 October 2026")
  })
})
