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

  // Another currency: listed and totalled on its own, never added to LKR.
  await form.getByRole("radio", { name: "Expense" }).check({ force: true })
  await form.getByRole("textbox", { name: /Amount/ }).fill("45")
  await form.getByRole("combobox", { name: "Currency" }).selectOption("USD")
  await form.getByRole("button", { name: "Add" }).click()
  await expect(
    page.getByRole("region", { name: "Other currencies" }),
  ).toContainText("USD: $45.00 spent")
  await expect(page.getByText(`Rs${NBSP}1,550.50`).first()).toBeVisible()

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

test("set budgets and watch spending pace against them", async ({ page }) => {
  await setUpFinance(page)
  await page.getByRole("link", { name: "Budgets" }).first().click()
  await expect(
    page.getByRole("heading", { name: "Budgets", level: 1 }),
  ).toBeVisible()

  const setBudget = async (label: string, amount: string) => {
    await page.getByRole("textbox", { name: label }).fill(amount)
    await page.getByRole("button", { name: `Save ${label} budget` }).click()
  }
  await setBudget("All spending", "20000")
  await expect(page.getByText("Saved.")).toHaveCount(1)
  await setBudget("Food & groceries", "5000")
  await expect(page.getByText("Saved.")).toHaveCount(2)

  await page.goto("/finance")
  await addTransaction(page, {
    kind: "Expense",
    amount: "4500",
    category: "Food & groceries",
  })

  const budgets = page.getByRole("region", { name: "Budgets" })
  const food = budgets.getByRole("progressbar", {
    name: "Food & groceries budget",
  })
  await expect(food).toHaveAttribute("aria-valuenow", "90")
  await expect(budgets).toContainText(`Rs${NBSP}500.00 left`)
  await expect(
    budgets.getByRole("progressbar", { name: "Overall budget" }),
  ).toHaveAttribute(
    "aria-valuetext",
    `Rs${NBSP}4,500.00 of Rs${NBSP}20,000.00 used`,
  )

  // Going over is stated in words, not just colour.
  await addTransaction(page, {
    kind: "Expense",
    amount: "1000",
    category: "Food & groceries",
  })
  await expect(budgets).toContainText(`Rs${NBSP}500.00 over`)

  await page.goto("/today")
  await expect(page.getByRole("region", { name: "Spending" })).toContainText(
    "28% of the monthly budget used",
  )

  // Removing a budget: clear the amount and save.
  await page.goto("/finance/budgets")
  await setBudget("Food & groceries", "")
  await expect(page.getByText("Removed.")).toBeVisible()
  await page.goto("/finance")
  await expect(
    page.getByRole("progressbar", { name: "Food & groceries budget" }),
  ).toHaveCount(0)
})
