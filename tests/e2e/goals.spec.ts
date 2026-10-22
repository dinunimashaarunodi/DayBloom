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

test("set a goal, work through milestones and achieve it", async ({ page }) => {
  await page.goto("/goals")
  await expect(page.getByText("No goals in progress")).toBeVisible()

  const form = page.getByRole("region", { name: "New goal" })
  await form.getByRole("button", { name: "Create goal" }).click()
  await expect(form.getByText("Give your goal a name.")).toBeVisible()

  await form.getByRole("textbox", { name: "Goal" }).fill("Run a 10K")
  await form
    .getByRole("textbox", { name: "Why it matters (optional)" })
    .fill("To feel strong")
  await form.getByRole("button", { name: "Create goal" }).click()

  // Creating opens the goal, ready for milestones.
  await expect(
    page.getByRole("heading", { name: "Run a 10K", level: 1 }),
  ).toBeVisible()
  await expect(page.getByText("No milestones yet")).toBeVisible()

  const newMilestone = page.getByRole("textbox", { name: "New milestone" })
  for (const step of ["Run 3K", "Run 5K"]) {
    await newMilestone.fill(step)
    await page.getByRole("button", { name: "Add", exact: true }).click()
    await expect(
      page.getByRole("checkbox", { name: `Mark as done: ${step}` }),
    ).toBeVisible()
  }
  await expect(page.getByText("0 of 2 milestones done · 0%")).toBeVisible()

  await page.getByRole("checkbox", { name: "Mark as done: Run 3K" }).click()
  await expect(page.getByText("1 of 2 milestones done · 50%")).toBeVisible()

  // Today's card shows it.
  await page.goto("/today")
  const card = page.getByRole("region", { name: "Goals" })
  await expect(card).toContainText("Run a 10K")
  await expect(card).toContainText("1 of 2 milestones done")
  await card.getByRole("link", { name: /Run a 10K/ }).click()
  await expect(
    page.getByRole("heading", { name: "Run a 10K", level: 1 }),
  ).toBeVisible()

  // Finishing every milestone suggests celebrating; it's never automatic.
  await page.getByRole("checkbox", { name: "Mark as done: Run 5K" }).click()
  await expect(
    page.getByText("Every milestone is done. Ready to celebrate?"),
  ).toBeVisible()
  await page.getByRole("button", { name: "Mark as achieved" }).click()
  await expect(page.getByText("You did it!")).toBeVisible()

  await page.goto("/goals")
  await expect(
    page.getByRole("list", { name: "Achieved" }).getByRole("link"),
  ).toContainText("Run a 10K")
})

test("archive and restore a goal", async ({ page }) => {
  await page.goto("/goals")
  const form = page.getByRole("region", { name: "New goal" })
  await form.getByRole("textbox", { name: "Goal" }).fill("Learn guitar")
  await form.getByRole("button", { name: "Create goal" }).click()
  await expect(
    page.getByRole("heading", { name: "Learn guitar", level: 1 }),
  ).toBeVisible()

  await page.getByRole("button", { name: "Archive goal" }).click()
  await expect(page).toHaveURL(/\/goals$/)
  await expect(page.getByText("No goals in progress")).toBeVisible()

  await page.getByText("Archived · 1").click()
  await page
    .getByRole("list", { name: "Archived" })
    .getByRole("link", { name: /Learn guitar/ })
    .click()
  await expect(
    page.getByRole("heading", { name: "Learn guitar", level: 1 }),
  ).toBeVisible()
  await page.getByRole("button", { name: "Restore goal" }).click()
  await expect(
    page.getByRole("textbox", { name: "New milestone" }),
  ).toBeVisible()
})
