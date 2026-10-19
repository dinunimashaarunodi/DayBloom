import { Wallet } from "lucide-react"
import Link from "next/link"

import { DashboardCard } from "@/components/layout/dashboard-card"
import { startOfMonth } from "@/lib/dates/local-date"
import { formatMoney } from "@/lib/money"

import { budgetStatus, effectiveBudgets, OVERALL } from "../budgets"
import { sumByKind } from "../logic"
import {
  getBudgetRows,
  getFinanceSettings,
  getMonthTransactions,
} from "../queries"

/** Today's dashboard card: real spending today and this month. */
export async function SpendingCard() {
  const { currency, today } = await getFinanceSettings()

  if (!currency) {
    return (
      <DashboardCard title="Spending" icon={Wallet} accent="peach">
        <p className="text-sm text-muted-foreground">
          Track where your money goes.{" "}
          <Link
            href="/finance"
            className="font-medium text-primary underline-offset-4 hover:underline"
          >
            Set up finance
          </Link>
        </p>
      </DashboardCard>
    )
  }

  const monthStart = startOfMonth(today)
  const [month, budgetRows] = await Promise.all([
    getMonthTransactions(monthStart, currency),
    getBudgetRows(),
  ])
  const spentThisMonth = sumByKind(month, "expense")
  const overall = effectiveBudgets(budgetRows, monthStart, currency).get(
    OVERALL,
  )
  const budget =
    overall === undefined ? null : budgetStatus(spentThisMonth, overall)
  const spentToday = sumByKind(
    month.filter((t) => t.occurred_on === today),
    "expense",
  )

  return (
    <DashboardCard
      title="Spending"
      icon={Wallet}
      accent="peach"
      action={
        <Link
          href="/finance"
          className="text-xs font-medium text-primary underline-offset-4 hover:underline"
        >
          Finance
        </Link>
      }
    >
      <p className="flex items-baseline gap-1.5">
        <span className="text-2xl font-semibold tabular-nums">
          {formatMoney(spentToday, currency)}
        </span>
        <span className="text-sm text-muted-foreground">today</span>
      </p>
      <p className="text-sm text-muted-foreground tabular-nums">
        {formatMoney(spentThisMonth, currency)} this month
      </p>
      {budget && (
        <p className="text-sm text-muted-foreground tabular-nums">
          {budget.state === "over"
            ? `${formatMoney(-budget.remaining, currency)} over the monthly budget`
            : `${Math.round(budget.ratio * 100)}% of the monthly budget used`}
        </p>
      )}
    </DashboardCard>
  )
}
