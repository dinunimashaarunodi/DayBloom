import { expect, test } from "@playwright/test"

import {
  adminClient,
  createTestUser,
  deleteTestUser,
  type TestUser,
} from "../support/supabase"
import { logIn } from "./helpers"

let user: TestUser

test.beforeEach(async () => {
  user = await createTestUser({ display_name: "Ama", timezone: "Asia/Colombo" })
})

test.afterEach(async () => {
  // Deleting an already-deleted user is harmless.
  await deleteTestUser(user)
})

test("delete your account from Settings", async ({ page }) => {
  await page.goto("/login")
  await logIn(page, user.email, user.password)
  await expect(page).toHaveURL(/\/today$/)

  await page.goto("/settings")
  const deleteButton = page.getByRole("button", { name: "Delete my account" })
  await expect(deleteButton).toBeDisabled()
  await page
    .getByRole("textbox", { name: "Type DELETE to confirm" })
    .fill("DELETE")
  await expect(deleteButton).toBeEnabled()
  await deleteButton.click()

  await expect(page).toHaveURL(/\/login\?notice=account-deleted$/)
  await expect(
    page.getByText("Your account and all of its data have been deleted"),
  ).toBeVisible()

  const { data } = await adminClient().auth.admin.getUserById(user.id)
  expect(data.user).toBeNull()

  // The old password no longer works.
  await logIn(page, user.email, user.password)
  await expect(
    page.getByText("That email and password don't match"),
  ).toBeVisible()
})

test("an account deleted elsewhere signs this device out cleanly", async ({
  page,
}) => {
  await page.goto("/login")
  await logIn(page, user.email, user.password)
  await expect(page).toHaveURL(/\/today$/)

  await adminClient().auth.admin.deleteUser(user.id)

  await page.goto("/settings")
  await expect(page).toHaveURL(/\/login\?notice=account-deleted$/)
  await page.goto("/today")
  await expect(page).toHaveURL(/\/login/)
})

test("the privacy page is public and responses carry security headers", async ({
  page,
}) => {
  const response = await page.goto("/privacy")
  await expect(
    page.getByRole("heading", { name: "Privacy", level: 1 }),
  ).toBeVisible()

  const headers = response!.headers()
  expect(headers["x-frame-options"]).toBe("DENY")
  expect(headers["content-security-policy"]).toContain("frame-ancestors 'none'")
  expect(headers["x-content-type-options"]).toBe("nosniff")
  expect(headers["x-powered-by"]).toBeUndefined()

  await page.goto("/login")
  await page.getByRole("link", { name: "Privacy" }).click()
  await expect(page).toHaveURL(/\/privacy$/)
})
