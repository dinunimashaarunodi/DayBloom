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
const NBSP = " "
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

async function setUpFinance(page: Page) {
  await page.goto("/finance")
  await expect(
    page.getByRole("region", { name: "Set up finance" }),
  ).toBeVisible()
  // Suggested from the Asia/Colombo timezone.
  await expect(
    page.getByRole("combobox", { name: "Your currency" }),
  ).toHaveValue("LKR")
  await page.getByRole("button", { name: "Start tracking" }).click()
  await expect(
    page.getByRole("region", { name: "Add transaction" }),
  ).toBeVisible()
}

const addForm = (page: Page) =>
  page.getByRole("region", { name: "Add transaction" })

async function addTransaction(
  page: Page,
  {
    kind,
    amount,
    category,
  }: { kind: "Expense" | "Income"; amount: string; category: string },
) {
  const form = addForm(page)
  await form.getByRole("radio", { name: kind }).check({ force: true })
  await form.getByRole("textbox", { name: /Amount/ }).fill(amount)
  await form
    .getByRole("combobox", { name: "Category" })
    .selectOption({ label: category })
  await form.getByRole("button", { name: "Add" }).click()
  await expect(form.getByRole("textbox", { name: /Amount/ })).toHaveValue("")
}

test("set up finance, add expenses and income, and see the month", async ({
  page,
}) => {
  await setUpFinance(page)
  const form = addForm(page)

  // Validation happens before anything is saved.
  await form.getByRole("textbox", { name: /Amount/ }).fill("12.345")
  await form.getByRole("button", { name: "Add" }).click()
  await expect(form.getByText("Use at most 2 decimal places.")).toBeVisible()

  await addTransaction(page, {
    kind: "Expense",
    amount: "1,250.50",
    category: "Food & groceries",
  })
  await addTransaction(page, {
    kind: "Expense",
    amount: "300",
    category: "Transport",
  })
  await addTransaction(page, {
    kind: "Income",
    amount: "50000",
    category: "Salary",
  })

  await expect(page.getByText(`Rs${NBSP}1,550.50`).first()).toBeVisible() // Spent
  await expect(page.getByText(`Rs${NBSP}50,000.00`).first()).toBeVisible() // Income

  const today = todayIn(TZ, new Date())
  const list = page.getByRole("region", { name: "Transactions" })
  await expect(list).toContainText("Food & groceries")
  await expect(list).toContainText(`−Rs${NBSP}1,250.50`)
  await expect(list).toContainText(`+Rs${NBSP}50,000.00`)

  // Charts come with an accessible table of the same numbers.
  await expect(
    page.locator("table", { hasText: "Spending by category" }),
  ).toContainText(`Food & groceries`)
  expect(today).toMatch(/^\d{4}-\d{2}-\d{2}$/)

  // The Today dashboard shows real spending.
  await page.goto("/today")
  await expect(page.getByRole("region", { name: "Spending" })).toContainText(
    `Rs${NBSP}1,550.50`,
  )
})

test("edit and delete a transaction", async ({ page }) => {
  await setUpFinance(page)
  await addTransaction(page, {
    kind: "Expense",
    amount: "999",
    category: "Shopping",
  })

  await page.getByRole("link", { name: /Shopping/ }).click()
  await expect(
    page.getByRole("heading", { name: "Edit transaction" }),
  ).toBeVisible()
  await expect(page.getByRole("textbox", { name: /Amount/ })).toHaveValue(
    "999.00",
  )
  await page.getByRole("textbox", { name: /Amount/ }).fill("1200")
  await page.getByRole("button", { name: "Save changes" }).click()
  await expect(page.getByText("Saved.")).toBeVisible()

  const { data } = await adminClient()
    .from("transactions")
    .select("amount_minor")
    .eq("user_id", user.id)
    .single()
  expect(data?.amount_minor).toBe(120000)

  page.once("dialog", (dialog) => dialog.accept())
  await page.getByRole("button", { name: "Delete transaction" }).click()
  await expect(page).toHaveURL(/\/finance$/)
  await expect(page.getByText("Nothing recorded this month")).toBeVisible()
})

test("add and archive categories", async ({ page }) => {
  await setUpFinance(page)
  await page.getByRole("link", { name: "Categories" }).click()
  await expect(
    page.getByRole("heading", { name: "Categories", level: 1 }),
  ).toBeVisible()

  await page.getByRole("textbox", { name: "New category" }).fill("Pets")
  await page.getByRole("button", { name: "Add", exact: true }).click()
  const expenses = page.getByRole("region", { name: "Expense categories" })
  await expect(expenses).toContainText("Pets")

  await expenses.getByRole("button", { name: "Archive Pets" }).click()
  await expect(
    expenses.getByRole("button", { name: "Restore Pets" }),
  ).toBeVisible()

  // Archived categories aren't offered for new transactions.
  await page.goto("/finance")
  await expect(
    addForm(page)
      .getByRole("combobox", { name: "Category" })
      .locator("option", { hasText: "Pets" }),
  ).toHaveCount(0)
})
