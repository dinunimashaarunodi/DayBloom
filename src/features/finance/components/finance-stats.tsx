import { ArrowDownRight, ArrowUpRight } from "lucide-react"

import { formatMoney } from "@/lib/money"
import { cn } from "@/lib/utils"

import { percentChange } from "../logic"

function StatTile({
  label,
  value,
  children,
}: {
  label: string
  value: string
  children?: React.ReactNode
}) {
  return (
    <div className="grid content-start gap-1 surface p-4 sm:p-5">
      <p className="text-sm text-muted-foreground">{label}</p>
      <p className="text-2xl font-semibold tracking-tight tabular-nums">
        {value}
      </p>
      {children}
    </div>
  )
}

/** Spent, income and net for the month, with a calm comparison to last month. */
export function FinanceStats({
  currency,
  spent,
  income,
  previousSpent,
}: {
  currency: string
  spent: number
  income: number
  previousSpent: number
}) {
  const change = percentChange(spent, previousSpent)
  const net = income - spent

  return (
    <div className="grid gap-4 sm:grid-cols-3">
      <StatTile label="Spent" value={formatMoney(spent, currency)}>
        {change !== null && (
          <p className="flex items-center gap-1 text-xs text-muted-foreground">
            {change > 0 ? (
              <ArrowUpRight className="size-3.5" aria-hidden="true" />
            ) : (
              <ArrowDownRight className="size-3.5" aria-hidden="true" />
            )}
            {change === 0
              ? "Same as last month"
              : `${Math.abs(change)}% ${change > 0 ? "more" : "less"} than last month`}
          </p>
        )}
      </StatTile>
      <StatTile label="Income" value={formatMoney(income, currency)} />
      <StatTile
        label="Net"
        value={`${net < 0 ? "−" : ""}${formatMoney(Math.abs(net), currency)}`}
      >
        <p
          className={cn(
            "text-xs",
            net >= 0 ? "text-primary" : "text-muted-foreground",
          )}
        >
          {net >= 0 ? "Income covers spending" : "Spending is above income"}
        </p>
      </StatTile>
    </div>
  )
}
