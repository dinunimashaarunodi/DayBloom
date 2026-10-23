import { BookOpen } from "lucide-react"
import type { Metadata } from "next"
import { notFound } from "next/navigation"
import { Suspense } from "react"

import { EmptyState } from "@/components/empty-state"
import { BackLink } from "@/components/layout/back-link"
import { PageHeader } from "@/components/layout/page-header"
import { Skeleton } from "@/components/ui/skeleton"
import { Flashcards } from "@/features/languages/components/flashcards"
import { nextReviewDay, reviewDeck } from "@/features/languages/logic"
import { getLanguage } from "@/features/languages/queries"
import { idSchema } from "@/features/languages/schema"
import { getUserToday } from "@/features/tasks/queries"
import { formatLocalDate } from "@/lib/dates/local-date"

export const metadata: Metadata = { title: "Review words" }

export default function ReviewPage({
  params,
}: PageProps<"/languages/[id]/review">) {
  return (
    <Suspense fallback={<Skeleton className="h-80" />}>
      <Review params={params} />
    </Suspense>
  )
}

async function Review({
  params,
}: Pick<PageProps<"/languages/[id]/review">, "params">) {
  const { id } = await params
  if (!idSchema.safeParse(id).success) notFound()
  const [detail, { today }] = await Promise.all([
    getLanguage(id),
    getUserToday(),
  ])
  if (!detail) notFound()
  // Shuffled here (request time, after the database read) so the client's
  // first render matches the server's.
  const deck = reviewDeck(detail.words, today)
  const next = nextReviewDay(detail.words, today)
  const back = `/languages/${id}`

  return (
    <>
      <BackLink href={back} label={detail.language.name} />
      <PageHeader title="Review words" description={detail.language.name} />
      <div className="max-w-xl">
        {deck.length === 0 ? (
          <EmptyState icon={BookOpen} accent="lavender" title="All caught up">
            {next
              ? `Nothing is due today. Your next review is on ${formatLocalDate(next, "long")}.`
              : "There's nothing left to review. Add new words as you meet them."}
          </EmptyState>
        ) : (
          <Flashcards deck={deck} backHref={back} />
        )}
      </div>
    </>
  )
}
