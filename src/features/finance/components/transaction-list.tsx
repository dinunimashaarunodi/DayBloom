import Link from "next/link"

import { formatLocalDate } from "@/lib/dates/local-date"
import { formatMoney } from "@/lib/money"
import { cn } from "@/lib/utils"

import {
  groupByDay,
  UNCATEGORIZED,
  type Category,
  type Transaction,
} from "../logic"

/** The month's transactions grouped by day; each opens its edit page. */
export function TransactionList({
  transactions,
  categories,
}: {
  transactions: Transaction[]
  categories: Category[]
}) {
  const names = new Map(categories.map((c) => [c.id, c.name]))

  return (
    <div className="grid gap-4">
      {groupByDay(transactions).map(({ date, items }) => {
        const label = formatLocalDate(date, "long")
        return (
          <section key={date} aria-label={label} className="grid gap-2">
            <h3 className="text-sm font-medium text-muted-foreground">
              {label}
            </h3>
            <ul
              aria-label={`Transactions on ${label}`}
              className="divide-y overflow-hidden surface"
            >
              {items.map((t) => (
                <li key={t.id}>
                  <Link
                    href={`/finance/transactions/${t.id}`}
                    className="flex items-center gap-3 px-4 py-3 transition-colors duration-200 outline-none hover:bg-muted/40 focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:ring-inset"
                  >
                    <span className="grid min-w-0 flex-1 gap-0.5">
                      <span className="truncate">
                        {(t.category_id && names.get(t.category_id)) ||
                          UNCATEGORIZED}
                      </span>
                      {t.note && (
                        <span className="truncate text-xs text-muted-foreground">
                          {t.note}
                        </span>
                      )}
                    </span>
                    <span
                      className={cn(
                        "shrink-0 font-medium tabular-nums",
                        t.kind === "income" && "text-primary",
                      )}
                    >
                      {t.kind === "income" ? "+" : "−"}
                      {formatMoney(t.amount_minor, t.currency)}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        )
      })}
    </div>
  )
}
