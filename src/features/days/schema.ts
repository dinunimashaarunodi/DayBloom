import { z } from "zod"

import { localDateSchema } from "@/lib/dates/local-date"

/** "" (nothing picked) becomes null; otherwise a whole number 1–5. */
const scale = z
  .string()
  .optional()
  .transform((value, ctx) => {
    if (!value) return null
    const n = Number(value)
    if (!Number.isInteger(n) || n < 1 || n > 5) {
      ctx.addIssue({ code: "custom", message: "Pick one of the options." })
      return z.NEVER
    }
    return n
  })

const text = z
  .string()
  .trim()
  .max(2000, "Keep it under 2,000 characters.")
  .optional()
  .transform((value) => value || null)

// Mirrors the CHECK constraints on public.days.
export const reviewSchema = z.object({
  date: localDateSchema,
  mood: scale,
  energy: scale,
  wins: text,
  reflection: text,
})

export const historyCursorSchema = localDateSchema.optional().catch(undefined)
