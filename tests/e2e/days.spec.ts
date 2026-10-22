import { expect, test } from "@playwright/test"

import { addDays, formatLocalDate, todayIn } from "@/lib/dates/local-date"

import {
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

test("reflect on today: the review is saved and shown again", async ({
  page,
}) => {
  const reflect = page.getByRole("region", { name: "Reflect on your day" })
  await reflect
    .getByRole("radio", { name: "Good" })
    .first()
    .check({ force: true })
  await reflect
    .getByRole("group", { name: "Energy" })
    .getByRole("radio", { name: "Steady" })
    .check({ force: true })
  await reflect
    .getByRole("textbox", { name: "What went well?" })
    .fill("Finished my run")
  await reflect.getByRole("button", { name: "Save reflection" }).click()
  await expect(
    reflect.getByText("Thanks for taking a moment to reflect"),
  ).toBeVisible()

  await page.reload()
  await expect(
    reflect
      .getByRole("group", { name: "How did the day feel?" })
      .getByRole("radio", { name: "Good" }),
  ).toBeChecked()
  await expect(
    reflect.getByRole("textbox", { name: "What went well?" }),
  ).toHaveValue("Finished my run")
})

test("past days are closed into history with a frozen snapshot", async ({
  page,
  isMobile,
}) => {
  const today = todayIn(TZ, new Date())
  const yesterday = addDays(today, -1)
  const client = await signedInClient(user)
  await client.from("tasks").insert([
    { title: "Water the plants", due_date: yesterday },
    { title: "Write report", due_date: yesterday },
  ])
  const { data: report } = await client
    .from("tasks")
    .select("id")
    .eq("title", "Write report")
    .single()

  // History is in the sidebar; on mobile it's listed on the More tab.
  const nav = page.getByRole("navigation", { name: "Main" })
  if (isMobile) {
    await nav.getByRole("link", { name: "More" }).click()
    await page
      .getByRole("list", { name: "More pages" })
      .getByRole("link", { name: /History/ })
      .click()
  } else {
    await nav.getByRole("link", { name: "History" }).click()
  }
  const pastDays = page.getByRole("list", { name: "Past days" })
  await expect(pastDays.getByRole("listitem")).toHaveText([
    new RegExp(
      `${formatLocalDate(yesterday, "longYear")}.*0 of 2 planned done`,
    ),
  ])

  // Finishing a task now doesn't rewrite yesterday's record.
  await client.from("tasks").update({ status: "done" }).eq("id", report!.id)

  await pastDays.getByRole("link").click()
  await expect(page).toHaveURL(new RegExp(`/history/${yesterday}$`))
  await expect(
    page
      .getByRole("list", { name: "Planned for this day" })
      .getByRole("listitem"),
  ).toHaveText([/Water the plants.*Not finished/, /Write report.*Not finished/])

  // Yesterday is within the 7-day window, so its reflection can still be written.
  const reflection = page.getByRole("region", { name: "Reflection" })
  await reflection.getByRole("radio", { name: "Okay" }).check({ force: true })
  await reflection.getByRole("button", { name: "Save reflection" }).click()
  await expect(
    reflection.getByText("Thanks for taking a moment to reflect"),
  ).toBeVisible()

  await page.goto("/history")
  await expect(page.getByRole("list", { name: "Past days" })).toContainText(
    "Felt okay",
  )
})

test("today's page in history explains the day isn't over yet", async ({
  page,
}) => {
  await page.goto(`/history/${todayIn(TZ, new Date())}`)
  await expect(
    page.getByRole("heading", { name: "This day isn't over yet" }),
  ).toBeVisible()
})
