import { describe, expect, it } from "vitest"

import { formatLongDate, isValidTimeZone, listTimeZones, localHour } from "@/lib/dates/timezone"

describe("isValidTimeZone", () => {
  it("accepts IANA names and common aliases", () => {
    expect(isValidTimeZone("Asia/Colombo")).toBe(true)
    expect(isValidTimeZone("UTC")).toBe(true)
    expect(isValidTimeZone("Asia/Calcutta")).toBe(true) // legacy alias some browsers report
  })

  it("rejects unknown or non-string values", () => {
    expect(isValidTimeZone("Mars/Olympus")).toBe(false)
    expect(isValidTimeZone("")).toBe(false)
    expect(isValidTimeZone(undefined)).toBe(false)
  })
})

describe("listTimeZones", () => {
  it("includes a valid alias the user already has, without duplicates", () => {
    const zones = listTimeZones("Asia/Calcutta")
    expect(zones).toContain("Asia/Calcutta")
    expect(zones.filter((z) => z === "Asia/Colombo")).toHaveLength(1)
  })

  it("ignores invalid extra values", () => {
    expect(listTimeZones("Mars/Olympus")).not.toContain("Mars/Olympus")
  })
})

describe("local date and hour", () => {
  // 2026-10-11 20:00 UTC = 01:30 on 12 Oct in Colombo (UTC+5:30), still 11 Oct in New York.
  const instant = new Date("2026-10-11T20:00:00Z")

  it("formats the calendar day in the user's timezone, not the server's", () => {
    expect(formatLongDate(instant, "Asia/Colombo")).toBe("Monday 12 October")
    expect(formatLongDate(instant, "America/New_York")).toBe("Sunday 11 October")
  })

  it("returns the local hour across half-hour offsets", () => {
    expect(localHour(instant, "Asia/Colombo")).toBe(1)
    expect(localHour(instant, "America/New_York")).toBe(16)
    expect(localHour(instant, "UTC")).toBe(20)
  })
})
