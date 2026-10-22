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

test("log, edit and delete a workout", async ({ page, isMobile }) => {
  // On mobile, Workouts lives under the More tab.
  const nav = page.getByRole("navigation", { name: "Main" })
  if (isMobile) {
    await nav.getByRole("link", { name: "More" }).click()
    await page
      .getByRole("list", { name: "More pages" })
      .getByRole("link", { name: /Workouts/ })
      .click()
  } else {
    await nav.getByRole("link", { name: "Workouts" }).click()
  }
  await expect(page).toHaveURL(/\/workouts$/)
  await expect(page.getByText("No workouts yet")).toBeVisible()

  const form = page.getByRole("region", { name: "Log a workout" })
  // Validation: a type and minutes are required.
  await form.getByRole("button", { name: "Log workout" }).click()
  await expect(form.getByText("Choose a type.")).toBeVisible()
  await expect(form.getByText("Enter the minutes.")).toBeVisible()

  await form.getByRole("radio", { name: "Cardio" }).check({ force: true })
  await form.getByRole("spinbutton", { name: "Minutes" }).fill("35")
  await form
    .getByRole("combobox", { name: "Effort (optional)" })
    .selectOption("Hard")
  await form.getByRole("textbox", { name: "Title (optional)" }).fill("Hill run")
  await form.getByRole("button", { name: "Log workout" }).click()
  await expect(form.getByText("Workout logged. Nice work!")).toBeVisible()

  const list = page.getByRole("list", { name: "Workouts" })
  await expect(list).toContainText("Hill run")
  await expect(list).toContainText("Cardio")
  await expect(list).toContainText("Hard")
  await expect(list).toContainText("35 min")

  const week = page.getByRole("region", { name: "This week" })
  await expect(
    week.getByRole("listitem", { name: /\(today\): worked out/ }),
  ).toBeVisible()
  await expect(week).toContainText("1 in a row")

  // Today's card.
  await page.goto("/today")
  await expect(page.getByRole("region", { name: "Workouts" })).toContainText(
    "Moved 35 min today",
  )

  // Edit.
  await page.goto("/workouts")
  await list.getByRole("link", { name: /Hill run/ }).click()
  // Wait for the edit page: until then the log form's Minutes field is showing.
  await expect(
    page.getByRole("heading", { name: "Edit workout", level: 1 }),
  ).toBeVisible()
  await page.getByRole("spinbutton", { name: "Minutes" }).fill("50")
  await page.getByRole("button", { name: "Save changes" }).click()
  await expect(page).toHaveURL(/\/workouts$/)
  await expect(list).toContainText("50 min")

  // Delete.
  await list.getByRole("link", { name: /Hill run/ }).click()
  await expect(
    page.getByRole("heading", { name: "Edit workout", level: 1 }),
  ).toBeVisible()
  page.once("dialog", (dialog) => dialog.accept())
  await page.getByRole("button", { name: "Delete workout" }).click()
  await expect(page).toHaveURL(/\/workouts$/)
  await expect(page.getByText("No workouts yet")).toBeVisible()
})
