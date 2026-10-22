import type { Metadata } from "next"
import { Suspense } from "react"

import { BackLink } from "@/components/layout/back-link"
import { PageHeader } from "@/components/layout/page-header"
import { Skeleton } from "@/components/ui/skeleton"
import { createEntry } from "@/features/journal/actions"
import { EntryForm } from "@/features/journal/components/entry-form"
import { writingPrompt } from "@/features/journal/logic"
import { getUserToday } from "@/features/tasks/queries"
import { isLocalDate } from "@/lib/dates/local-date"

export const metadata: Metadata = { title: "New entry" }

export default function NewEntryPage({
  searchParams,
}: PageProps<"/journal/new">) {
  return (
    <>
      <BackLink href="/journal" label="Journal" />
      <PageHeader title="New entry" />
      <div className="max-w-2xl">
        <Suspense fallback={<Skeleton className="h-80" />}>
          <NewEntry searchParams={searchParams} />
        </Suspense>
      </div>
    </>
  )
}

/** `?date=` (from a History day) preselects that day; future days aren't allowed. */
async function NewEntry({
  searchParams,
}: Pick<PageProps<"/journal/new">, "searchParams">) {
  const { date } = await searchParams
  const { today } = await getUserToday()
  const day = isLocalDate(date) && date <= today ? date : today

  return (
    <EntryForm
      action={createEntry}
      submitLabel="Save entry"
      today={today}
      date={day}
      prompt={writingPrompt(day)}
    />
  )
}
