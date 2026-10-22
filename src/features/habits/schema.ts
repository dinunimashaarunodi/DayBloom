import { z } from "zod"

import { localDateSchema } from "@/lib/dates/local-date"

/** Form fields: a name and the checked weekdays ("0" = Monday … "6" = Sunday). */
export const habitFormSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "Give your habit a name.")
    .max(60, "Keep it under 60 characters."),
  days: z
    .array(z.enum(["0", "1", "2", "3", "4", "5", "6"]))
    .min(1, "Pick at least one day.")
    .transform((days) =>
      days.reduce((mask, day) => mask | (1 << Number(day)), 0),
    ),
})

export const habitIdSchema = z.uuid()

export const checkInSchema = z.object({
  habitId: habitIdSchema,
  date: localDateSchema,
  done: z.boolean(),
})
