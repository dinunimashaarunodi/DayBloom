import { expect, test, type Page } from "@playwright/test"

import {
  addDays,
  addMonths,
  formatLocalDate,
  todayIn,
} from "@/lib/dates/local-date"

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

const eventsOn = (page: Page, day: string) =>
  page.getByRole("list", {
    name: `Events on ${formatLocalDate(day as never, "long")}`,
    exact: true,
  })

async function fillEvent(
  page: Page,
  fields: {
    title: string
    date: string
    start?: string
    end?: string
    endDate?: string
  },
) {
  await page.getByRole("textbox", { name: "Event" }).fill(fields.title)
  if (fields.endDate)
    await page.getByRole("checkbox", { name: "All day" }).click()
  await page
    .getByLabel(fields.endDate ? "Start date" : "Date", { exact: true })
    .fill(fields.date)
  if (fields.endDate) {
    await page.getByLabel("End date").fill(fields.endDate)
  } else {
    await page.getByLabel("Starts").fill(fields.start!)
    await page.getByLabel("Ends").fill(fields.end!)
  }
}

test("a 23:30 event shows on the right local day, on the calendar and Today", async ({
  page,
}) => {
  const today = todayIn(TZ, new Date())
  await page.goto("/calendar")
  await page.getByRole("link", { name: "New event" }).click()
  await expect(page.getByRole("heading", { name: "New event" })).toBeVisible()

  await fillEvent(page, {
    title: "Night walk",
    date: today,
    start: "23:30",
    end: "23:45",
  })
  await page.getByRole("button", { name: "Add event" }).click()

  await expect(page).toHaveURL(new RegExp(`view=week&date=${today}`))
  await expect(eventsOn(page, today).getByRole("listitem")).toHaveText([
    /23:30–23:45\s*Night walk/,
  ])
  await expect(eventsOn(page, addDays(today, 1))).toHaveCount(0)

  await page
    .getByRole("navigation", { name: "Main" })
    .getByRole("link", { name: "Today" })
    .click()
  await expect(
    page.getByRole("list", { name: "Today's events" }),
  ).toContainText("Night walk")
})

test("an all-day event spans its days; editing and deleting work", async ({
  page,
}) => {
  const start = addDays(todayIn(TZ, new Date()), 1)
  await page.goto(`/calendar/events/new?date=${start}`)
  await fillEvent(page, {
    title: "Family visit",
    date: start,
    endDate: addDays(start, 1),
  })
  await page.getByRole("button", { name: "Add event" }).click()

  for (const day of [start, addDays(start, 1)]) {
    await expect(eventsOn(page, day).getByRole("listitem")).toHaveText([
      /All day\s*Family visit/,
    ])
  }

  await eventsOn(page, start)
    .getByRole("link", { name: /Family visit/ })
    .click()
  await expect(page.getByRole("heading", { name: "Edit event" })).toBeVisible()
  await expect(page.getByRole("checkbox", { name: "All day" })).toBeChecked()
  await page.getByRole("textbox", { name: "Event" }).fill("Family weekend")
  await page.getByRole("button", { name: "Save changes" }).click()
  await expect(page.getByText("Saved.")).toBeVisible()

  page.once("dialog", (dialog) => dialog.accept())
  await page.getByRole("button", { name: "Delete event" }).click()
  await expect(page).toHaveURL(/\/calendar$/)
  await page.goto(`/calendar?view=week&date=${start}`)
  await expect(eventsOn(page, start)).toHaveCount(0)
})

test("month view: tasks appear on their day, and navigation works", async ({
  page,
  isMobile,
}) => {
  const today = todayIn(TZ, new Date())
  const tomorrow = addDays(today, 1)
  const client = await signedInClient(user)
  await client
    .from("tasks")
    .insert({ title: "Book flights", due_date: tomorrow })

  await page.goto("/calendar")
  await expect(
    page.getByRole("heading", { name: formatLocalDate(today, "month") }),
  ).toBeVisible()

  // Pick tomorrow in the grid; its agenda shows the task.
  await page
    .getByRole("link", {
      name: new RegExp(`^${formatLocalDate(tomorrow, "long")}, 1 item`),
    })
    .click()
  await expect(page).toHaveURL(new RegExp(`date=${tomorrow}`))
  await expect(
    page.getByRole("list", {
      name: `Tasks on ${formatLocalDate(tomorrow, "long")}`,
      exact: true,
    }),
  ).toContainText("Book flights")

  if (isMobile) {
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - window.innerWidth,
    )
    expect(overflow).toBeLessThanOrEqual(0)
  }

  await page.getByRole("link", { name: "Next month" }).click()
  await expect(
    page.getByRole("heading", {
      name: formatLocalDate(addMonths(tomorrow, 1), "month"),
    }),
  ).toBeVisible()
  await page
    .getByRole("main")
    .getByRole("link", { name: "Today", exact: true })
    .click()
  await expect(
    page.getByRole("heading", { name: formatLocalDate(today, "month") }),
  ).toBeVisible()

  await page.getByRole("link", { name: "Week" }).click()
  await expect(page).toHaveURL(/view=week/)
})
