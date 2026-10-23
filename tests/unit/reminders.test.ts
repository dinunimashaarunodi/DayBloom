import { describe, expect, it } from "vitest"

import { vapidKeyToBytes } from "@/features/reminders/push"
import {
  pushSubscriptionSchema,
  reminderSettingsSchema,
} from "@/features/reminders/schema"

describe("vapidKeyToBytes", () => {
  it("decodes base64url (no padding, - and _) to bytes", () => {
    expect([...vapidKeyToBytes("AQID")]).toEqual([1, 2, 3])
    expect([...vapidKeyToBytes("-_8")]).toEqual([251, 255])
    // A real P-256 public key is 65 bytes, starting with 0x04.
    const key = vapidKeyToBytes(
      Buffer.concat([Buffer.from([4]), Buffer.alloc(64, 7)]).toString(
        "base64url",
      ),
    )
    expect(key).toHaveLength(65)
    expect(key[0]).toBe(4)
  })
})

describe("reminderSettingsSchema", () => {
  it("reads ticked boxes as on, missing ones as off", () => {
    expect(
      reminderSettingsSchema.parse({
        morningEnabled: "on",
        morningTime: "07:30",
        eveningTime: "21:00",
      }),
    ).toEqual({
      morning_enabled: true,
      morning_time: "07:30",
      evening_enabled: false,
      evening_time: "21:00",
    })
  })

  it("needs valid times", () => {
    expect(
      reminderSettingsSchema.safeParse({
        morningTime: "25:00",
        eveningTime: "21:00",
      }).success,
    ).toBe(false)
  })
})

describe("pushSubscriptionSchema", () => {
  const sub = {
    endpoint: "https://fcm.googleapis.com/fcm/send/abc",
    keys: { p256dh: "key", auth: "secret" },
  }

  it("accepts a browser subscription", () => {
    expect(pushSubscriptionSchema.safeParse(sub).success).toBe(true)
  })

  it("rejects non-https endpoints and missing keys", () => {
    expect(
      pushSubscriptionSchema.safeParse({
        ...sub,
        endpoint: "http://example.com/x",
      }).success,
    ).toBe(false)
    expect(
      pushSubscriptionSchema.safeParse({ endpoint: sub.endpoint, keys: {} })
        .success,
    ).toBe(false)
  })
})
