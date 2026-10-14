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

export const TASK_VIEWS = ["today", "upcoming", "someday", "done"] as const
export type TaskView = (typeof TASK_VIEWS)[number]

export function parseTaskView(value: unknown): TaskView {
  return TASK_VIEWS.includes(value as TaskView) ? (value as TaskView) : "today"
}

/** Choices offered for an unfinished task from an earlier day. */
export const TASK_DECISIONS = ["today", "date", "letGo"] as const
export type TaskDecision = (typeof TASK_DECISIONS)[number]
