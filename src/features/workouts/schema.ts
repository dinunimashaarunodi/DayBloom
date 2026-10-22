import { z } from "zod"

import { localDateSchema } from "@/lib/dates/local-date"

import { KINDS } from "./logic"

const optionalText = (max: number, message: string) =>
  z
    .string()
    .trim()
    .max(max, message)
    .transform((value) => value || null)

export const workoutFormSchema = z.object({
  date: localDateSchema,
  kind: z.enum(
    KINDS.map((k) => k.value),
    { error: "Choose a type." },
  ),
  title: optionalText(80, "Keep it under 80 characters."),
  duration: z.coerce
    .number({ error: "Enter the minutes." })
    .int("Use whole minutes.")
    .min(1, "Enter the minutes.")
    .max(600, "That's more than 10 hours. Check the minutes."),
  effort: z
    .enum(["", "1", "2", "3"], { error: "Choose an effort." })
    .transform((value) => (value ? Number(value) : null)),
  notes: optionalText(2000, "Keep notes under 2000 characters."),
})

export const workoutIdSchema = z.uuid()
