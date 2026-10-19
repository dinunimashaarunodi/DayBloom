import { Target } from "lucide-react"
import Link from "next/link"

import { DashboardCard } from "@/components/layout/dashboard-card"
import type { LocalDate } from "@/lib/dates/local-date"
import { formatMoney } from "@/lib/money"

import {
  budgetStatus,
  dailyAllowance,
  effectiveBudgets,
  OVERALL,
  type BudgetRow,
} from "../budgets"
import { spendingByCategory, type Category, type Transaction } from "../logic"
import { BudgetMeter } from "./budget-meter"

/** The month's budgets with progress; the overall budget first. */
export function BudgetsCard({
  rows,
  transactions,
  categories,
  currency,
  month,
  monthEnd,
  today,
}: {
  rows: BudgetRow[]
  transactions: Transaction[]
  categories: Category[]
  currency: string
  month: LocalDate
  monthEnd: LocalDate
  today: LocalDate
}) {
  const budgets = effectiveBudgets(rows, month, currency)
  const spentBy = new Map(
    spendingByCategory(transactions, categories).map((c) => [c.id, c.amount]),
  )
  const names = new Map(categories.map((c) => [c.id, c.name]))
  const totalSpent = [...spentBy.values()].reduce((a, b) => a + b, 0)
  const isCurrentMonth = today >= month && today <= monthEnd

  const overall = budgets.get(OVERALL)
  const categoryBudgets = [...budgets.entries()]
    .filter(([scope]) => scope !== OVERALL)
    .map(([id, limit]) => ({
      id,
      name: names.get(id) ?? "Category",
      spent: spentBy.get(id) ?? 0,
      limit,
    }))
    // Closest to (or furthest over) its limit first.
    .sort((a, b) => b.spent / b.limit - a.spent / a.limit)

  let overallDetail: string | undefined
  if (overall !== undefined && isCurrentMonth) {
    const allowance = dailyAllowance(
      budgetStatus(totalSpent, overall).remaining,
      today,
      monthEnd,
    )
    if (allowance) {
      overallDetail = `About ${formatMoney(allowance.perDay, currency)} a day for ${allowance.days} day${allowance.days === 1 ? "" : "s"}`
    }
  }

  return (
    <DashboardCard
      title="Budgets"
      icon={Target}
      accent="peach"
      action={
        <Link
          href="/finance/budgets"
          className="text-xs font-medium text-primary underline-offset-4 hover:underline"
        >
          {budgets.size > 0 ? "Edit" : "Set budgets"}
        </Link>
      }
    >
      {budgets.size === 0 ? (
        <p className="text-sm text-muted-foreground">
          Set a monthly budget to see how your spending is pacing.
        </p>
      ) : (
        <div className="grid gap-4">
          {overall !== undefined && (
            <BudgetMeter
              label="Overall"
              spent={totalSpent}
              limit={overall}
              currency={currency}
              detail={overallDetail}
            />
          )}
          {categoryBudgets.map((b) => (
            <BudgetMeter
              key={b.id}
              label={b.name}
              spent={b.spent}
              limit={b.limit}
              currency={currency}
            />
          ))}
        </div>
      )}
    </DashboardCard>
  )
}
