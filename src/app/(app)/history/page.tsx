import { History } from "lucide-react"
import type { Metadata } from "next"
import Link from "next/link"
import { Suspense } from "react"

import { EmptyState } from "@/components/empty-state"
import { PageHeader } from "@/components/layout/page-header"
import { buttonVariants } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { moodFor, summaryLine } from "@/features/days/logic"
import { ensurePastDaysClosed, getHistory } from "@/features/days/queries"
import { historyCursorSchema } from "@/features/days/schema"
import { formatLocalDate } from "@/lib/dates/local-date"
import { cn } from "@/lib/utils"

export const metadata: Metadata = { title: "History" }

export default function HistoryPage({ searchParams }: PageProps<"/history">) {
  return (
    <>
      <PageHeader
        title="History"
        description="Look back on the days you've lived and what you achieved."
      />
      <Suspense fallback={<Skeleton className="h-96" />}>
        <HistoryList searchParams={searchParams} />
      </Suspense>
    </>
  )
}

async function HistoryList({
  searchParams,
}: Pick<PageProps<"/history">, "searchParams">) {
  const before = historyCursorSchema.parse((await searchParams).before)
  await ensurePastDaysClosed()
  const { days, nextBefore } = await getHistory(before)

  if (days.length === 0) {
    return (
      <EmptyState icon={History} title="No past days yet">
        Each day is saved here after midnight, with what you planned, what you
        finished and your reflection.
      </EmptyState>
    )
  }

  return (
    <div className="grid gap-4">
      <ul aria-label="Past days" className="divide-y overflow-hidden surface">
        {days.map((day) => {
          const mood = moodFor(day.mood)
          return (
            <li key={day.local_date}>
              <Link
                href={`/history/${day.local_date}`}
                className="flex items-start gap-3 px-3 py-3 outline-none hover:bg-muted/60 focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:ring-inset"
              >
                <span className="w-6 text-center text-lg" aria-hidden="true">
                  {mood?.emoji ?? "·"}
                </span>
                <span className="grid min-w-0 flex-1 gap-0.5">
                  <span className="font-medium">
                    {formatLocalDate(day.local_date, "longYear")}
                  </span>
                  <span className="text-sm text-muted-foreground">
                    {day.summary ? summaryLine(day.summary) : ""}
                    {mood && ` · Felt ${mood.label.toLowerCase()}`}
                  </span>
                  {day.wins && (
                    <span className="truncate text-sm">{day.wins}</span>
                  )}
                </span>
              </Link>
            </li>
          )
        })}
      </ul>
      {nextBefore && (
        <Link
          href={`/history?before=${nextBefore}`}
          className={cn(
            buttonVariants({ variant: "outline" }),
            "h-10 justify-self-center px-4",
          )}
        >
          Show older days
        </Link>
      )}
    </div>
  )
}
