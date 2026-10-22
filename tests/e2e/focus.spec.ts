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
  // A controllable browser clock (it runs normally until fast-forwarded).
  await page.clock.install()
  await page.goto("/login")
  await logIn(page, user.email, user.password)
  await expect(page).toHaveURL(/\/today$/)
})

test.afterEach(async () => {
  await deleteTestUser(user)
})

async function startSession(
  page: import("@playwright/test").Page,
  label: string,
  length: string,
) {
  await page.goto("/focus")
  await page
    .getByRole("textbox", { name: "What are you focusing on? (optional)" })
    .fill(label)
  await page.getByRole("radio", { name: length }).check({ force: true })
  await page.getByRole("button", { name: "Start focus" }).click()
  await expect(page.getByRole("progressbar")).toBeVisible()
}

test("start a session, see it on Today, end it early", async ({ page }) => {
  await page.goto("/focus")
  await expect(page.getByText("No sessions yet")).toBeVisible()

  await startSession(page, "Essay draft", "15 min")
  await expect(page.getByLabel(/^1[45]:\d\d left$/)).toBeVisible()

  // Reloading keeps the same countdown (it comes from the stored start time).
  await page.reload()
  await expect(page.getByLabel(/^1[45]:\d\d left$/)).toBeVisible()

  await page.goto("/today")
  const card = page.getByRole("region", { name: "Focus" })
  await expect(card).toContainText("Essay draft")
  await expect(card).toContainText("In progress")

  await card.getByRole("link", { name: "Open timer" }).click()
  await page.getByRole("button", { name: "End session" }).click()
  await expect(page.getByRole("button", { name: "Start focus" })).toBeVisible()

  const list = page.getByRole("list", { name: "Today's sessions" })
  await expect(list).toContainText("Essay draft")
  await expect(list).toContainText("ended early (planned 15 min)")

  page.once("dialog", (dialog) => dialog.accept())
  await list
    .getByRole("button", { name: "Delete session: Essay draft" })
    .click()
  await expect(page.getByText("No sessions yet")).toBeVisible()
})

test("the countdown finishes on its own", async ({ page }) => {
  await startSession(page, "Reading", "25 min")
  await page.clock.fastForward("25:00")
  await expect(page.getByRole("status")).toContainText("Session complete")
  await expect(page.getByRole("button", { name: "End session" })).toHaveCount(0)
  await expect(
    page.getByRole("button", { name: "Start another session" }),
  ).toBeVisible()
})
