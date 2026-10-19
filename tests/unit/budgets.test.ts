import { describe, expect, it } from "vitest"

import {
  budgetStatus,
  dailyAllowance,
  effectiveBudgets,
  OVERALL,
  type BudgetRow,
} from "@/features/finance/budgets"
import type { LocalDate } from "@/lib/dates/local-date"

const d = (value: string) => value as LocalDate

function row(
  category: string | null,
  month: string,
  amount: number | null,
  currency = "LKR",
): BudgetRow {
  return {
    category_id: category,
    starts_on: d(month),
    amount_minor: amount,
    currency,
  }
}

describe("effectiveBudgets", () => {
  const rows = [
    row(null, "2026-08-01", 100000),
    row(null, "2026-10-01", 120000),
    row("food", "2026-09-01", 30000),
    row("food", "2026-11-01", null), // removed from November
    row("fun", "2026-12-01", 5000), // starts later
    row("old", "2026-01-01", 999, "USD"), // another currency
  ]

  it("uses the latest budget that started on or before the month", () => {
    expect([...effectiveBudgets(rows, d("2026-09-01"), "LKR")]).toEqual([
      [OVERALL, 100000],
      ["food", 30000],
    ])
    expect(effectiveBudgets(rows, d("2026-10-01"), "LKR").get(OVERALL)).toBe(
      120000,
    )
  })

  it("drops budgets that were removed, haven't started, or use another currency", () => {
    const november = effectiveBudgets(rows, d("2026-11-01"), "LKR")
    expect(november.has("food")).toBe(false)
    expect(november.has("fun")).toBe(false)
    expect(november.has("old")).toBe(false)
    expect(november.get(OVERALL)).toBe(120000)
  })

  it("keeps history: earlier months still see their own budgets", () => {
    expect(effectiveBudgets(rows, d("2026-07-01"), "LKR").size).toBe(0)
  })
})

describe("budgetStatus", () => {
  it.each([
    [0, 1000, "ok", 1000],
    [799, 1000, "ok", 201],
    [800, 1000, "near", 200],
    [1000, 1000, "near", 0],
    [1001, 1000, "over", -1],
  ])("spent %d of %d is %s", (spent, limit, state, remaining) => {
    expect(budgetStatus(spent, limit)).toMatchObject({ state, remaining })
  })
})

describe("dailyAllowance", () => {
  it("spreads what's left over the remaining days, today included", () => {
    expect(dailyAllowance(31000, d("2026-10-01"), d("2026-10-31"))).toEqual({
      perDay: 1000,
      days: 31,
    })
    expect(dailyAllowance(1000, d("2026-10-31"), d("2026-10-31"))).toEqual({
      perDay: 1000,
      days: 1,
    })
    // Rounds down, so following it never overspends.
    expect(dailyAllowance(1000, d("2026-10-29"), d("2026-10-31"))?.perDay).toBe(
      333,
    )
  })

  it("returns null when nothing is left or the month is over", () => {
    expect(dailyAllowance(0, d("2026-10-10"), d("2026-10-31"))).toBeNull()
    expect(dailyAllowance(-50, d("2026-10-10"), d("2026-10-31"))).toBeNull()
    expect(dailyAllowance(500, d("2026-11-01"), d("2026-10-31"))).toBeNull()
  })
})
