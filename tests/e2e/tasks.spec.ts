import { expect, test, type Page } from "@playwright/test"

import { addDays, todayIn } from "@/lib/dates/local-date"

import {
  adminClient,
  createTestUser,
  deleteTestUser,
  signedInClient,
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

/** Inserts tasks directly as the test user (for setting up past dates). */
async function seedTasks(tasks: { title: string; due_date: string | null }[]) {
  const client = await signedInClient(user)
  const { error } = await client.from("tasks").insert(tasks)
  if (error) throw error
}

/**
 * Waits until the database shows the task in the expected state. Uses the
 * admin client so polling doesn't count against Supabase's sign-in rate limit.
 */
async function waitForTask(
  title: string,
  expected: { due_date?: string; status?: string },
) {
  await expect
    .poll(async () => {
      const { data } = await adminClient()
        .from("tasks")
        .select("due_date, status")
        .eq("user_id", user.id)
        .eq("title", title)
        .single()
      return data
    })
    .toMatchObject(expected)
}

const list = (page: Page, name: string) =>
  page.getByRole("list", { name, exact: true })

async function addTask(page: Page, title: string) {
  await page.getByRole("textbox", { name: "New task" }).fill(title)
  await page.getByRole("button", { name: "Add" }).click()
  await expect(page.getByRole("textbox", { name: "New task" })).toHaveValue("")
}

test("plan today: add, reorder, complete", async ({ page }) => {
  await expect(page.getByText("Your day is a blank page")).toBeVisible()

  // Validation happens before anything is saved.
  await page.getByRole("button", { name: "Add" }).click()
  await expect(page.getByText("Give your task a name.")).toBeVisible()

  await addTask(page, "Buy milk")
  await addTask(page, "Call mum")
  const today = list(page, "Today")
  await expect(today.getByRole("listitem")).toHaveText([/Buy milk/, /Call mum/])

  await page.getByRole("button", { name: "Move up: Call mum" }).click()
  await expect(today.getByRole("listitem")).toHaveText([/Call mum/, /Buy milk/])
  await page.reload()
  await expect(today.getByRole("listitem")).toHaveText([/Call mum/, /Buy milk/])

  await page.getByRole("checkbox", { name: "Mark as done: Buy milk" }).click()
  await expect(
    page.getByRole("heading", { name: "Done today · 1" }),
  ).toBeVisible()
  await expect(list(page, "Done today").getByRole("listitem")).toHaveText([
    /Buy milk/,
  ])
  await expect(today.getByRole("listitem")).toHaveText([/Call mum/])

  await page.reload()
  await expect(list(page, "Done today").getByRole("listitem")).toHaveText([
    /Buy milk/,
  ])
})

test("unfinished tasks wait for a decision: today, a new date, or let go", async ({
  page,
}) => {
  const today = todayIn(TZ, new Date())
  await seedTasks([
    { title: "Return library book", due_date: addDays(today, -1) },
    { title: "Renew passport", due_date: addDays(today, -4) },
    { title: "Learn the banjo", due_date: addDays(today, -2) },
  ])
  await page.reload()

  // Nothing was moved automatically: all three wait in the card.
  await expect(
    page.getByRole("heading", {
      name: "3 tasks from earlier days weren't finished",
    }),
  ).toBeVisible()
  const card = list(page, "Needs a decision")
  await expect(card.getByRole("listitem")).toHaveText([
    /Renew passport.*4 days ago/,
    /Learn the banjo.*2 days ago/,
    /Return library book.*Yesterday/,
  ])

  await page
    .getByRole("group", { name: "Decide: Return library book" })
    .getByRole("button", { name: "Do it today" })
    .click()
  await expect(list(page, "Today").getByRole("listitem")).toHaveText([
    /Return library book/,
  ])

  await page
    .getByRole("group", { name: "Decide: Renew passport" })
    .getByRole("button", { name: "Choose a date" })
    .click()
  await page.getByLabel("New date for Renew passport").fill(addDays(today, 3))
  await page.getByRole("button", { name: "Save date" }).click()
  // Buttons are disabled while a decision saves; wait for it to be saved.
  await waitForTask("Renew passport", { due_date: addDays(today, 3) })

  await page
    .getByRole("group", { name: "Decide: Learn the banjo" })
    .getByRole("button", { name: "Let it go" })
    .click()
  await expect(
    page.getByRole("heading", { name: /weren't finished|wasn't finished/ }),
  ).toHaveCount(0)
  await waitForTask("Learn the banjo", { status: "dropped" })

  await page.reload()
  await expect(
    page.getByRole("heading", { name: /weren't finished|wasn't finished/ }),
  ).toHaveCount(0)
  await page.goto("/tasks?view=upcoming")
  await expect(list(page, "upcoming tasks").getByRole("listitem")).toHaveText([
    /Renew passport/,
  ])
})

test("postponing twice shows a gentle warning; letting go removes the task", async ({
  page,
}) => {
  const today = todayIn(TZ, new Date())
  await seedTasks([{ title: "Clean garage", due_date: today }])
  await page.reload()

  await page.getByRole("link", { name: "Clean garage" }).click()
  await expect(page.getByRole("heading", { name: "Edit task" })).toBeVisible()

  for (const days of [1, 2]) {
    await page.getByLabel("Date").fill(addDays(today, days))
    await page.getByRole("button", { name: "Save changes" }).click()
    await expect(page.getByText("Saved.")).toBeVisible()
    // "Saved." stays visible from the first save, so confirm each save landed.
    await waitForTask("Clean garage", { due_date: addDays(today, days) })
  }

  await page.reload()
  await expect(
    page.getByText("Moved 2 times. Would a smaller first step help"),
  ).toBeVisible()

  await page.getByRole("button", { name: "Let it go" }).click()
  await expect(page).toHaveURL(/\/today$/)
  await page.goto("/tasks?view=upcoming")
  await expect(page.getByText("Clean garage")).toHaveCount(0)
})

test("task lists: undated tasks and deleting", async ({ page }) => {
  await page
    .getByRole("navigation", { name: "Main" })
    .getByRole("link", { name: "Tasks" })
    .click()
  await page.getByRole("link", { name: "No date" }).click()
  await expect(page).toHaveURL(/view=someday/)
  await expect(page.getByText("No undated tasks")).toBeVisible()

  await addTask(page, "Learn to juggle")
  await expect(list(page, "someday tasks").getByRole("listitem")).toHaveText([
    /Learn to juggle/,
  ])

  await page.getByRole("link", { name: "Learn to juggle" }).click()
  page.once("dialog", (dialog) => dialog.accept())
  await page.getByRole("button", { name: "Delete" }).click()
  await expect(page).toHaveURL(/\/tasks$/)
  await page.goto("/tasks?view=someday")
  await expect(page.getByText("No undated tasks")).toBeVisible()
})
