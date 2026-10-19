import {
  BarChart3,
  CalendarDays,
  Plus,
  Tags,
  Target,
  Wallet,
} from "lucide-react"
import type { Metadata } from "next"
import Link from "next/link"
import { Suspense } from "react"

import { EmptyState } from "@/components/empty-state"
import { DashboardCard } from "@/components/layout/dashboard-card"
import { PageHeader } from "@/components/layout/page-header"
import { Section } from "@/components/layout/section"
import { buttonVariants } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { createTransaction } from "@/features/finance/actions"
import { BudgetsCard } from "@/features/finance/components/budgets-card"
import { CategoryChart, DailyChart } from "@/features/finance/components/charts"
import { CurrencySetup } from "@/features/finance/components/currency-setup"
import { FinanceStats } from "@/features/finance/components/finance-stats"
import { MonthNav } from "@/features/finance/components/month-nav"
import { TransactionForm } from "@/features/finance/components/transaction-form"
import { TransactionList } from "@/features/finance/components/transaction-list"
import {
  dailySpending,
  monthRange,
  monthSummary,
  spendingByCategory,
} from "@/features/finance/logic"
import {
  getCategories,
  getBudgetRows,
  getFinanceSettings,
  getMonthTransactions,
} from "@/features/finance/queries"
import { parseMonth } from "@/features/finance/schema"
import {
  addMonths,
  formatLocalDate,
  startOfMonth,
} from "@/lib/dates/local-date"
import { currencyName, listCurrencies, suggestCurrency } from "@/lib/money"
import { cn } from "@/lib/utils"

export const metadata: Metadata = { title: "Finance" }

export default function FinancePage({ searchParams }: PageProps<"/finance">) {
  return (
    <Suspense fallback={<FinanceSkeleton />}>
      <FinanceContent searchParams={searchParams} />
    </Suspense>
  )
}

async function FinanceContent({
  searchParams,
}: Pick<PageProps<"/finance">, "searchParams">) {
  const params = await searchParams
  const { currency, timezone, today } = await getFinanceSettings()

  if (!currency) {
    return (
      <>
        <PageHeader
          title="Finance"
          description="Track what you spend and earn, and see where your money goes."
        />
        <DashboardCard title="Set up finance" icon={Wallet} accent="peach">
          <p className="-mt-1 text-sm text-muted-foreground">
            Choose the currency you use. We&apos;ll add a few starter categories
            you can change later.
          </p>
          <CurrencySetup
            suggested={suggestCurrency(timezone)}
            currencies={listCurrencies().map((code) => [
              code,
              currencyName(code),
            ])}
          />
        </DashboardCard>
      </>
    )
  }

  const thisMonth = startOfMonth(today)
  const month = parseMonth(params.month) ?? thisMonth
  const [transactions, previous, categories, budgetRows] = await Promise.all([
    getMonthTransactions(month, currency),
    getMonthTransactions(addMonths(month, -1), currency),
    getCategories(),
    getBudgetRows(),
  ])
  const summary = monthSummary(transactions)
  const byCategory = spendingByCategory(transactions, categories)
  const daily = dailySpending(transactions, month)
  const { to } = monthRange(month)
  // New entries default to today in the current month, else the month's last day.
  const defaultDate = month === thisMonth ? today : to

  return (
    <>
      <PageHeader
        eyebrow={formatLocalDate(month, "month")}
        title="Finance"
        actions={
          <>
            <MonthNav month={month} thisMonth={thisMonth} />
            <Link
              href="/finance/categories"
              className={cn(buttonVariants({ variant: "ghost" }), "h-9 px-3")}
            >
              <Tags aria-hidden="true" />
              Categories
            </Link>
            <Link
              href="/finance/budgets"
              className={cn(buttonVariants({ variant: "ghost" }), "h-9 px-3")}
            >
              <Target aria-hidden="true" />
              Budgets
            </Link>
          </>
        }
      />

      <div className="grid gap-6 md:gap-8">
        <FinanceStats
          currency={currency}
          spent={summary.spent}
          income={summary.income}
          previousSpent={monthSummary(previous).spent}
        />

        <div className="grid gap-6 md:gap-8 lg:grid-cols-[minmax(0,1fr)_22rem]">
          <aside className="order-first grid content-start gap-6 lg:order-last">
            <DashboardCard title="Add transaction" icon={Plus} accent="peach">
              <TransactionForm
                // A fresh form per month keeps the default date right.
                key={month}
                action={createTransaction}
                categories={categories.filter((c) => !c.archived_at)}
                currency={currency}
                submitLabel="Add"
                defaults={{
                  kind: "expense",
                  amount: "",
                  categoryId: "",
                  date: defaultDate,
                  note: "",
                }}
              />
            </DashboardCard>
            <BudgetsCard
              rows={budgetRows}
              transactions={transactions}
              categories={categories}
              currency={currency}
              month={month}
              monthEnd={to}
              today={today}
            />
          </aside>

          <div className="grid content-start gap-6">
            <DashboardCard
              title="Spending by category"
              icon={BarChart3}
              accent="peach"
            >
              {byCategory.length > 0 ? (
                <CategoryChart data={byCategory} currency={currency} />
              ) : (
                <p className="text-sm text-muted-foreground">
                  No spending recorded this month.
                </p>
              )}
            </DashboardCard>
            <DashboardCard
              title="Daily spending"
              icon={CalendarDays}
              accent="peach"
            >
              {summary.spent > 0 ? (
                <DailyChart data={daily} currency={currency} />
              ) : (
                <p className="text-sm text-muted-foreground">
                  Your daily spending will appear here.
                </p>
              )}
            </DashboardCard>
          </div>
        </div>

        <Section id="transactions" title="Transactions">
          {transactions.length > 0 ? (
            <TransactionList
              transactions={transactions}
              categories={categories}
            />
          ) : (
            <EmptyState
              icon={Wallet}
              accent="peach"
              title="Nothing recorded this month"
            >
              Add your first expense or income with the form above.
            </EmptyState>
          )}
        </Section>
      </div>
    </>
  )
}

function FinanceSkeleton() {
  return (
    <div className="grid gap-6" aria-hidden="true">
      <Skeleton className="h-16 w-64" />
      <div className="grid gap-4 sm:grid-cols-3">
        <Skeleton className="h-24 rounded-xl" />
        <Skeleton className="h-24 rounded-xl" />
        <Skeleton className="h-24 rounded-xl" />
      </div>
      <Skeleton className="h-72 rounded-xl" />
    </div>
  )
}
