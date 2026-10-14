import { CalendarDays, Sun } from "lucide-react"
import type { Metadata } from "next"
import Link from "next/link"
import { notFound } from "next/navigation"
import { Suspense } from "react"

import { EmptyState } from "@/components/empty-state"
import { BackLink } from "@/components/layout/back-link"
import { PageHeader } from "@/components/layout/page-header"
import { Section } from "@/components/layout/section"
import { buttonVariants } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { EventList } from "@/features/calendar/components/event-list"
import { DaySnapshotTasks } from "@/features/days/components/day-snapshot"
import { ReviewDisplay } from "@/features/days/components/review-display"
import { ReviewForm } from "@/features/days/components/review-form"
import { canEditReview, summaryLine } from "@/features/days/logic"
import { ensurePastDaysClosed, getDay } from "@/features/days/queries"
import { getUserToday } from "@/features/tasks/queries"
import { formatLocalDate, isLocalDate } from "@/lib/dates/local-date"
import { cn } from "@/lib/utils"

export const metadata: Metadata = { title: "A day in your history" }

export default function DayPage({ params }: PageProps<"/history/[date]">) {
  return (
    <>
      <BackLink href="/history" label="History" />
      <Suspense fallback={<Skeleton className="h-96" />}>
        <DayDetail params={params} />
      </Suspense>
    </>
  )
}

async function DayDetail({
  params,
}: Pick<PageProps<"/history/[date]">, "params">) {
  const { date } = await params
  if (!isLocalDate(date)) notFound()
  const { today } = await getUserToday()
  const title = formatLocalDate(date, "longYear")

  if (date >= today) {
    return (
      <>
        <PageHeader title={title} />
        <EmptyState icon={Sun} title="This day isn't over yet">
          <p className="mb-4">It will be saved here after midnight.</p>
          <Link
            href="/today"
            className={cn(buttonVariants({ variant: "outline" }), "h-9 px-3")}
          >
            Go to Today
          </Link>
        </EmptyState>
      </>
    )
  }

  await ensurePastDaysClosed()
  const day = await getDay(date)
  const editable = canEditReview(date, today)

  if (!day?.summary) {
    return (
      <>
        <PageHeader title={title} />
        <EmptyState icon={CalendarDays} title="Nothing was recorded this day">
          Days with tasks, events or a reflection appear in your history.
        </EmptyState>
      </>
    )
  }

  return (
    <>
      <PageHeader title={title} description={summaryLine(day.summary)} />
      <div className="grid gap-8">
        <DaySnapshotTasks summary={day.summary} />

        {day.summary.events.length > 0 && (
          <Section id="events" title="Events">
            <EventList
              label="Events"
              events={day.summary.events.map((e) => ({ ...e, notes: null }))}
              day={date}
              timezone={day.summary.timezone}
              linked={false}
            />
          </Section>
        )}

        <Section
          id="reflection"
          title="Reflection"
          description={
            editable
              ? "You can add or change this for a week after the day."
              : undefined
          }
        >
          {editable ? (
            <ReviewForm date={date} review={day} />
          ) : (
            <ReviewDisplay day={day} />
          )}
        </Section>
      </div>
    </>
  )
}
