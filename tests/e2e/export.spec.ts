import { readFile } from "node:fs/promises"

import { expect, test, type Page } from "@playwright/test"

import { todayIn } from "@/lib/dates/local-date"

import {
  adminClient,
  createTestUser,
  deleteTestUser,
  type TestUser,
} from "../support/supabase"
import { logIn } from "./helpers"

const TZ = "Asia/Colombo"
let user: TestUser
let other: TestUser

test.beforeEach(async ({ page }) => {
  ;[user, other] = await Promise.all([
    createTestUser({ display_name: "Ama", timezone: TZ }),
    createTestUser({ display_name: "Kavi", timezone: TZ }),
  ])
  const admin = adminClient()
  const today = todayIn(TZ, new Date())
  const seeded = await Promise.all([
    admin.from("tasks").insert([
      { user_id: user.id, title: "Buy milk, eggs", due_date: today },
      { user_id: other.id, title: "Someone else's secret", due_date: today },
    ]),
    admin.from("journal_entries").insert({
      user_id: user.id,
      local_date: today,
      title: "=1+1",
      body: "A calm day.",
    }),
  ])
  for (const { error } of seeded) expect(error).toBeNull()

  await page.goto("/login")
  await logIn(page, user.email, user.password)
  await expect(page).toHaveURL(/\/today$/)
})

test.afterEach(async () => {
  await Promise.all([deleteTestUser(user), deleteTestUser(other)])
})

async function download(page: Page, name: RegExp) {
  const [file] = await Promise.all([
    page.waitForEvent("download"),
    page.getByRole("main").getByRole("link", { name }).click(),
  ])
  return {
    name: file.suggestedFilename(),
    body: await readFile((await file.path())!, "utf8"),
  }
}

test("download all data as JSON and parts as CSV", async ({ page }) => {
  await page.goto("/settings")
  await expect(page.getByRole("heading", { name: "Your data" })).toBeVisible()

  const json = await download(page, /Download everything/)
  expect(json.name).toMatch(/^daybloom-export-\d{4}-\d{2}-\d{2}\.json$/)
  const data = JSON.parse(json.body)
  expect(data.account.email).toBe(user.email)
  expect(data.tables.tasks.map((t: { title: string }) => t.title)).toEqual([
    "Buy milk, eggs",
  ])
  expect(data.tables.profiles[0].display_name).toBe("Ama")
  // Only the user's own rows, without the owner column.
  expect(json.body).not.toContain("Someone else's secret")
  expect(data.tables.tasks[0]).not.toHaveProperty("user_id")

  const tasks = await download(page, /^Tasks$/)
  expect(tasks.name).toMatch(/^daybloom-tasks-.*\.csv$/)
  expect(tasks.body).toContain('"Buy milk, eggs"')
  expect(tasks.body).not.toContain("Someone else's secret")

  const journal = await download(page, /^Journal entries$/)
  // Formula-like text is neutralised for spreadsheets.
  expect(journal.body).toContain("'=1+1")
})

test("signed-out visitors can't download anything", async ({ page }) => {
  await page.context().clearCookies()
  const response = await page.request.get("/export", { maxRedirects: 0 })
  expect(response.status()).toBe(307)
  expect(response.headers().location).toMatch(/\/login/)
})
