import { describe, expect, it } from "vitest"

import {
  eventInputToRow,
  eventOccursOn,
  eventTimeLabel,
  eventToFormValues,
  groupByDay,
  type CalendarEvent,
} from "@/features/calendar/logic"
import { eventFormSchema, parseCalendarView } from "@/features/calendar/schema"
import { addDays, type LocalDate } from "@/lib/dates/local-date"

const d = (value: string) => value as LocalDate
const COLOMBO = "Asia/Colombo"

function timed(
  id: string,
  title: string,
  starts: string,
  ends: string,
): CalendarEvent {
  return {
    id,
    title,
    notes: null,
    all_day: false,
    starts_at: starts,
    ends_at: ends,
    start_date: null,
    end_date: null,
  }
}

function allDay(
  id: string,
  title: string,
  start: string,
  end: string,
): CalendarEvent {
  return {
    id,
    title,
    notes: null,
    all_day: true,
    starts_at: null,
    ends_at: null,
    start_date: d(start),
    end_date: d(end),
  }
}

/** Builds a validated timed event row the same way the action does. */
function rowFor(date: string, startTime: string, endTime: string, tz: string) {
  const input = eventFormSchema.parse({
    title: "Event",
    date,
    startTime,
    endTime,
  })
  return eventInputToRow(input, tz)!
}

describe("timed events and local days", () => {
  it("shows a 23:30 event on the day it was planned, not the UTC day", () => {
    const row = rowFor("2026-10-14", "23:30", "23:45", COLOMBO)
    expect(row.starts_at).toBe("2026-10-14T18:00:00.000Z")
    const event = { id: "1", ...row } as CalendarEvent
    expect(eventOccursOn(event, d("2026-10-14"), COLOMBO)).toBe(true)
    expect(eventOccursOn(event, d("2026-10-15"), COLOMBO)).toBe(false)
    expect(eventTimeLabel(event, d("2026-10-14"), COLOMBO)).toBe("23:30–23:45")
  })

  it("moves with the user's timezone, because it is a real moment", () => {
    // 09:00 in Colombo is 03:30 UTC, which is 23:30 the previous day in New York.
    const row = rowFor("2026-10-14", "09:00", "10:00", COLOMBO)
    const event = { id: "1", ...row } as CalendarEvent
    expect(eventOccursOn(event, d("2026-10-13"), "America/New_York")).toBe(true)
    expect(eventTimeLabel(event, d("2026-10-13"), "America/New_York")).toBe(
      "From 23:30",
    )
    expect(eventTimeLabel(event, d("2026-10-14"), "America/New_York")).toBe(
      "Until 00:30",
    )
  })

  it("appears on both days when it crosses midnight", () => {
    const event = timed(
      "1",
      "Late film",
      "2026-10-14T17:30:00Z",
      "2026-10-14T19:30:00Z",
    ) // 23:00–01:00 Colombo
    expect(eventOccursOn(event, d("2026-10-14"), COLOMBO)).toBe(true)
    expect(eventOccursOn(event, d("2026-10-15"), COLOMBO)).toBe(true)
    expect(eventTimeLabel(event, d("2026-10-14"), COLOMBO)).toBe("From 23:00")
    expect(eventTimeLabel(event, d("2026-10-15"), COLOMBO)).toBe("Until 01:00")
  })

  it("does not spill onto the next day when it ends exactly at midnight", () => {
    const event = timed(
      "1",
      "Evening",
      "2026-10-14T16:30:00Z",
      "2026-10-14T18:30:00Z",
    ) // 22:00–00:00
    expect(eventOccursOn(event, d("2026-10-15"), COLOMBO)).toBe(false)
    expect(eventTimeLabel(event, d("2026-10-14"), COLOMBO)).toBe("22:00–00:00")
  })

  it("rejects times that collapse in a daylight-saving gap", () => {
    // New York skips 02:00–03:00 on 8 March 2026: both times become 03:00.
    const input = eventFormSchema.parse({
      title: "Ghost hour",
      date: "2026-03-08",
      startTime: "02:10",
      endTime: "02:40",
    })
    expect(eventInputToRow(input, "America/New_York")).toBeNull()
  })

  it("round-trips through the edit form", () => {
    const row = rowFor("2026-10-14", "23:30", "23:45", COLOMBO)
    const values = eventToFormValues(
      { id: "1", ...row } as CalendarEvent,
      COLOMBO,
    )
    expect(values).toMatchObject({
      date: "2026-10-14",
      startTime: "23:30",
      endTime: "23:45",
      allDay: "",
    })
  })
})

describe("all-day events", () => {
  const trip = allDay("2", "Trip", "2026-10-14", "2026-10-16")

  it("cover exactly their days in every timezone", () => {
    for (const tz of [
      COLOMBO,
      "America/New_York",
      "Pacific/Kiritimati",
      "Pacific/Pago_Pago",
    ]) {
      expect(eventOccursOn(trip, d("2026-10-13"), tz)).toBe(false)
      expect(eventOccursOn(trip, d("2026-10-14"), tz)).toBe(true)
      expect(eventOccursOn(trip, d("2026-10-16"), tz)).toBe(true)
      expect(eventOccursOn(trip, d("2026-10-17"), tz)).toBe(false)
    }
    expect(eventTimeLabel(trip, d("2026-10-15"), COLOMBO)).toBe("All day")
  })

  it("are stored as calendar days with no timezone conversion", () => {
    const input = eventFormSchema.parse({
      title: "Holiday",
      allDay: "on",
      date: "2026-12-25",
    })
    expect(eventInputToRow(input, "Pacific/Kiritimati")).toMatchObject({
      all_day: true,
      start_date: "2026-12-25",
      end_date: "2026-12-25",
      starts_at: null,
    })
  })
})

describe("eventFormSchema", () => {
  it.each([
    [
      { title: "", date: "2026-10-14", startTime: "09:00", endTime: "10:00" },
      "title",
    ],
    [
      { title: "X", date: "2026-02-30", startTime: "09:00", endTime: "10:00" },
      "date",
    ],
    [{ title: "X", date: "2026-10-14", endTime: "10:00" }, "startTime"],
    [
      { title: "X", date: "2026-10-14", startTime: "10:00", endTime: "10:00" },
      "endTime",
    ],
    [
      { title: "X", date: "2026-10-14", startTime: "10:00", endTime: "09:00" },
      "endTime",
    ],
    [
      { title: "X", allDay: "on", date: "2026-10-14", endDate: "2026-10-13" },
      "endDate",
    ],
    [
      { title: "X", allDay: "on", date: "2026-10-14", endDate: "2027-10-15" },
      "endDate",
    ],
  ])("rejects %o on the %s field", (values, field) => {
    const result = eventFormSchema.safeParse(values)
    expect(result.success).toBe(false)
    expect(result.error?.issues.map((i) => i.path[0])).toContain(field)
  })

  it("accepts a multi-day all-day event and ignores time fields", () => {
    const result = eventFormSchema.parse({
      title: "Conference",
      allDay: "on",
      date: "2026-10-20",
      endDate: "2026-10-22",
      startTime: "garbage",
    })
    expect(result).toMatchObject({
      allDay: true,
      startDate: "2026-10-20",
      endDate: "2026-10-22",
    })
  })

  it("defaults to the month view", () => {
    expect(parseCalendarView("week")).toBe("week")
    expect(parseCalendarView("year")).toBe("month")
  })
})

describe("groupByDay", () => {
  it("places tasks by due date and events by overlap, all-day events first", () => {
    const days = Array.from({ length: 3 }, (_, i) =>
      addDays(d("2026-10-14"), i),
    )
    const tasks = [
      {
        id: "t1",
        title: "Pay rent",
        status: "todo" as const,
        due_date: d("2026-10-14"),
      },
      {
        id: "t2",
        title: "Old idea",
        status: "dropped" as const,
        due_date: d("2026-10-14"),
      },
      {
        id: "t3",
        title: "Gym",
        status: "done" as const,
        due_date: d("2026-10-16"),
      },
    ]
    const events = [
      timed("e1", "Dentist", "2026-10-14T04:30:00Z", "2026-10-14T05:00:00Z"), // 10:00 Colombo
      allDay("e2", "Trip", "2026-10-14", "2026-10-15"),
    ]
    const byDay = groupByDay(days, tasks, events, COLOMBO)

    expect(byDay.get(d("2026-10-14"))!.events.map((e) => e.title)).toEqual([
      "Trip",
      "Dentist",
    ])
    expect(byDay.get(d("2026-10-14"))!.tasks.map((t) => t.title)).toEqual([
      "Pay rent",
    ])
    expect(byDay.get(d("2026-10-15"))!.events.map((e) => e.title)).toEqual([
      "Trip",
    ])
    expect(byDay.get(d("2026-10-16"))!.tasks.map((t) => t.title)).toEqual([
      "Gym",
    ])
  })
})
