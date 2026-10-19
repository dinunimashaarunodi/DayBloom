"use client"

// Finance charts (Recharts). Design rules from the dataviz guide:
// - one series per chart, so no legend; the card title names it
// - thin bars (<= 24px), 4px rounded data-end, square at the baseline
// - hairline solid gridlines, text in text tokens (never the bar colour)
// - hover tooltip on every bar, plus a screen-reader table with the same data
// - the bar colour (--chart-expense) is validated for both themes
import {
  Bar,
  BarChart,
  CartesianGrid,
  LabelList,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts"

import { formatLocalDate, type LocalDate } from "@/lib/dates/local-date"
import { formatMoney } from "@/lib/money"

import type { CategoryTotal, DayTotal } from "../logic"

const TICK = { fill: "var(--muted-foreground)", fontSize: 12 }

type TooltipEntry = { value?: unknown; payload?: Record<string, unknown> }

function MoneyTooltip({
  active,
  payload,
  currency,
  title,
}: {
  active?: boolean
  payload?: readonly TooltipEntry[]
  currency: string
  title: (entry: Record<string, unknown>) => string
}) {
  const entry = payload?.[0]
  if (!active || !entry) return null
  return (
    <div className="surface px-3 py-2 text-xs shadow-lift">
      <p className="text-muted-foreground">{title(entry.payload ?? {})}</p>
      <p className="font-medium tabular-nums">
        {formatMoney(Number(entry.value), currency)}
      </p>
    </div>
  )
}

export function CategoryChart({
  data,
  currency,
}: {
  data: CategoryTotal[]
  currency: string
}) {
  const height = data.length * 36 + 8

  return (
    <figure className="grid gap-2">
      <div style={{ height }} aria-hidden="true">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={data}
            layout="vertical"
            margin={{ top: 0, right: 76, bottom: 0, left: 0 }}
            barCategoryGap={10}
          >
            <XAxis type="number" hide domain={[0, "dataMax"]} />
            <YAxis
              type="category"
              dataKey="name"
              width={124}
              tickLine={false}
              axisLine={false}
              tick={TICK}
            />
            <Tooltip
              cursor={{ fill: "var(--muted)" }}
              content={(props) => (
                <MoneyTooltip
                  active={props.active}
                  payload={props.payload as readonly TooltipEntry[] | undefined}
                  currency={currency}
                  title={(entry) => String(entry.name)}
                />
              )}
            />
            <Bar
              dataKey="amount"
              fill="var(--chart-expense)"
              radius={[0, 4, 4, 0]}
              barSize={16}
              isAnimationActive={false}
            >
              <LabelList
                dataKey="amount"
                position="right"
                offset={8}
                formatter={(value) =>
                  formatMoney(Number(value), currency, { compact: true })
                }
                style={{ fill: "var(--muted-foreground)", fontSize: 12 }}
              />
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
      <table className="sr-only">
        <caption>Spending by category</caption>
        <thead>
          <tr>
            <th scope="col">Category</th>
            <th scope="col">Amount</th>
          </tr>
        </thead>
        <tbody>
          {data.map((row) => (
            <tr key={row.id ?? "none"}>
              <td>{row.name}</td>
              <td>{formatMoney(row.amount, currency)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </figure>
  )
}

export function DailyChart({
  data,
  currency,
}: {
  data: DayTotal[]
  currency: string
}) {
  const spendingDays = data.filter((d) => d.amount > 0)

  return (
    <figure className="grid gap-2">
      <div className="h-48" aria-hidden="true">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={data}
            margin={{ top: 8, right: 4, bottom: 0, left: 0 }}
            barCategoryGap="20%"
          >
            <CartesianGrid vertical={false} stroke="var(--border)" />
            <XAxis
              dataKey="day"
              tickLine={false}
              axisLine={{ stroke: "var(--border)" }}
              tick={TICK}
              interval="preserveStartEnd"
              minTickGap={8}
            />
            <YAxis
              width={56}
              tickLine={false}
              axisLine={false}
              tick={TICK}
              allowDecimals={false}
              tickFormatter={(value: number) =>
                formatMoney(value, currency, { compact: true })
              }
            />
            <Tooltip
              cursor={{ fill: "var(--muted)" }}
              content={(props) => (
                <MoneyTooltip
                  active={props.active}
                  payload={props.payload as readonly TooltipEntry[] | undefined}
                  currency={currency}
                  title={(entry) =>
                    formatLocalDate(entry.date as LocalDate, "short")
                  }
                />
              )}
            />
            <Bar
              dataKey="amount"
              fill="var(--chart-expense)"
              radius={[4, 4, 0, 0]}
              maxBarSize={24}
              isAnimationActive={false}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>
      <table className="sr-only">
        <caption>Spending per day</caption>
        <thead>
          <tr>
            <th scope="col">Day</th>
            <th scope="col">Amount</th>
          </tr>
        </thead>
        <tbody>
          {spendingDays.map((row) => (
            <tr key={row.date}>
              <td>{formatLocalDate(row.date, "long")}</td>
              <td>{formatMoney(row.amount, currency)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </figure>
  )
}
