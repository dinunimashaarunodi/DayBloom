import { z } from "zod"

import { isValidTimeZone } from "@/lib/dates/timezone"

export const profileSchema = z.object({
  displayName: z
    .string()
    .trim()
    .max(80, "Use 80 characters or fewer.")
    .transform((value) => value || null),
  timezone: z.string().refine(isValidTimeZone, "Choose a timezone from the list."),
})

export type ProfileInput = z.infer<typeof profileSchema>
