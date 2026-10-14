import { z } from "zod"

import {
  daysBetween,
  localDateSchema,
  localTimeSchema,
  type LocalDate,
} from "@/lib/dates/local-date"

export const CALENDAR_VIEWS = ["month", "week"] as const
export type CalendarView = (typeof CALENDAR_VIEWS)[number]

export function parseCalendarView(value: unknown): CalendarView {
  return CALENDAR_VIEWS.includes(value as CalendarView)
    ? (value as CalendarView)
    : "month"
}

export const eventIdSchema = z.uuid()

/** Raw form fields (all strings; the checkbox sends "on" when ticked). */
const eventFormFields = z.object({
  title: z
    .string()
    .trim()
    .min(1, "Give your event a name.")
    .max(200, "Keep it under 200 characters."),
  notes: z
    .string()
    .trim()
    .max(5000, "Keep notes under 5,000 characters.")
    .optional()
    .transform((value) => value || null),
  allDay: z
    .string()
    .optional()
    .transform((value) => value === "on"),
  date: localDateSchema,
  endDate: z.string().optional(),
  startTime: z.string().optional(),
  endTime: z.string().optional(),
})

export type EventInput =
  | {
      title: string
      notes: string | null
      allDay: true
      startDate: LocalDate
      endDate: LocalDate
    }
  | {
      title: string
      notes: string | null
      allDay: false
      date: LocalDate
      startTime: string
      endTime: string
    }

/** Validates the event form. Mirrors the events_shape constraint. */
export const eventFormSchema = eventFormFields.transform(
  (data, ctx): EventInput => {
    const base = { title: data.title, notes: data.notes }

    if (data.allDay) {
      const end = data.endDate ? localDateSchema.safeParse(data.endDate) : null
      if (end && !end.success) {
        ctx.addIssue({
          code: "custom",
          path: ["endDate"],
          message: "Choose a valid date.",
        })
        return z.NEVER
      }
      const endDate = end?.data ?? data.date
      if (endDate < data.date) {
        ctx.addIssue({
          code: "custom",
          path: ["endDate"],
          message: "The end date can't be before the start date.",
        })
        return z.NEVER
      }
      if (daysBetween(data.date, endDate) >= 366) {
        ctx.addIssue({
          code: "custom",
          path: ["endDate"],
          message: "Events can last up to a year.",
        })
        return z.NEVER
      }
      return { ...base, allDay: true, startDate: data.date, endDate }
    }

    const start = localTimeSchema.safeParse(data.startTime)
    const end = localTimeSchema.safeParse(data.endTime)
    if (!start.success) {
      ctx.addIssue({
        code: "custom",
        path: ["startTime"],
        message: "Choose a start time.",
      })
    }
    if (!end.success) {
      ctx.addIssue({
        code: "custom",
        path: ["endTime"],
        message: "Choose an end time.",
      })
    }
    if (!start.success || !end.success) return z.NEVER
    if (end.data <= start.data) {
      ctx.addIssue({
        code: "custom",
        path: ["endTime"],
        message: "The end time must be after the start time.",
      })
      return z.NEVER
    }
    return {
      ...base,
      allDay: false,
      date: data.date,
      startTime: start.data,
      endTime: end.data,
    }
  },
)
