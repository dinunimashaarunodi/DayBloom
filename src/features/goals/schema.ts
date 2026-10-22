import { z } from "zod"

import { localDateSchema } from "@/lib/dates/local-date"

export const goalFormSchema = z.object({
  title: z
    .string()
    .trim()
    .min(1, "Give your goal a name.")
    .max(100, "Keep it under 100 characters."),
  why: z
    .string()
    .trim()
    .max(1000, "Keep it under 1000 characters.")
    .transform((why) => why || null),
  target: z.union([z.literal("").transform(() => null), localDateSchema]),
})

export const milestoneTitleSchema = z
  .string()
  .trim()
  .min(1, "Write the milestone first.")
  .max(100, "Keep it under 100 characters.")

export const goalStatusSchema = z.enum(["active", "achieved", "archived"])

export const idSchema = z.uuid()
