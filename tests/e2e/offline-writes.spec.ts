import { expect, test } from "@playwright/test"

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

test.beforeEach(async ({ page }) => {
  user = await createTestUser({ display_name: "Ama", timezone: TZ })
  const today = todayIn(TZ, new Date())
  const admin = adminClient()
  const seeded = await Promise.all([
    admin.from("tasks").insert({
      user_id: user.id,
      title: "Call the bank",
      due_date: today,
    }),
    admin.from("habits").insert({ user_id: user.id, name: "Stretch" }),
  ])
  for (const { error } of seeded) expect(error).toBeNull()
  await page.goto("/login")
  await logIn(page, user.email, user.password)
  await expect(page).toHaveURL(/\/today$/)
})

test.afterEach(async () => {
  await deleteTestUser(user)
})

test("changes made offline are kept and saved when back online", async ({
  page,
  context,
}) => {
  const todayList = page.getByRole("list", { name: "Today", exact: true })
  await expect(todayList).toContainText("Call the bank")
  await page.waitForLoadState("networkidle")

  await context.setOffline(true)
  const banner = page.getByRole("status").filter({ hasText: "offline" })
  await expect(banner).toContainText("kept on this device")

  // Add a task: it waits on the device.
  await page.getByRole("textbox", { name: "New task" }).fill("Buy bread")
  await page.getByRole("button", { name: "Add", exact: true }).click()
  await expect(
    page.getByRole("list", { name: "Waiting to sync" }),
  ).toContainText("Buy bread")
  await expect(page.getByRole("textbox", { name: "New task" })).toHaveValue("")

  // Tick a task and check in a habit: they show as done straight away.
  const tick = page.getByRole("checkbox", {
    name: "Mark as done: Call the bank",
  })
  await tick.click()
  await expect(
    page.getByRole("checkbox", { name: "Mark as not done: Call the bank" }),
  ).toBeChecked()
  const habit = page.getByRole("button", { name: /^Stretch, .* \(today\)/ })
  await habit.click()
  await expect(habit).toHaveAttribute("aria-pressed", "true")
  await expect(banner).toContainText("3 changes waiting to sync")

  // Back online: everything is sent once, and the page catches up.
  await context.setOffline(false)
  await expect(page.getByRole("list", { name: "Waiting to sync" })).toHaveCount(
    0,
    { timeout: 20_000 },
  )
  await expect(todayList).toContainText("Buy bread")

  const admin = adminClient()
  await expect
    .poll(async () => {
      const [tasks, logs] = await Promise.all([
        admin
          .from("tasks")
          .select("title, status")
          .eq("user_id", user.id)
          .order("title"),
        admin
          .from("habit_logs")
          .select("*", { count: "exact", head: true })
          .eq("user_id", user.id),
      ])
      return { tasks: tasks.data, checkIns: logs.count }
    })
    .toEqual({
      tasks: [
        { title: "Buy bread", status: "todo" },
        { title: "Call the bank", status: "done" },
      ],
      checkIns: 1,
    })
})
