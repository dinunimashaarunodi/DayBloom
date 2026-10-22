import { expect, test } from "@playwright/test"

import { addDays, formatLocalDate, todayIn } from "@/lib/dates/local-date"

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

test("write, read, edit, search and delete an entry", async ({ page }) => {
  await page.goto("/journal")
  await expect(page.getByText("Your journal is empty")).toBeVisible()
  await page.getByRole("link", { name: "Write your first entry" }).click()
  await expect(page).toHaveURL(/\/journal\/new$/)

  // Validation: the entry needs some text.
  await page.getByRole("button", { name: "Save entry" }).click()
  await expect(page.getByText("Write a few words first.")).toBeVisible()

  await page
    .getByRole("textbox", { name: "Title (optional)" })
    .fill("Rainy Sunday")
  await page
    .getByRole("textbox", { name: "Entry" })
    .fill("Stayed in with tea.\nRead two chapters.")
  await page.getByRole("button", { name: "Save entry" }).click()

  // Saving opens the entry for reading.
  await expect(page).toHaveURL(/\/journal\/[0-9a-f-]{36}$/)
  await expect(
    page.getByRole("heading", { name: "Rainy Sunday", level: 1 }),
  ).toBeVisible()
  await expect(page.getByRole("article")).toContainText("Read two chapters.")
  await expect(page.getByText("7 words")).toBeVisible()

  await page.getByRole("link", { name: "Edit" }).click()
  await page.getByRole("textbox", { name: "Title (optional)" }).fill("")
  await page.getByRole("button", { name: "Save changes" }).click()
  // Without a title, the first line becomes the heading.
  await expect(
    page.getByRole("heading", { name: "Stayed in with tea.", level: 1 }),
  ).toBeVisible()

  // Today's card lists it.
  await page.goto("/today")
  const card = page.getByRole("region", { name: "Journal" })
  await expect(card).toContainText("1 entry today")
  await expect(
    card.getByRole("link", { name: "Stayed in with tea." }),
  ).toBeVisible()

  // Search.
  await page.goto("/journal")
  const search = page.getByRole("searchbox", { name: "Search your entries" })
  await search.fill("chapters")
  await search.press("Enter")
  await expect(page.getByRole("status")).toContainText("1 entry matches")
  await search.fill("bicycle")
  await search.press("Enter")
  await expect(page.getByText("Nothing found")).toBeVisible()

  // Delete (after confirming).
  await page.getByRole("link", { name: "Clear search" }).click()
  await page.getByRole("link", { name: /Stayed in with tea/ }).click()
  await page.getByRole("link", { name: "Edit" }).click()
  page.once("dialog", (dialog) => dialog.accept())
  await page.getByRole("button", { name: "Delete entry" }).click()
  await expect(page).toHaveURL(/\/journal$/)
  await expect(page.getByText("Your journal is empty")).toBeVisible()
})

test("past days show their entries in History", async ({ page }) => {
  const day = addDays(todayIn(TZ, new Date()), -3)
  await adminClient().from("journal_entries").insert({
    user_id: user.id,
    local_date: day,
    title: "Beach day",
    body: "Swam twice.",
  })

  await page.goto(`/history/${day}`)
  const journal = page.getByRole("region", { name: "Journal" })
  await expect(journal.getByRole("link", { name: /Beach day/ })).toBeVisible()

  // Writing about that day preselects it.
  await journal.getByRole("link", { name: "Write about this day" }).click()
  await expect(page).toHaveURL(new RegExp(`/journal/new\\?date=${day}$`))
  await page.getByRole("textbox", { name: "Entry" }).fill("Sunburnt.")
  await page.getByRole("button", { name: "Save entry" }).click()
  await expect(
    page.getByRole("heading", { name: "Sunburnt.", level: 1 }),
  ).toBeVisible()
  await expect(
    page.getByRole("paragraph").filter({
      hasText: formatLocalDate(day, "longYear"),
    }),
  ).toBeVisible()
})
