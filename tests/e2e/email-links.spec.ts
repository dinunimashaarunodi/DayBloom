import { randomUUID } from "node:crypto"

import { expect, test } from "@playwright/test"

import {
  adminClient,
  createTestUser,
  deleteTestUser,
} from "../support/supabase"
import { logIn } from "./helpers"

// Each test runs in a fresh browser context: the link was never requested
// from this browser, which is exactly the "opened on another device" case.

test("a signup confirmation link signs you in on any device", async ({
  page,
  baseURL,
}) => {
  const email = `daybloom-test-${randomUUID()}@example.com`
  const { data, error } = await adminClient().auth.admin.generateLink({
    type: "signup",
    email,
    password: `Bloom-${randomUUID()}-9`,
    options: {
      data: { display_name: "Kavi", timezone: "Asia/Colombo" },
      redirectTo: `${baseURL}/auth/callback?next=%2Ftoday`,
    },
  })
  if (error) throw error
  try {
    await page.goto(data.properties.action_link)
    await expect(page).toHaveURL(/\/today$/)
    await expect(page.getByRole("heading", { level: 1 })).toContainText("Kavi")
  } finally {
    await adminClient().auth.admin.deleteUser(data.user.id)
  }
})

test("a password reset link works in a different browser, and the new password logs in", async ({
  page,
  baseURL,
}) => {
  const user = await createTestUser({ timezone: "Asia/Colombo" })
  try {
    const { data, error } = await adminClient().auth.admin.generateLink({
      type: "recovery",
      email: user.email,
      options: {
        redirectTo: `${baseURL}/auth/callback?next=%2Freset-password`,
      },
    })
    if (error) throw error

    await page.goto(data.properties.action_link)
    await expect(page).toHaveURL(/\/reset-password$/)
    // The tokens never stay in the address bar.
    expect(page.url()).not.toContain("access_token")

    const newPassword = `Fresh-${randomUUID()}-7`
    await page.getByLabel("New password", { exact: true }).fill(newPassword)
    await page
      .getByLabel("Confirm new password", { exact: true })
      .fill(newPassword)
    await page.getByRole("button", { name: "Show password" }).first().click()
    await expect(
      page.getByLabel("New password", { exact: true }),
    ).toHaveAttribute("type", "text")
    await page.getByRole("button", { name: "Save new password" }).click()
    await expect(page).toHaveURL(/\/today$/)

    await page.goto("/settings")
    await page.getByRole("button", { name: "Sign out" }).last().click()
    await expect(page).toHaveURL(/\/login/)
    await logIn(page, user.email, newPassword)
    await expect(page).toHaveURL(/\/today$/)
  } finally {
    await deleteTestUser(user)
  }
})

test("an expired link explains what to do next", async ({ page }) => {
  await page.goto(
    "/auth/callback?next=%2Ftoday#error=access_denied&error_code=otp_expired&error_description=Email+link+is+invalid+or+has+expired",
  )
  await expect(
    page.getByText("That link has expired or was already used"),
  ).toBeVisible()
  await expect(
    page.getByRole("link", { name: "Get a new reset link" }),
  ).toBeVisible()
  expect(page.url()).not.toContain("error_code")
})
