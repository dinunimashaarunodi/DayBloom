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

test("add a language, log practice, add words and review them", async ({
  page,
}) => {
  await page.goto("/languages")
  await expect(page.getByText("No languages yet")).toBeVisible()

  const add = page.getByRole("region", { name: "Add a language" })
  await add.getByRole("textbox", { name: "Language" }).fill("Spanish")
  await add
    .getByRole("combobox", { name: "Level (optional)" })
    .selectOption("A2")
  await add.getByRole("button", { name: "Add language" }).click()

  // Adding opens the language.
  await expect(
    page.getByRole("heading", { name: "Spanish", level: 1 }),
  ).toBeVisible()
  await expect(page.getByText("Level A2")).toBeVisible()

  // Practice.
  const log = page.getByRole("region", { name: "Log practice" })
  await log.getByRole("button", { name: "Log practice" }).click()
  await expect(log.getByText("Choose what you practised.")).toBeVisible()
  await log.getByRole("spinbutton", { name: "Minutes" }).fill("20")
  await log
    .getByRole("combobox", { name: "What did you practise?" })
    .selectOption("Listening")
  await log.getByRole("button", { name: "Log practice" }).click()
  await expect(log.getByText("Practice logged. Well done!")).toBeVisible()
  await expect(
    page.getByRole("list", { name: "Recent practice" }),
  ).toContainText("Listening")

  // Words.
  const words = page.getByRole("region", { name: "Add a word" })
  for (const [term, meaning] of [
    ["hola", "hello"],
    ["gato", "cat"],
  ]) {
    await words.getByRole("textbox", { name: "Word or phrase" }).fill(term!)
    await words.getByRole("textbox", { name: "Meaning" }).fill(meaning!)
    await words.getByRole("button", { name: "Add word" }).click()
    await expect(
      page.getByRole("checkbox", { name: `Mark as learned: ${term}` }),
    ).toBeVisible()
  }

  // Review: flip each card; mark one as learned.
  await page.getByRole("link", { name: "Review 2 words" }).click()
  await expect(
    page.getByRole("heading", { name: "Review words", level: 1 }),
  ).toBeVisible()
  await expect(page.getByText("Card 1 of 2")).toBeVisible()
  await page.getByRole("button", { name: "Show meaning" }).click()
  await page.getByRole("button", { name: "Got it" }).click()
  await expect(page.getByText("Card 2 of 2")).toBeVisible()
  await page.getByRole("button", { name: "Show meaning" }).click()
  await page.getByRole("button", { name: "Still learning" }).click()
  await expect(page.getByRole("status")).toContainText("Review done!")
  await expect(page.getByText("marked 1 as learned")).toBeVisible()

  await page.getByRole("link", { name: "Back to words" }).click()
  await expect(page.getByRole("link", { name: "Review 1 word" })).toBeVisible()

  // Today's card.
  await page.goto("/today")
  await expect(page.getByRole("region", { name: "Languages" })).toContainText(
    "20 min practised today",
  )
})
