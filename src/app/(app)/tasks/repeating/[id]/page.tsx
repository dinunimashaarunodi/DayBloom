import { CirclePause, CirclePlay } from "lucide-react"
import type { Metadata } from "next"
import { notFound } from "next/navigation"
import { Suspense } from "react"

import { BackLink } from "@/components/layout/back-link"
import { PageHeader } from "@/components/layout/page-header"
import { Section } from "@/components/layout/section"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { Skeleton } from "@/components/ui/skeleton"
import { SeriesForm } from "@/features/tasks/components/series-form"
import { dueLabel } from "@/features/tasks/logic"
import { getSeries, getUserToday } from "@/features/tasks/queries"
import { describeRepeat, nextOccurrence } from "@/features/tasks/repeat"
import { seriesIdSchema } from "@/features/tasks/schema"
import { setSeriesStopped, updateSeries } from "@/features/tasks/series-actions"

export const metadata: Metadata = { title: "Repeating task" }

export default function SeriesPage({
  params,
}: PageProps<"/tasks/repeating/[id]">) {
  return (
    <>
      <BackLink href="/tasks?view=repeating" label="Repeating tasks" />
      <Suspense fallback={<Skeleton className="h-96" />}>
        <SeriesDetail params={params} />
      </Suspense>
    </>
  )
}

async function SeriesDetail({
  params,
}: Pick<PageProps<"/tasks/repeating/[id]">, "params">) {
  const { id } = await params
  if (!seriesIdSchema.safeParse(id).success) notFound()
  const [series, { today }] = await Promise.all([getSeries(id), getUserToday()])
  if (!series) notFound()

  const next = nextOccurrence(series, today)
  const status = series.archived
    ? "Stopped"
    : next
      ? `Next: ${dueLabel(next, today)}`
      : "Finished: its end date has passed"

  return (
    <>
      <PageHeader
        eyebrow="Repeating task"
        title={series.title}
        description={`${describeRepeat(series)} · ${status}`}
      />
      <div className="grid max-w-2xl gap-8">
        {!series.archived && (
          <Section
            id="edit"
            title="Edit"
            description="Changes apply from the next repeat. Tasks already in your list stay as they are."
          >
            <SeriesForm
              action={updateSeries.bind(null, series.id)}
              submitLabel="Save changes"
              today={today}
              series={series}
            />
          </Section>
        )}

        <Separator />
        <form action={setSeriesStopped.bind(null, series.id, !series.archived)}>
          <Button type="submit" variant="outline" className="h-10 px-4">
            {series.archived ? (
              <>
                <CirclePlay aria-hidden="true" />
                Start repeating again
              </>
            ) : (
              <>
                <CirclePause aria-hidden="true" />
                Stop repeating
              </>
            )}
          </Button>
          <p className="mt-2 text-xs text-muted-foreground">
            {series.archived
              ? "It will appear again on its next scheduled day."
              : "Stopping keeps the tasks already created, and you can start it again any time."}
          </p>
        </form>
      </div>
    </>
  )
}
