import { expect, test } from "@playwright/test"

import {
  addDays,
  dayOfWeek,
  formatLocalDate,
  localDateTimeToInstant,
  todayIn,
  type LocalTime,
} from "@/lib/dates/local-date"

import {
  adminClient,
  createTestUser,
  deleteTestUser,
  type TestUser,
} from "../support/supabase"
import { logIn } from "./helpers"

const TZ = "Asia/Colombo"
let user: TestUser

// Dragging needs a mouse; on phones events move from their own page.
test.skip(({ isMobile }) => isMobile, "Drag and drop is a desktop feature")

test.beforeEach(async ({ page }) => {
  user = await createTestUser({ display_name: "Ama", timezone: TZ })
  await page.goto("/login")
  await logIn(page, user.email, user.password)
  await expect(page).toHaveURL(/\/today$/)
})

test.afterEach(async () => {
  await deleteTestUser(user)
})

test("drag an event to another day, keeping its time", async ({ page }) => {
  const today = todayIn(TZ, new Date())
  // Another day in the same week (Sunday moves back to Saturday).
  const target = addDays(today, dayOfWeek(today) < 6 ? 1 : -1)
  const at = (time: string) =>
    localDateTimeToInstant(today, time as LocalTime, TZ).toISOString()
  const { error } = await adminClient()
    .from("events")
    .insert([
      {
        user_id: user.id,
        title: "Dentist",
        all_day: false,
        starts_at: at("09:00"),
        ends_at: at("09:30"),
      },
      {
        user_id: user.id,
        title: "Book fair",
        all_day: true,
        start_date: today,
        end_date: today,
      },
    ])
  expect(error).toBeNull()

  // Week view: drag the row onto the other day's section.
  await page.goto(`/calendar?view=week&date=${today}`)
  const todayEvents = page.getByRole("list", {
    name: `Events on ${formatLocalDate(today, "long")}`,
  })
  // Retried until it lands: a drag before the page is interactive is ignored.
  const status = page.getByRole("status")
  await expect(async () => {
    await todayEvents
      .getByRole("link", { name: /Dentist/ })
      .dragTo(page.locator(`[data-drop-day="${target}"]`))
    // The drop registered once the move starts.
    await expect(status).toHaveText(/Moving|Moved/, { timeout: 2_000 })
  }).toPass()
  await expect(status).toContainText(
    `Moved "Dentist" to ${formatLocalDate(target, "long")}.`,
  )
  await expect(
    page.getByRole("list", {
      name: `Events on ${formatLocalDate(target, "long")}`,
    }),
  ).toContainText(/09:00–09:30\s*Dentist/)
  await expect(todayEvents).not.toContainText("Dentist")

  // Month view: drag the all-day event's chip onto another day's cell.
  await page.goto(`/calendar?view=month&date=${today}`)
  await expect(async () => {
    await page
      .locator(`[data-drop-day="${today}"]`)
      .first()
      .getByText("Book fair")
      .dragTo(page.locator(`[data-drop-day="${target}"]`).first())
    await expect(status).toHaveText(/Moving|Moved "Book fair"/, {
      timeout: 2_000,
    })
  }).toPass()
  await expect(status).toContainText(`Moved "Book fair"`)
  const { data } = await adminClient()
    .from("events")
    .select("start_date, end_date")
    .eq("user_id", user.id)
    .eq("title", "Book fair")
    .single()
  expect(data).toEqual({ start_date: target, end_date: target })
})
