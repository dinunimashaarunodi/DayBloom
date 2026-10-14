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

  await appearance
    .getByRole("radio", { name: "Light", exact: true })
    .check({ force: true })
  await expect(html(page)).not.toHaveClass(/\bdark\b/)
  await page.reload()
  await expect(html(page)).not.toHaveClass(/\bdark\b/)

  await page.emulateMedia({ colorScheme: "light" })
  await appearance
    .getByRole("radio", { name: "Dark", exact: true })
    .check({ force: true })
  await expect(html(page)).toHaveClass(/\bdark\b/)
  await page.reload()
  // Applied before React loads, so there's no flash of the light theme.
  await expect(html(page)).toHaveClass(/\bdark\b/)
  await expect(
    appearance.getByRole("radio", { name: "Dark", exact: true }),
  ).toBeChecked()

  await appearance
    .getByRole("radio", { name: "System", exact: true })
    .check({ force: true })
  await expect(html(page)).not.toHaveClass(/\bdark\b/)
  await page.emulateMedia({ colorScheme: "dark" })
  await expect(html(page)).toHaveClass(/\bdark\b/)
})

test("the compact switcher in the app shell works too", async ({ page }) => {
  await page.emulateMedia({ colorScheme: "light" })
  await page
    .getByRole("radio", { name: "Dark theme" })
    .filter({ visible: true })
    .check({ force: true })
  await expect(html(page)).toHaveClass(/\bdark\b/)
})
