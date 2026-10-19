import { CircleCheck, TriangleAlert } from "lucide-react"

import { formatMoney } from "@/lib/money"
import { cn } from "@/lib/utils"

import { budgetStatus } from "../budgets"

/**
 * One budget's progress, laid out to fit a narrow column. Status is never
 * colour alone: the line under the bar says how much is left or over, with
 * a matching icon.
 */
export function BudgetMeter({
  label,
  spent,
  limit,
  currency,
  detail,
}: {
  label: string
  spent: number
  limit: number
  currency: string
  /** Optional extra line, e.g. a daily allowance. */
  detail?: string
}) {
  const { ratio, remaining, state } = budgetStatus(spent, limit)
  const percent = Math.round(ratio * 100)
  const limitText = formatMoney(limit, currency)

  return (
    <div className="grid gap-1.5">
      <div className="flex items-baseline justify-between gap-3 text-sm">
        <span className="min-w-0 truncate font-medium">{label}</span>
        <span className="shrink-0 text-muted-foreground tabular-nums">
          {percent}%
        </span>
      </div>
      <div
        role="progressbar"
        aria-label={`${label} budget`}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.min(100, percent)}
        aria-valuetext={`${formatMoney(spent, currency)} of ${limitText} used`}
        className="h-2 overflow-hidden rounded-full bg-muted"
      >
        <div
          className={cn(
            "h-full rounded-full transition-[width] duration-500 ease-out",
            state === "ok" ? "bg-primary" : "bg-warning",
          )}
          style={{ width: `${Math.min(100, percent)}%` }}
        />
      </div>
      <p
        className={cn(
          "flex items-start gap-1 text-xs tabular-nums",
          state === "ok" ? "text-muted-foreground" : "text-warning",
        )}
      >
        {state === "ok" ? (
          <CircleCheck className="mt-px size-3.5 shrink-0" aria-hidden="true" />
        ) : (
          <TriangleAlert
            className="mt-px size-3.5 shrink-0"
            aria-hidden="true"
          />
        )}
        <span>
          {state === "over"
            ? `${formatMoney(-remaining, currency)} over`
            : `${formatMoney(remaining, currency)} left`}{" "}
          <span className="text-muted-foreground">of {limitText}</span>
        </span>
      </p>
      {detail && <p className="text-xs text-muted-foreground">{detail}</p>}
    </div>
  )
}
