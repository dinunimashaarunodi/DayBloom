import { describe, expect, it } from "vitest"

import {
  HOME_PATH,
  isGuestOnlyPath,
  isPublicPath,
  safeNextPath,
} from "@/lib/auth/routes"

describe("safeNextPath", () => {
  it("keeps same-site relative paths, including query and hash", () => {
    expect(safeNextPath("/settings")).toBe("/settings")
    expect(safeNextPath("/tasks?filter=today#top")).toBe(
      "/tasks?filter=today#top",
    )
  })

  it.each([
    ["protocol-relative URL", "//evil.com"],
    ["backslash trick", "/\\evil.com"],
    ["absolute URL", "https://evil.com/today"],
    ["javascript URL", "javascript:alert(1)"],
    ["relative path without slash", "today"],
    ["empty string", ""],
  ])("rejects %s", (_label, input) => {
    expect(safeNextPath(input)).toBe(HOME_PATH)
  })

  it("rejects non-string input and honours a custom fallback", () => {
    expect(safeNextPath(null)).toBe(HOME_PATH)
    expect(safeNextPath(undefined, "/login")).toBe("/login")
  })
})

describe("route access rules", () => {
  it("treats auth pages and the landing page as guest-only", () => {
    for (const path of ["/", "/login", "/signup", "/forgot-password"]) {
      expect(isGuestOnlyPath(path)).toBe(true)
      expect(isPublicPath(path)).toBe(true)
    }
  })

  it("keeps the email-link handler public", () => {
    expect(isPublicPath("/auth/confirm")).toBe(true)
  })

  it("protects app pages, password reset, and unknown paths", () => {
    for (const path of [
      "/today",
      "/tasks",
      "/settings",
      "/reset-password",
      "/anything-else",
    ]) {
      expect(isPublicPath(path)).toBe(false)
    }
  })

  it("does not treat lookalike paths as public", () => {
    expect(isPublicPath("/login-admin")).toBe(false)
    expect(isPublicPath("/authx/confirm")).toBe(false)
  })
})
