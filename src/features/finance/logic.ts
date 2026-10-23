// Pure finance rules (no React, Next.js or Supabase), unit-tested.
// All amounts are integer minor units; sums of integers stay exact.
import {
  addDays,
  addMonths,
  dayOfMonth,
  startOfMonth,
  type LocalDate,
} from "@/lib/dates/local-date"

import { currencyName, listCurrencies } from "@/lib/money"

import type { TransactionKind } from "./schema"

export type Transaction = {
  id: string
  kind: TransactionKind
  amount_minor: number
  currency: string
  category_id: string | null
  occurred_on: LocalDate
  note: string | null
}

export const TRANSACTION_COLUMNS =
  "id, kind, amount_minor, currency, category_id, occurred_on, note" as const

export type Category = {
  id: string
  kind: TransactionKind
  name: string
  archived_at: string | null
}

export const CATEGORY_COLUMNS = "id, kind, name, archived_at" as const

export const UNCATEGORIZED = "Uncategorized"

/** First and last local day of the month that contains `date`. */
export function monthRange(date: LocalDate): {
  from: LocalDate
  to: LocalDate
} {
  const from = startOfMonth(date)
  return { from, to: addDays(addMonths(from, 1), -1) }
}

/** "2026-10" for URLs. */
export function monthKey(date: LocalDate): string {
  return date.slice(0, 7)
}

export function sumByKind(
  transactions: Transaction[],
  kind: TransactionKind,
): number {
  return transactions
    .filter((t) => t.kind === kind)
    .reduce((total, t) => total + t.amount_minor, 0)
}

export function monthSummary(transactions: Transaction[]) {
  const spent = sumByKind(transactions, "expense")
  const income = sumByKind(transactions, "income")
  return { spent, income, net: income - spent }
}

/** Only the transactions in the user's main currency (what analytics sum). */
export function inCurrency<T extends Pick<Transaction, "currency">>(
  transactions: T[],
  currency: string,
): T[] {
  return transactions.filter((t) => t.currency === currency)
}

/**
 * Spent and income per currency other than the main one, alphabetically.
 * Amounts in different currencies are never added together or converted.
 */
export function otherCurrencyTotals(
  transactions: Transaction[],
  mainCurrency: string,
): { currency: string; spent: number; income: number }[] {
  const totals = new Map<string, { spent: number; income: number }>()
  for (const t of transactions) {
    if (t.currency === mainCurrency) continue
    const total = totals.get(t.currency) ?? { spent: 0, income: 0 }
    if (t.kind === "expense") total.spent += t.amount_minor
    else total.income += t.amount_minor
    totals.set(t.currency, total)
  }
  return [...totals]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([currency, total]) => ({ currency, ...total }))
}

/**
 * Change from the previous period as a whole percentage, or null when there's
 * nothing to compare with (avoids "infinite %" when last month was zero).
 */
export function percentChange(
  current: number,
  previous: number,
): number | null {
  if (previous === 0) return null
  return Math.round(((current - previous) / previous) * 100)
}

export type CategoryTotal = { id: string | null; name: string; amount: number }

/** Spending per category, largest first. Archived categories still count. */
export function spendingByCategory(
  transactions: Transaction[],
  categories: Category[],
): CategoryTotal[] {
  const names = new Map(categories.map((c) => [c.id, c.name]))
  const totals = new Map<string | null, number>()
  for (const t of transactions) {
    if (t.kind !== "expense") continue
    totals.set(t.category_id, (totals.get(t.category_id) ?? 0) + t.amount_minor)
  }
  return [...totals.entries()]
    .map(([id, amount]) => ({
      id,
      name: (id && names.get(id)) || UNCATEGORIZED,
      amount,
    }))
    .sort((a, b) => b.amount - a.amount || a.name.localeCompare(b.name))
}

export type DayTotal = { date: LocalDate; day: number; amount: number }

/** Spending for every day of the month (zero days included, for a steady axis). */
export function dailySpending(
  transactions: Transaction[],
  monthStart: LocalDate,
): DayTotal[] {
  const { from, to } = monthRange(monthStart)
  const totals = new Map<string, number>()
  for (const t of transactions) {
    if (t.kind === "expense") {
      totals.set(
        t.occurred_on,
        (totals.get(t.occurred_on) ?? 0) + t.amount_minor,
      )
    }
  }
  const days: DayTotal[] = []
  for (let date = from; date <= to; date = addDays(date, 1)) {
    days.push({ date, day: dayOfMonth(date), amount: totals.get(date) ?? 0 })
  }
  return days
}

/** Transactions grouped by day, newest day first (for the list). */
export function groupByDay(
  transactions: Transaction[],
): { date: LocalDate; items: Transaction[] }[] {
  const groups = new Map<LocalDate, Transaction[]>()
  for (const t of transactions) {
    groups.set(t.occurred_on, [...(groups.get(t.occurred_on) ?? []), t])
  }
  return [...groups.entries()]
    .sort(([a], [b]) => (a < b ? 1 : a > b ? -1 : 0))
    .map(([date, items]) => ({ date, items }))
}

/** Every currency as [code, name], with `first` (the main one) at the top. */
export function currencyOptions(first: string): [string, string][] {
  const codes = [first, ...listCurrencies().filter((code) => code !== first)]
  return codes.map((code) => [code, currencyName(code)])
}
