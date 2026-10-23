import { describe, expect, it } from "vitest"

import {
  describeRepeat,
  EVERY_DAY,
  nextOccurrence,
  occursOn,
  WEEKDAYS,
  WEEKENDS,
} from "@/features/tasks/repeat"
import { seriesFormSchema } from "@/features/tasks/schema"
import type { LocalDate } from "@/lib/dates/local-date"

const d = (value: string) => value as LocalDate
const weekly = (days_mask: number) => ({ days_mask, month_day: null })
const monthly = (month_day: number) => ({ days_mask: null, month_day })
// 2026-10-19 is a Monday.
const MON = d("2026-10-19")

describe("occursOn", () => {
  it("follows the weekday mask, Monday first", () => {
    expect(occursOn(weekly(WEEKDAYS), MON)).toBe(true)
    expect(occursOn(weekly(WEEKDAYS), d("2026-10-24"))).toBe(false) // Sat
    expect(occursOn(weekly(WEEKENDS), d("2026-10-25"))).toBe(true) // Sun
    expect(occursOn(weekly(0b0000100), d("2026-10-21"))).toBe(true) // Wed
  })

  it("puts month days past the end on the month's last day", () => {
    expect(occursOn(monthly(15), d("2026-10-15"))).toBe(true)
    expect(occursOn(monthly(31), d("2026-10-31"))).toBe(true)
    expect(occursOn(monthly(31), d("2026-11-30"))).toBe(true)
    expect(occursOn(monthly(31), d("2026-11-29"))).toBe(false)
    expect(occursOn(monthly(30), d("2027-02-28"))).toBe(true)
    expect(occursOn(monthly(29), d("2028-02-29"))).toBe(true) // leap year
    expect(occursOn(monthly(29), d("2028-02-28"))).toBe(false)
  })
})

describe("nextOccurrence", () => {
  const series = {
    ...weekly(0b0000001), // Mondays
    starts_on: d("2026-10-01"),
    ends_on: null,
    archived: false,
  }

  it("finds today or the next due day", () => {
    expect(nextOccurrence(series, MON)).toBe(MON)
    expect(nextOccurrence(series, d("2026-10-20"))).toBe(d("2026-10-26"))
  })

  it("doesn't start before the start date", () => {
    expect(nextOccurrence({ ...series, starts_on: d("2026-11-03") }, MON)).toBe(
      d("2026-11-09"),
    )
  })

  it("stops at the end date, and when stopped", () => {
    expect(
      nextOccurrence({ ...series, ends_on: d("2026-10-25") }, d("2026-10-20")),
    ).toBeNull()
    expect(nextOccurrence({ ...series, archived: true }, MON)).toBeNull()
  })
})

describe("describeRepeat", () => {
  it("names common schedules and lists the rest", () => {
    expect(describeRepeat(weekly(EVERY_DAY))).toBe("Every day")
    expect(describeRepeat(weekly(WEEKDAYS))).toBe("Weekdays")
    expect(describeRepeat(weekly(WEEKENDS))).toBe("Weekends")
    expect(describeRepeat(weekly(0b0010101))).toBe("Mon, Wed, Fri")
    expect(describeRepeat(monthly(1))).toBe("Monthly on the 1st")
    expect(describeRepeat(monthly(22))).toBe("Monthly on the 22nd")
    expect(describeRepeat(monthly(13))).toBe("Monthly on the 13th")
    expect(describeRepeat(monthly(31))).toBe(
      "Monthly on the 31st (or the month's last day)",
    )
  })
})

describe("seriesFormSchema", () => {
  const base = {
    title: " Water the plants ",
    notes: "",
    priority: "normal",
    kind: "daily",
    days: [],
    monthDay: "",
    startsOn: "2026-10-23",
    endsOn: "",
  }

  it("turns each kind into a stored rule", () => {
    expect(seriesFormSchema.parse(base)).toEqual({
      title: "Water the plants",
      notes: null,
      priority: "normal",
      days_mask: EVERY_DAY,
      month_day: null,
      starts_on: "2026-10-23",
      ends_on: null,
    })
    expect(
      seriesFormSchema.parse({ ...base, kind: "weekdays" }).days_mask,
    ).toBe(WEEKDAYS)
    expect(
      seriesFormSchema.parse({ ...base, kind: "days", days: ["0", "2"] })
        .days_mask,
    ).toBe(0b101)
    expect(
      seriesFormSchema.parse({ ...base, kind: "monthly", monthDay: "31" }),
    ).toMatchObject({ days_mask: null, month_day: 31 })
  })

  it("explains what's missing", () => {
    const errors = (input: object) =>
      seriesFormSchema
        .safeParse({ ...base, ...input })
        .error?.issues.map((i) => i.message)
    expect(errors({ kind: "days" })).toEqual(["Pick at least one day."])
    expect(errors({ kind: "monthly", monthDay: "32" })).toEqual([
      "Choose a day from 1 to 31.",
    ])
    expect(errors({ endsOn: "2026-10-01" })).toEqual([
      "End on or after the start date.",
    ])
    expect(errors({ title: "  " })).toEqual(["Give your task a name."])
  })
})
