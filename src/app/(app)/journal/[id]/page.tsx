import { Pencil } from "lucide-react"
import type { Metadata } from "next"
import Link from "next/link"
import { notFound } from "next/navigation"
import { Suspense } from "react"

import { BackLink } from "@/components/layout/back-link"
import { PageHeader } from "@/components/layout/page-header"
import { buttonVariants } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { Skeleton } from "@/components/ui/skeleton"
import { updateEntry } from "@/features/journal/actions"
import { DeleteEntryButton } from "@/features/journal/components/delete-entry-button"
import { EntryForm } from "@/features/journal/components/entry-form"
import {
  entryHeading,
  wordCount,
  writingPrompt,
} from "@/features/journal/logic"
import { getEntry } from "@/features/journal/queries"
import { entryIdSchema } from "@/features/journal/schema"
import { getUserToday } from "@/features/tasks/queries"
import { formatLocalDate } from "@/lib/dates/local-date"
import { cn } from "@/lib/utils"

export const metadata: Metadata = { title: "Journal entry" }

export default function EntryPage(props: PageProps<"/journal/[id]">) {
  return (
    <>
      <BackLink href="/journal" label="Journal" />
      <Suspense fallback={<Skeleton className="h-96" />}>
        <Entry {...props} />
      </Suspense>
    </>
  )
}

/** Reading view; `?edit=1` shows the form instead. */
async function Entry({ params, searchParams }: PageProps<"/journal/[id]">) {
  const [{ id }, { edit }] = await Promise.all([params, searchParams])
  if (!entryIdSchema.safeParse(id).success) notFound()
  const [entry, { today }] = await Promise.all([getEntry(id), getUserToday()])
  if (!entry) notFound()

  const words = wordCount(entry.body)
  const date = formatLocalDate(entry.local_date, "longYear")

  if (edit === "1") {
    return (
      <>
        <PageHeader eyebrow={date} title="Edit entry" />
        <div className="grid max-w-2xl gap-8">
          <EntryForm
            action={updateEntry.bind(null, entry.id)}
            submitLabel="Save changes"
            today={today}
            prompt={writingPrompt(entry.local_date)}
            date={entry.local_date}
            title={entry.title ?? ""}
            body={entry.body}
          />
          <Separator />
          <DeleteEntryButton entryId={entry.id} />
        </div>
      </>
    )
  }

  return (
    <>
      <PageHeader
        eyebrow={date}
        title={entryHeading(entry)}
        description={`${words} word${words === 1 ? "" : "s"}`}
        actions={
          <Link
            href={`/journal/${entry.id}?edit=1`}
            className={cn(buttonVariants({ variant: "outline" }), "h-10 px-4")}
          >
            <Pencil aria-hidden="true" />
            Edit
          </Link>
        }
      />
      <article className="max-w-2xl surface p-5 text-base leading-relaxed break-words whitespace-pre-wrap sm:p-6">
        {entry.body}
      </article>
    </>
  )
}
