import { expect, test, type Page } from "@playwright/test"

import { createTestUser, deleteTestUser, type TestUser } from "../support/supabase"

let user: TestUser

test.beforeEach(async () => {
  user = await createTestUser({ display_name: "Ama", timezone: "Asia/Colombo" })
})

test.afterEach(async () => {
  await deleteTestUser(user)
})

async function logIn(page: Page, email = user.email, password = user.password) {
  await page.getByLabel("Email").fill(email)
  await page.getByLabel("Password", { exact: true }).fill(password)
  await page.getByRole("button", { name: "Log in" }).click()
}

test("signed-out visitors are sent to log in, then back where they were going", async ({ page }) => {
  await page.goto("/settings")
  await expect(page).toHaveURL(/\/login\?next=%2Fsettings$/)

  await logIn(page)
  await expect(page).toHaveURL(/\/settings$/)
  await expect(page.getByRole("heading", { name: "Settings" })).toBeVisible()
})

test("wrong password shows a friendly error", async ({ page }) => {
  await page.goto("/login")
  await logIn(page, user.email, "wrong-password-1")
  await expect(page.getByText("That email and password don't match")).toBeVisible()
  await expect(page.getByLabel("Email")).toHaveValue(user.email)
})

test("signup validates fields before contacting the server", async ({ page }) => {
  await page.goto("/signup")
  await page.getByLabel("Email").fill("not-an-email")
  await page.getByLabel("Password").fill("short")
  await page.getByRole("button", { name: "Create account" }).click()
  await expect(page.getByText("Enter a valid email address.")).toBeVisible()
  await expect(page.getByText("Use at least 8 characters.")).toBeVisible()
})

test("happy path: log in, see today, update profile, sign out", async ({ page, isMobile }) => {
  await page.goto("/login")
  await logIn(page)

  await expect(page).toHaveURL(/\/today$/)
  await expect(page.getByRole("heading", { level: 1 })).toContainText("Ama")

  // Signed-in users skip the guest pages.
  await page.goto("/login")
  await expect(page).toHaveURL(/\/today$/)

  // Navigate with the visible nav (sidebar on desktop, bottom tabs on mobile).
  await page.getByRole("navigation", { name: "Main" }).getByRole("link", { name: "Settings" }).click()
  await expect(page).toHaveURL(/\/settings$/)

  await page.getByLabel("Name").fill("Ama Perera")
  await expect(page.getByLabel("Timezone")).toHaveValue("Asia/Colombo")
  await page.getByRole("button", { name: "Save changes" }).click()
  await expect(page.getByText("Saved.")).toBeVisible()

  await page.goto("/today")
  await expect(page.getByRole("heading", { level: 1 })).toContainText("Ama Perera")

  // No horizontal scrolling at phone width.
  if (isMobile) {
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)
    expect(overflow).toBeLessThanOrEqual(0)
  }

  await page.goto("/settings")
  await page.getByRole("button", { name: "Sign out" }).last().click()
  await expect(page).toHaveURL(/\/login\?notice=signed-out$/)
  await expect(page.getByText("You've been signed out")).toBeVisible()

  await page.goto("/today")
  await expect(page).toHaveURL(/\/login/)
})
