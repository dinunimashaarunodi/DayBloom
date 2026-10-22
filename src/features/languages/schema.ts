import { z } from "zod"

import { localDateSchema } from "@/lib/dates/local-date"

import { ACTIVITIES, LEVELS } from "./logic"

const optionalText = (max: number, message: string) =>
  z
    .string()
    .trim()
    .max(max, message)
    .transform((value) => value || null)

export const languageFormSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "Which language?")
    .max(40, "Keep it under 40 characters."),
  level: z
    .union([z.literal(""), z.enum(LEVELS)], { error: "Choose a level." })
    .transform((level) => level || null),
})

export const practiceFormSchema = z.object({
  date: localDateSchema,
  minutes: z.coerce
    .number({ error: "Enter the minutes." })
    .int("Use whole minutes.")
    .min(1, "Enter the minutes.")
    .max(600, "That's more than 10 hours. Check the minutes."),
  activity: z.enum(
    ACTIVITIES.map((a) => a.value),
    { error: "Choose what you practised." },
  ),
  notes: optionalText(500, "Keep notes under 500 characters."),
})

export const wordFormSchema = z.object({
  term: z
    .string()
    .trim()
    .min(1, "Write the word or phrase.")
    .max(100, "Keep it under 100 characters."),
  meaning: z
    .string()
    .trim()
    .min(1, "Write what it means.")
    .max(200, "Keep it under 200 characters."),
  example: optionalText(300, "Keep the example under 300 characters."),
})

export const idSchema = z.uuid()
