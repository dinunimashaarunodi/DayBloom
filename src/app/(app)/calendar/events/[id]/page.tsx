import type { Metadata } from "next"
import { notFound } from "next/navigation"
import { Suspense } from "react"

import { BackLink } from "@/components/layout/back-link"
import { PageHeader } from "@/components/layout/page-header"
import { Separator } from "@/components/ui/separator"
import { Skeleton } from "@/components/ui/skeleton"
import { updateEvent } from "@/features/calendar/actions"
import { DeleteEventButton } from "@/features/calendar/components/delete-event-button"
import { EventForm } from "@/features/calendar/components/event-form"
import { eventToFormValues } from "@/features/calendar/logic"
import { getEvent } from "@/features/calendar/queries"
import { eventIdSchema } from "@/features/calendar/schema"
import { getUserToday } from "@/features/tasks/queries"

export const metadata: Metadata = { title: "Edit event" }

export default function EventPage({
  params,
}: PageProps<"/calendar/events/[id]">) {
  return (
    <>
      <BackLink href="/calendar" label="Calendar" />
      <PageHeader title="Edit event" />
      <Suspense fallback={<Skeleton className="h-80" />}>
        <EventEditor params={params} />
      </Suspense>
    </>
  )
}

async function EventEditor({
  params,
}: Pick<PageProps<"/calendar/events/[id]">, "params">) {
  const { id } = await params
  if (!eventIdSchema.safeParse(id).success) notFound()
  const [event, { timezone }] = await Promise.all([
    getEvent(id),
    getUserToday(),
  ])
  if (!event) notFound()

  return (
    <div className="grid gap-6">
      <EventForm
        action={updateEvent.bind(null, event.id)}
        submitLabel="Save changes"
        timezone={timezone}
        defaults={eventToFormValues(event, timezone)}
      />
      <Separator />
      <DeleteEventButton eventId={event.id} />
    </div>
  )
}
