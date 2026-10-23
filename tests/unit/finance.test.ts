import { describe, expect, it } from "vitest"

import {
  currencyOptions,
  dailySpending,
  groupByDay,
  inCurrency,
  monthKey,
  monthRange,
  monthSummary,
  otherCurrencyTotals,
  percentChange,
  spendingByCategory,
  UNCATEGORIZED,
  type Category,
  type Transaction,
} from "@/features/finance/logic"
import {
  categoryFormSchema,
  currencySchema,
  parseMonth,
  transactionFormSchema,
} from "@/features/finance/schema"
import type { LocalDate } from "@/lib/dates/local-date"

const d = (value: string) => value as LocalDate

let nextId = 0
function tx(
  kind: "expense" | "income",
  amount: number,
  date: string,
  category: string | null = null,
): Transaction {
  return {
    id: `t${nextId++}`,
    kind,
    amount_minor: amount,
    currency: "LKR",
    category_id: category,
    occurred_on: d(date),
    note: null,
  }
}

const categories: Category[] = [
  { id: "food", kind: "expense", name: "Food", archived_at: null },
  { id: "bus", kind: "expense", name: "Transport", archived_at: null },
  { id: "old", kind: "expense", name: "Old hobby", archived_at: "2026-01-01" },
]

describe("months", () => {
  it("finds the first and last day, including leap Februaries", () => {
    expect(monthRange(d("2026-10-19"))).toEqual({
      from: "2026-10-01",
      to: "2026-10-31",
    })
    expect(monthRange(d("2028-02-10"))).toEqual({
      from: "2028-02-01",
      to: "2028-02-29",
    })
    expect(monthKey(d("2026-10-19"))).toBe("2026-10")
  })

  it("parses month URLs and rejects nonsense", () => {
    expect(parseMonth("2026-10")).toBe("2026-10-01")
    expect(parseMonth("2026-13")).toBeNull()
    expect(parseMonth("../2026")).toBeNull()
    expect(parseMonth(undefined)).toBeNull()
  })
})

describe("totals", () => {
  const month = [
    tx("expense", 125050, "2026-10-01", "food"),
    tx("expense", 4999, "2026-10-01", "bus"),
    tx("income", 50000000, "2026-10-05"),
    tx("expense", 1, "2026-10-19"),
  ]

  it("sums integer minor units exactly", () => {
    expect(monthSummary(month)).toEqual({
      spent: 130050,
      income: 50000000,
      net: 50000000 - 130050,
    })
    // 0.1 + 0.2 style drift can't happen with integers.
    const cents = Array.from({ length: 10 }, () =>
      tx("expense", 10, "2026-10-02"),
    )
    expect(monthSummary(cents).spent).toBe(100)
  })

  it("compares with last month, without dividing by zero", () => {
    expect(percentChange(150, 100)).toBe(50)
    expect(percentChange(50, 100)).toBe(-50)
    expect(percentChange(100, 100)).toBe(0)
    expect(percentChange(100, 0)).toBeNull()
  })
})

describe("spendingByCategory", () => {
  it("totals expenses per category, largest first, with names", () => {
    const result = spendingByCategory(
      [
        tx("expense", 300, "2026-10-01", "food"),
        tx("expense", 500, "2026-10-02", "bus"),
        tx("expense", 200, "2026-10-03", "food"),
        tx("expense", 50, "2026-10-03", null),
        tx("expense", 70, "2026-10-04", "old"),
        tx("income", 9999, "2026-10-05", null),
      ],
      categories,
    )
    expect(result).toEqual([
      // Ties are broken alphabetically.
      { id: "food", name: "Food", amount: 500 },
      { id: "bus", name: "Transport", amount: 500 },
      { id: "old", name: "Old hobby", amount: 70 },
      { id: null, name: UNCATEGORIZED, amount: 50 },
    ])
  })
})

describe("dailySpending and groupByDay", () => {
  it("covers every day of the month, zeros included", () => {
    const days = dailySpending(
      [
        tx("expense", 100, "2026-02-03"),
        tx("expense", 50, "2026-02-03"),
        tx("income", 7, "2026-02-04"),
      ],
      d("2026-02-01"),
    )
    expect(days).toHaveLength(28)
    expect(days[2]).toEqual({ date: "2026-02-03", day: 3, amount: 150 })
    expect(days[3].amount).toBe(0)
  })

  it("groups the list by day, newest first", () => {
    const groups = groupByDay([
      tx("expense", 1, "2026-10-02"),
      tx("expense", 2, "2026-10-19"),
      tx("expense", 3, "2026-10-02"),
    ])
    expect(groups.map((g) => [g.date, g.items.length])).toEqual([
      ["2026-10-19", 1],
      ["2026-10-02", 2],
    ])
  })
})

describe("form schemas", () => {
  it("normalises an empty category and note to null", () => {
    expect(
      transactionFormSchema.parse({
        kind: "expense",
        amount: "12.50",
        categoryId: "",
        date: "2026-10-19",
        note: "  ",
      }),
    ).toMatchObject({ categoryId: null, note: null, kind: "expense" })
  })

  it("rejects unknown kinds, invalid dates and bad currencies", () => {
    expect(
      transactionFormSchema.safeParse({
        kind: "gift",
        amount: "1",
        date: "2026-10-19",
      }).success,
    ).toBe(false)
    expect(
      transactionFormSchema.safeParse({
        kind: "expense",
        amount: "1",
        date: "2026-02-30",
      }).success,
    ).toBe(false)
    expect(currencySchema.safeParse({ currency: "LKR" }).success).toBe(true)
    expect(currencySchema.safeParse({ currency: "XYZ" }).success).toBe(false)
  })

  it("requires category names of a sensible length", () => {
    expect(
      categoryFormSchema.safeParse({ kind: "expense", name: "  " }).success,
    ).toBe(false)
    expect(
      categoryFormSchema.safeParse({ kind: "income", name: "x".repeat(41) })
        .success,
    ).toBe(false)
    expect(
      categoryFormSchema.parse({ kind: "income", name: " Bonus " }).name,
    ).toBe("Bonus")
  })
})

describe("more than one currency", () => {
  const usd = (kind: "expense" | "income", amount: number) => ({
    ...tx(kind, amount, "2026-10-05"),
    currency: "USD",
  })
  const all = [
    tx("expense", 5000, "2026-10-03"),
    usd("expense", 1250),
    usd("expense", 750),
    usd("income", 10000),
    { ...tx("expense", 300, "2026-10-04"), currency: "EUR" },
  ]

  it("keeps the main currency's transactions for totals and charts", () => {
    expect(inCurrency(all, "LKR")).toHaveLength(1)
    expect(monthSummary(inCurrency(all, "LKR")).spent).toBe(5000)
  })

  it("totals other currencies separately, never mixing them", () => {
    expect(otherCurrencyTotals(all, "LKR")).toEqual([
      { currency: "EUR", spent: 300, income: 0 },
      { currency: "USD", spent: 2000, income: 10000 },
    ])
    expect(otherCurrencyTotals(inCurrency(all, "LKR"), "LKR")).toEqual([])
  })

  it("lists every currency with the main one first", () => {
    const options = currencyOptions("LKR")
    expect(options[0]).toEqual(["LKR", "Sri Lankan Rupee"])
    expect(options.filter(([code]) => code === "LKR")).toHaveLength(1)
    expect(options.some(([code]) => code === "USD")).toBe(true)
  })

  it("accepts a chosen currency or none (the main one)", () => {
    const base = { kind: "expense", amount: "10", date: "2026-10-05" }
    expect(
      transactionFormSchema.parse({ ...base, currency: "USD" }).currency,
    ).toBe("USD")
    expect(
      transactionFormSchema.parse({ ...base, currency: "" }).currency,
    ).toBeNull()
    expect(
      transactionFormSchema.safeParse({ ...base, currency: "ZZZ" }).success,
    ).toBe(false)
  })
})
