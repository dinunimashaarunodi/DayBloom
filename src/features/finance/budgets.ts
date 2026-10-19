// Pure budget rules (no React, Next.js or Supabase), unit-tested.
// Budgets are effective-dated: a row applies from its month until a later row
// for the same scope replaces it; a null amount means the budget was removed.
import { daysBetween, type LocalDate } from "@/lib/dates/local-date"

export type BudgetRow = {
  category_id: string | null // null = overall
  starts_on: LocalDate
  amount_minor: number | null
  currency: string
}

export const BUDGET_COLUMNS =
  "category_id, starts_on, amount_minor, currency" as const

/** Key for the overall budget in maps keyed by category id. */
export const OVERALL = "overall"
export type BudgetScope = string // a category id, or OVERALL

/** The budget in force for each scope in `monthStart` (in `currency`). */
export function effectiveBudgets(
  rows: BudgetRow[],
  monthStart: LocalDate,
  currency: string,
): Map<BudgetScope, number> {
  const latest = new Map<BudgetScope, BudgetRow>()
  for (const row of rows) {
    if (row.currency !== currency || row.starts_on > monthStart) continue
    const scope = row.category_id ?? OVERALL
    const current = latest.get(scope)
    if (!current || row.starts_on > current.starts_on) latest.set(scope, row)
  }
  const result = new Map<BudgetScope, number>()
  for (const [scope, row] of latest) {
    if (row.amount_minor !== null) result.set(scope, row.amount_minor)
  }
  return result
}

/** From this share of the limit on, a budget is "near". */
export const NEAR_RATIO = 0.8

export type BudgetState = "ok" | "near" | "over"

export function budgetStatus(spent: number, limit: number) {
  const ratio = limit > 0 ? spent / limit : 0
  const state: BudgetState =
    spent > limit ? "over" : ratio >= NEAR_RATIO ? "near" : "ok"
  return { ratio, remaining: limit - spent, state }
}

/**
 * What can be spent per day for the rest of the month, today included.
 * Null when nothing is left or the month is over.
 */
export function dailyAllowance(
  remaining: number,
  today: LocalDate,
  monthEnd: LocalDate,
): { perDay: number; days: number } | null {
  const days = daysBetween(today, monthEnd) + 1
  if (remaining <= 0 || days <= 0) return null
  return { perDay: Math.floor(remaining / days), days }
}
