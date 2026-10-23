import { z } from "zod"

import { localDateSchema } from "@/lib/dates/local-date"

export const TASK_PRIORITIES = ["low", "normal", "high"] as const
export type TaskPriority = (typeof TASK_PRIORITIES)[number]

// Mirrors the CHECK constraints in the tasks migration.
const titleSchema = z
  .string()
  .trim()
  .min(1, "Give your task a name.")
  .max(200, "Keep it under 200 characters.")

/** "" from an empty date input means "no date". */
const optionalDueDate = z
  .union([z.literal(""), localDateSchema])
  .optional()
  .transform((value) => value || null)

export const createTaskSchema = z.object({
  title: titleSchema,
  dueDate: optionalDueDate,
})

export const updateTaskSchema = z.object({
  title: titleSchema,
  notes: z
    .string()
    .trim()
    .max(5000, "Keep notes under 5,000 characters.")
    .transform((value) => value || null),
  dueDate: optionalDueDate,
  priority: z.enum(TASK_PRIORITIES, "Choose a priority."),
})

export const taskIdSchema = z.uuid()
export const taskIdsSchema = z.array(taskIdSchema).max(500)

export const TASK_VIEWS = [
  "today",
  "upcoming",
  "someday",
  "repeating",
  "done",
] as const
export type TaskView = (typeof TASK_VIEWS)[number]

export function parseTaskView(value: unknown): TaskView {
  return TASK_VIEWS.includes(value as TaskView) ? (value as TaskView) : "today"
}

/** Choices offered for an unfinished task from an earlier day. */
export const TASK_DECISIONS = ["today", "date", "letGo"] as const
export type TaskDecision = (typeof TASK_DECISIONS)[number]

// ---------------------------------------------------------------------------
// Repeating tasks
// ---------------------------------------------------------------------------

export const REPEAT_KINDS = ["daily", "weekdays", "days", "monthly"] as const
export type RepeatKind = (typeof REPEAT_KINDS)[number]

/**
 * The repeating-task form. `days` ("0" = Monday … "6" = Sunday) is used with
 * kind "days"; `monthDay` with "monthly". Produces the stored rule.
 */
export const seriesFormSchema = z
  .object({
    title: titleSchema,
    notes: z
      .string()
      .trim()
      .max(5000, "Keep notes under 5,000 characters.")
      .transform((value) => value || null),
    priority: z.enum(TASK_PRIORITIES, "Choose a priority."),
    kind: z.enum(REPEAT_KINDS, "Choose how often it repeats."),
    days: z.array(z.enum(["0", "1", "2", "3", "4", "5", "6"])),
    monthDay: z.string(),
    startsOn: localDateSchema,
    endsOn: optionalDueDate,
  })
  .superRefine((value, ctx) => {
    if (value.kind === "days" && value.days.length === 0) {
      ctx.addIssue({
        code: "custom",
        path: ["days"],
        message: "Pick at least one day.",
      })
    }
    if (
      value.kind === "monthly" &&
      !/^([1-9]|[12]\d|3[01])$/.test(value.monthDay)
    ) {
      ctx.addIssue({
        code: "custom",
        path: ["monthDay"],
        message: "Choose a day from 1 to 31.",
      })
    }
    if (value.endsOn && value.endsOn < value.startsOn) {
      ctx.addIssue({
        code: "custom",
        path: ["endsOn"],
        message: "End on or after the start date.",
      })
    }
  })
  .transform(({ kind, days, monthDay, startsOn, endsOn, ...rest }) => ({
    ...rest,
    starts_on: startsOn,
    ends_on: endsOn,
    days_mask:
      kind === "daily"
        ? 0b1111111
        : kind === "weekdays"
          ? 0b0011111
          : kind === "days"
            ? days.reduce((mask, day) => mask | (1 << Number(day)), 0)
            : null,
    month_day: kind === "monthly" ? Number(monthDay) : null,
  }))

export const seriesIdSchema = z.uuid()
