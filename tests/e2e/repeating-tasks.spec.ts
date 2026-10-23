import { expect, test } from "@playwright/test"

import {
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

test("create a repeating task, see today's copy, then stop it", async ({
  page,
}) => {
  await page.goto("/tasks?view=repeating")
  await expect(page.getByText("No repeating tasks yet")).toBeVisible()

  const form = page.getByRole("region", { name: "New repeating task" })
  await form.getByRole("textbox", { name: "Task" }).fill("Water the plants")
  // Validation: chosen days need at least one day.
  await form.getByRole("radio", { name: "Chosen days" }).check({ force: true })
  await form.getByRole("button", { name: "Add repeating task" }).click()
  await expect(form.getByText("Pick at least one day.")).toBeVisible()

  await form.getByRole("radio", { name: "Every day" }).check({ force: true })
  await form.getByRole("button", { name: "Add repeating task" }).click()
  const list = page.getByRole("list", { name: "Repeating tasks" })
  await expect(list).toContainText("Water the plants")
  await expect(list).toContainText("Every day · Next: Today")

  // Today's copy is an ordinary task, marked as repeating.
  await page.goto("/today")
  const today = page.getByRole("list", { name: "Today", exact: true })
  await expect(today.getByRole("listitem")).toHaveText([/Water the plants/])
  await expect(today.getByRole("img", { name: "Repeating task" })).toBeVisible()
  await page
    .getByRole("checkbox", { name: "Mark as done: Water the plants" })
    .click()
  await expect(
    page.getByRole("heading", { name: "Done today · 1" }),
  ).toBeVisible()

  // Finishing it doesn't bring back another copy today.
  await page.reload()
  await expect(page.getByText("Your day is a blank page")).toBeVisible()

  // Edit the schedule, then stop it.
  await page.goto("/tasks?view=repeating")
  await list.getByRole("link", { name: /Water the plants/ }).click()
  await expect(
    page.getByRole("heading", { name: "Water the plants", level: 1 }),
  ).toBeVisible()
  await page.getByRole("radio", { name: "Monthly" }).check({ force: true })
  await page
    .getByRole("combobox", { name: "Day of the month" })
    .selectOption("31")
  await page.getByRole("button", { name: "Save changes" }).click()
  await expect(page.getByText("Saved.")).toBeVisible()
  await page.reload()
  await expect(
    page.getByText("Monthly on the 31st (or the month's last day)"),
  ).toBeVisible()

  await page.getByRole("button", { name: "Stop repeating" }).click()
  await expect(page).toHaveURL(/view=repeating$/)
  await expect(page.getByRole("list", { name: "Stopped" })).toContainText(
    "Water the plants",
  )
})
