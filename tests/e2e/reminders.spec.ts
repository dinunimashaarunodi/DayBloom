import { expect, test } from "@playwright/test"

import {
  adminClient,
  createTestUser,
  deleteTestUser,
  type TestUser,
} from "../support/supabase"
import { logIn } from "./helpers"

let user: TestUser

test.beforeEach(async ({ page }) => {
  user = await createTestUser({ display_name: "Ama", timezone: "Asia/Colombo" })
  await page.goto("/login")
  await logIn(page, user.email, user.password)
  await expect(page).toHaveURL(/\/today$/)
})

test.afterEach(async () => {
  await deleteTestUser(user)
})

test("choose reminder times in Settings", async ({ page }) => {
  await page.goto("/settings")
  await expect(page.getByRole("heading", { name: "Reminders" })).toBeVisible()

  // This test browser can't receive pushes; the device section says so
  // plainly instead of offering a button that can't work.
  await expect(
    page
      .getByRole("status")
      .filter({ hasText: /device|browser|Notifications/ }),
  ).toHaveText(/Reminders are (off|on)|can't show reminders|blocked/)

  const morning = page.getByRole("checkbox", { name: "Morning plan" })
  await expect(morning).not.toBeChecked()
  await morning.check()
  await page.getByLabel("Morning plan time").fill("07:15")
  await page.getByRole("checkbox", { name: "Evening reflection" }).check()
  await page.getByLabel("Evening reflection time").fill("21:45")
  await page.getByRole("button", { name: "Save reminder times" }).click()
  await expect(page.getByText("Reminder times saved.")).toBeVisible()

  const { data } = await adminClient()
    .from("reminder_settings")
    .select("morning_enabled, morning_time, evening_enabled, evening_time")
    .eq("user_id", user.id)
    .single()
  expect(data).toEqual({
    morning_enabled: true,
    morning_time: "07:15:00",
    evening_enabled: true,
    evening_time: "21:45:00",
  })

  await page.reload()
  await expect(
    page.getByRole("checkbox", { name: "Morning plan" }),
  ).toBeChecked()
  await expect(page.getByLabel("Morning plan time")).toHaveValue("07:15")

  // Turning one off keeps its time for later.
  await page.getByRole("checkbox", { name: "Evening reflection" }).uncheck()
  await page.getByRole("button", { name: "Save reminder times" }).click()
  await expect(page.getByText("Reminder times saved.")).toBeVisible()
  await expect
    .poll(async () => {
      const { data: row } = await adminClient()
        .from("reminder_settings")
        .select("evening_enabled, evening_time")
        .eq("user_id", user.id)
        .single()
      return row
    })
    .toEqual({ evening_enabled: false, evening_time: "21:45:00" })
})
