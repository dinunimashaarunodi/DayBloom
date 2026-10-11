import { expect, it } from "vitest"

// Guards the guard: the unit tests must run in a non-UTC machine timezone
// (set in vitest.config.mts) so date code can't silently rely on it.
it("runs unit tests in the Pacific/Chatham system timezone", () => {
  expect(Intl.DateTimeFormat().resolvedOptions().timeZone).toBe(
    "Pacific/Chatham",
  )
  expect(new Date("2026-10-11T00:00:00Z").getTimezoneOffset()).toBe(-825) // UTC+13:45
})
