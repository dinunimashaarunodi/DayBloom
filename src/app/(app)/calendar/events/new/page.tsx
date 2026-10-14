import type { Metadata } from "next"
import { Suspense } from "react"

import { BackLink } from "@/components/layout/back-link"
import { PageHeader } from "@/components/layout/page-header"
import { Skeleton } from "@/components/ui/skeleton"
import { createEvent } from "@/features/calendar/actions"
import { EventForm } from "@/features/calendar/components/event-form"
import { getUserToday } from "@/features/tasks/queries"
import { isLocalDate } from "@/lib/dates/local-date"

export const metadata: Metadata = { title: "New event" }

export default function NewEventPage({
  searchParams,
}: PageProps<"/calendar/events/new">) {
  return (
    <>
      <BackLink href="/calendar" label="Calendar" />
      <PageHeader title="New event" />
      <Suspense fallback={<Skeleton className="h-80" />}>
        <NewEventForm searchParams={searchParams} />
      </Suspense>
    </>
  )
}

async function NewEventForm({
  searchParams,
}: Pick<PageProps<"/calendar/events/new">, "searchParams">) {
  const { date } = await searchParams
  const { today, timezone } = await getUserToday()

  return (
    <EventForm
      action={createEvent}
      submitLabel="Add event"
      timezone={timezone}
      defaults={{
        title: "",
        notes: "",
        allDay: "",
        date: isLocalDate(date) ? date : today,
        endDate: "",
        startTime: "09:00",
        endTime: "10:00",
      }}
    />
  )
}
