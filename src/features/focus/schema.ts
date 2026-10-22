import { z } from "zod"

export const startFocusSchema = z.object({
  label: z
    .string()
    .trim()
    .max(80, "Keep it under 80 characters.")
    .transform((label) => label || null),
  minutes: z.coerce
    .number({ error: "Choose how long to focus." })
    .int("Choose how long to focus.")
    .min(1, "Choose how long to focus.")
    .max(240, "Sessions can be up to 4 hours."),
})

export const sessionIdSchema = z.uuid()
