import type { Metadata } from "next"
import { redirect } from "next/navigation"
import { Suspense } from "react"

import { BackLink } from "@/components/layout/back-link"
import { PageHeader } from "@/components/layout/page-header"
import { Skeleton } from "@/components/ui/skeleton"
import { effectiveBudgets, OVERALL } from "@/features/finance/budgets"
import { BudgetForm } from "@/features/finance/components/budget-form"
import {
  getBudgetRows,
  getCategories,
  getFinanceSettings,
} from "@/features/finance/queries"
import { formatLocalDate, startOfMonth } from "@/lib/dates/local-date"
import { minorToInput } from "@/lib/money"

export const metadata: Metadata = { title: "Budgets" }

export default function BudgetsPage() {
  return (
    <>
      <BackLink href="/finance" label="Finance" />
      <Suspense fallback={<Skeleton className="h-96" />}>
        <Budgets />
      </Suspense>
    </>
  )
}

async function Budgets() {
  const [{ currency, today }, rows, categories] = await Promise.all([
    getFinanceSettings(),
    getBudgetRows(),
    getCategories(),
  ])
  if (!currency) redirect("/finance")

  const month = startOfMonth(today)
  const budgets = effectiveBudgets(rows, month, currency)
  const amount = (scope: string) => {
    const value = budgets.get(scope)
    return value === undefined ? "" : minorToInput(value, currency)
  }
  const expenseCategories = categories.filter(
    (c) => c.kind === "expense" && !c.archived_at,
  )

  return (
    <>
      <PageHeader
        title="Budgets"
        description={`Monthly limits from ${formatLocalDate(month, "month")} onwards. Earlier months keep their own budgets. Leave an amount empty to remove a budget.`}
      />
      <div className="grid max-w-2xl gap-6">
        <section aria-label="Overall budget" className="grid gap-2">
          <h2 className="font-medium">Overall</h2>
          <div className="surface">
            <BudgetForm
              categoryId={null}
              label="All spending"
              currency={currency}
              amount={amount(OVERALL)}
            />
          </div>
        </section>
        <section aria-label="Category budgets" className="grid gap-2">
          <h2 className="font-medium">By category</h2>
          <div className="divide-y surface">
            {expenseCategories.map((category) => (
              <BudgetForm
                key={category.id}
                categoryId={category.id}
                label={category.name}
                currency={currency}
                amount={amount(category.id)}
              />
            ))}
          </div>
        </section>
      </div>
    </>
  )
}
