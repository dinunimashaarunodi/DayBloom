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

test("finishing a first task unlocks an achievement, celebrated once", async ({
  page,
}) => {
  const card = page.getByRole("region", { name: "Achievements" })
  await expect(card).toContainText("0 of 19 unlocked")
  await expect(card).toContainText("Next up:")

  await adminClient()
    .from("tasks")
    .insert({ user_id: user.id, title: "Water the plants", status: "done" })
  await page.reload()
  await expect(card).toContainText("New: First step")
  await expect(card).toContainText("1 of 19 unlocked")

  await card.getByRole("link", { name: "Celebrate" }).click()
  await expect(
    page.getByRole("heading", { name: "Achievements", level: 1 }),
  ).toBeVisible()
  const fresh = page.getByRole("list", { name: "New achievements" })
  await expect(fresh).toContainText("First step")
  await expect(fresh).toContainText("New")
  // The celebration stays while the page is open (marking it seen in the
  // background must not re-render the page).
  await page.waitForTimeout(2_000)
  await expect(fresh).toContainText("First step")
  // Locked ones show their progress.
  await expect(
    page.getByRole("progressbar", { name: "Getting things done progress" }),
  ).toHaveAttribute("aria-valuetext", "1 of 25")

  // Seen now: next time it's simply unlocked.
  await expect(async () => {
    await page.reload()
    await expect(
      page.getByRole("list", { name: "Unlocked achievements" }),
    ).toContainText("First step", { timeout: 1_000 })
  }).toPass()
  await expect(
    page.getByRole("list", { name: "New achievements" }),
  ).toHaveCount(0)
})
