import { expect, test } from "@playwright/test"

import {
  createTestUser,
  deleteTestUser,
  type TestUser,
} from "../support/supabase"
import { logIn } from "./helpers"

const PUBLIC_PAGES = ["/", "/login", "/signup", "/privacy"]
const APP_PAGES = [
  "/today",
  "/tasks",
  "/habits",
  "/calendar",
  "/finance",
  "/focus",
  "/workouts",
  "/goals",
  "/languages",
  "/achievements",
  "/journal",
  "/journal/new",
  "/history",
  "/settings",
  "/more",
]

/**
 * On phones, content wider than the screen makes the browser zoom the whole
 * page out (and comparing scrollWidth with clientWidth doesn't catch it, as
 * both grow). So compare the layout width with the device's screen width.
 */
async function expectFitsScreen(page: import("@playwright/test").Page) {
  const [layout, screen] = await page.evaluate(() => [
    document.documentElement.clientWidth,
    window.screen.width,
  ])
  expect(layout, `layout width on ${page.url()}`).toBeLessThanOrEqual(screen)
}

test.describe("phone layout", () => {
  test.skip(({ isMobile }) => !isMobile, "Phone widths only")
  test.setTimeout(180_000)

  let user: TestUser
  test.afterEach(async () => {
    if (user) await deleteTestUser(user)
  })

  test("every page fits the screen, with no sideways scrolling", async ({
    page,
  }) => {
    for (const path of PUBLIC_PAGES) {
      await page.goto(path)
      await expectFitsScreen(page)
    }
    user = await createTestUser({ display_name: "Ama", timezone: "UTC" })
    await page.goto("/login")
    await logIn(page, user.email, user.password)
    await expect(page).toHaveURL(/\/today$/)
    for (const path of APP_PAGES) {
      await page.goto(path)
      await page.waitForLoadState("networkidle")
      await expectFitsScreen(page)
    }
  })
})
