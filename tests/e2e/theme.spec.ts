import { expect, test } from "@playwright/test"

import {
  createTestUser,
  deleteTestUser,
  type TestUser,
} from "../support/supabase"
import { logIn } from "./helpers"

let user: TestUser

test.beforeEach(async ({ page }) => {
  user = await createTestUser({ timezone: "Asia/Colombo" })
  await page.goto("/login")
  await logIn(page, user.email, user.password)
  await expect(page).toHaveURL(/\/today$/)
})

test.afterEach(async () => {
  await deleteTestUser(user)
})

const html = (page: import("@playwright/test").Page) => page.locator("html")

test("choose light, dark or system; the choice survives a reload", async ({
  page,
}) => {
  // The device prefers dark, so "System" starts dark.
  await page.emulateMedia({ colorScheme: "dark" })
  await page.goto("/settings")
  const appearance = page.getByRole("radiogroup", { name: "Theme" }).filter({
    has: page.getByRole("radio", { name: "Dark", exact: true }),
  })
  await expect(html(page)).toHaveClass(/\bdark\b/)

  // Retries until the choice sticks: a click that lands while React is still
  // taking over the page is undone.
  const choose = (name: string) =>
    expect(async () => {
      const radio = appearance.getByRole("radio", { name, exact: true })
      await radio.check({ force: true, timeout: 2_000 })
      await expect(radio).toBeChecked({ timeout: 1_000 })
    }).toPass()

  await choose("Light")
  await expect(html(page)).not.toHaveClass(/\bdark\b/)
  await page.reload()
  await expect(html(page)).not.toHaveClass(/\bdark\b/)
  await expect(
    appearance.getByRole("radio", { name: "Light", exact: true }),
  ).toBeChecked()

  await page.emulateMedia({ colorScheme: "light" })
  await choose("Dark")
  await expect(html(page)).toHaveClass(/\bdark\b/)
  await page.reload()
  // Applied before React loads, so there's no flash of the light theme.
  await expect(html(page)).toHaveClass(/\bdark\b/)
  await expect(
    appearance.getByRole("radio", { name: "Dark", exact: true }),
  ).toBeChecked()

  await choose("System")
  await expect(html(page)).not.toHaveClass(/\bdark\b/)
  await page.emulateMedia({ colorScheme: "dark" })
  await expect(html(page)).toHaveClass(/\bdark\b/)
})

test("the compact switcher in the app shell works too", async ({ page }) => {
  await page.emulateMedia({ colorScheme: "light" })
  // Retries like choose() above, for the same reason.
  await expect(async () => {
    await page
      .getByRole("radio", { name: "Dark theme" })
      .filter({ visible: true })
      .check({ force: true, timeout: 2_000 })
    await expect(html(page)).toHaveClass(/\bdark\b/, { timeout: 1_000 })
  }).toPass()
})
