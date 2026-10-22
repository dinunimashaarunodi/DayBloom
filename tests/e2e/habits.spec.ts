import { expect, test, type Page } from "@playwright/test"

import { addDays, todayIn } from "@/lib/dates/local-date"

import {
  adminClient,
  createTestUser,
  deleteTestUser,
  type TestUser,
} from "../support/supabase"
import { logIn } from "./helpers"

const TZ = "Asia/Colombo"
let user: TestUser

test.beforeEach(async ({ page }) => {
  user = await createTestUser({ display_name: "Ama", timezone: TZ })
  await page.goto("/login")
  await logIn(page, user.email, user.password)
  await expect(page).toHaveURL(/\/today$/)
})

test.afterEach(async () => {
  await deleteTestUser(user)
})

const todayButton = (page: Page, habit: string) =>
  page.getByRole("button", { name: new RegExp(`^${habit}, .* \\(today\\)`) })

async function addHabit(page: Page, name: string) {
  await page.goto("/habits")
  const form = page.getByRole("region", { name: "New habit" })
  await form.getByRole("textbox", { name: "Habit" }).fill(name)
  await form.getByRole("button", { name: "Add habit" }).click()
  await expect(page.getByRole("link", { name })).toBeVisible()
}

test("create a habit and check in for today", async ({ page }) => {
  await page.goto("/habits")
  await expect(page.getByText("No habits yet")).toBeVisible()

  // Validation: a name is required.
  await page
    .getByRole("region", { name: "New habit" })
    .getByRole("button", { name: "Add habit" })
    .click()
  await expect(page.getByText("Give your habit a name.")).toBeVisible()

  await addHabit(page, "Read")
  await expect(page.getByRole("list", { name: "Habits" })).toContainText(
    "Every day",
  )

  const today = todayButton(page, "Read")
  await expect(today).toHaveAttribute("aria-pressed", "false")
  await today.click()
  await expect(today).toHaveAttribute("aria-pressed", "true")
  await expect(page.getByText("1-day streak")).toBeVisible()

  await page.reload()
  await expect(todayButton(page, "Read")).toHaveAttribute(
    "aria-pressed",
    "true",
  )

  // Unticking is a correction and is allowed.
  await todayButton(page, "Read").click()
  await expect(todayButton(page, "Read")).toHaveAttribute(
    "aria-pressed",
    "false",
  )
})

test("streaks build from past check-ins and today's card", async ({ page }) => {
  const today = todayIn(TZ, new Date())
  const admin = adminClient()
  const { data: habit } = await admin
    .from("habits")
    .insert({
      user_id: user.id,
      name: "Stretch",
      created_at: new Date(Date.now() - 10 * 86_400_000).toISOString(),
    })
    .select("id")
    .single()
  await admin.from("habit_logs").insert([
    { user_id: user.id, habit_id: habit!.id, local_date: addDays(today, -2) },
    { user_id: user.id, habit_id: habit!.id, local_date: addDays(today, -1) },
  ])

  await page.reload()
  const card = page.getByRole("region", { name: "Habits" })
  await expect(card).toContainText("0 of 1 done today")
  // Today isn't over, so the streak isn't broken yet.
  await expect(card).toContainText("2-day streak")

  await todayButton(page, "Stretch").click()
  await expect(card).toContainText("1 of 1 done today")
  await expect(card).toContainText("3-day streak")

  await page.goto(`/habits/${habit!.id}`)
  await expect(
    page.getByRole("heading", { name: "Stretch", level: 1 }),
  ).toBeVisible()
  await expect(page.getByText("Current streak")).toBeVisible()
  await expect(page.getByText("3 days").first()).toBeVisible()
})

test("edit a habit's days, then archive it", async ({ page }) => {
  await addHabit(page, "Gym")
  await page.getByRole("link", { name: "Gym" }).click()
  await expect(
    page.getByRole("heading", { name: "Gym", level: 1 }),
  ).toBeVisible()

  const edit = page.getByRole("region", { name: "Edit habit" })
  await edit.getByRole("checkbox", { name: "Sat" }).uncheck({ force: true })
  await edit.getByRole("checkbox", { name: "Sun" }).uncheck({ force: true })
  await edit.getByRole("button", { name: "Save changes" }).click()
  await expect(edit.getByText("Saved.")).toBeVisible()
  await page.reload()
  await expect(page.getByText("Weekdays").first()).toBeVisible()

  await page.getByRole("button", { name: "Archive habit" }).click()
  await expect(page).toHaveURL(/\/habits$/)
  await expect(page.getByText("No habits yet")).toBeVisible()
})
