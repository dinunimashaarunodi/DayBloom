import { describe, expect, it } from "vitest"

import { friendlyAuthError, GENERIC_AUTH_ERROR } from "@/features/auth/errors"
import {
  resetPasswordSchema,
  signInSchema,
  signUpSchema,
} from "@/features/auth/schema"
import { profileSchema } from "@/features/profile/schema"

describe("signUpSchema", () => {
  const valid = {
    email: "  Ama@Example.COM ",
    password: "bloom1234",
    timezone: "Asia/Colombo",
  }

  it("normalises email and keeps a valid timezone", () => {
    const result = signUpSchema.parse(valid)
    expect(result.email).toBe("ama@example.com")
    expect(result.timezone).toBe("Asia/Colombo")
    expect(result.displayName).toBeUndefined()
  })

  it("falls back to UTC for a missing or invalid timezone instead of failing", () => {
    expect(
      signUpSchema.parse({ ...valid, timezone: "Mars/Olympus" }).timezone,
    ).toBe("UTC")
    expect(
      signUpSchema.parse({ email: valid.email, password: valid.password })
        .timezone,
    ).toBe("UTC")
  })

  it.each([
    ["too short", "abc123"],
    ["no digit", "bloomingday"],
    ["no letter", "12345678"],
  ])("rejects a password that is %s", (_label, password) => {
    const result = signUpSchema.safeParse({ ...valid, password })
    expect(result.success).toBe(false)
  })

  it("rejects an invalid email", () => {
    expect(
      signUpSchema.safeParse({ ...valid, email: "not-an-email" }).success,
    ).toBe(false)
  })

  it("treats a blank name as no name", () => {
    expect(
      signUpSchema.parse({ ...valid, displayName: "   " }).displayName,
    ).toBeUndefined()
  })
})

describe("signInSchema", () => {
  it("requires a password but does not apply strength rules", () => {
    expect(
      signInSchema.safeParse({ email: "a@b.co", password: "x" }).success,
    ).toBe(true)
    expect(
      signInSchema.safeParse({ email: "a@b.co", password: "" }).success,
    ).toBe(false)
  })
})

describe("resetPasswordSchema", () => {
  it("reports mismatched passwords on the confirm field", () => {
    const result = resetPasswordSchema.safeParse({
      password: "bloom1234",
      confirmPassword: "bloom12345",
    })
    expect(result.success).toBe(false)
    expect(result.error?.issues[0]?.path).toEqual(["confirmPassword"])
  })
})

describe("profileSchema", () => {
  it("stores a blank name as null and validates the timezone", () => {
    expect(
      profileSchema.parse({ displayName: " ", timezone: "Europe/London" }),
    ).toEqual({
      displayName: null,
      timezone: "Europe/London",
    })
    expect(
      profileSchema.safeParse({ displayName: "Ama", timezone: "Nowhere/City" })
        .success,
    ).toBe(false)
  })
})

describe("friendlyAuthError", () => {
  it("maps known Supabase codes and falls back to a generic message", () => {
    expect(friendlyAuthError({ code: "invalid_credentials" })).toMatch(
      /don't match/,
    )
    expect(friendlyAuthError({ code: "something_new" })).toBe(
      GENERIC_AUTH_ERROR,
    )
    expect(friendlyAuthError(null)).toBe(GENERIC_AUTH_ERROR)
  })
})
