import { z } from "zod"

import { localDateSchema } from "@/lib/dates/local-date"

import { BODY_MAX, TITLE_MAX } from "./logic"

export const journalEntrySchema = z.object({
  date: localDateSchema,
  title: z
    .string()
    .trim()
    .max(TITLE_MAX, `Keep the title under ${TITLE_MAX} characters.`)
    .transform((title) => title || null),
  body: z
    .string()
    .trim()
    .min(1, "Write a few words first.")
    .max(BODY_MAX, "That's too long for one entry. Try splitting it in two."),
})

export const entryIdSchema = z.uuid()

/** The search box: blank means no search. */
export const searchQuerySchema = z
  .string()
  .trim()
  .max(100)
  .catch("")
  .transform((q) => q || null)
