import { z } from "zod"

import { localTimeSchema } from "@/lib/dates/local-date"

/** A checkbox submits "on" when ticked and nothing when not. */
const checkbox = z
  .string()
  .optional()
  .transform((value) => value === "on")

export const reminderSettingsSchema = z
  .object({
    morningEnabled: checkbox,
    morningTime: localTimeSchema,
    eveningEnabled: checkbox,
    eveningTime: localTimeSchema,
  })
  .transform((v) => ({
    morning_enabled: v.morningEnabled,
    morning_time: v.morningTime,
    evening_enabled: v.eveningEnabled,
    evening_time: v.eveningTime,
  }))

/** A browser's push subscription, as PushSubscription.toJSON() gives it. */
export const pushSubscriptionSchema = z.object({
  endpoint: z.url({ protocol: /^https$/ }).max(1000),
  keys: z.object({
    p256dh: z.string().min(1).max(200),
    auth: z.string().min(1).max(100),
  }),
})
