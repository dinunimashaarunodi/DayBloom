import { NotebookPen } from "lucide-react"
import Link from "next/link"

import { DashboardCard } from "@/components/layout/dashboard-card"

import { entryHeading, writingPrompt } from "../logic"
import { getTodayEntries } from "../queries"

/** Today's dashboard: a prompt to write, or what you've written today. */
export async function TodayJournalCard() {
  const { today, entries } = await getTodayEntries()

  return (
    <DashboardCard
      title="Journal"
      icon={NotebookPen}
      accent="mint"
      action={
        <Link
          href="/journal/new"
          className="text-xs font-medium text-primary underline-offset-4 hover:underline"
        >
          Write
        </Link>
      }
    >
      {entries.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          {writingPrompt(today)}{" "}
          <Link
            href="/journal/new"
            className="font-medium text-primary underline-offset-4 hover:underline"
          >
            Write a few lines
          </Link>
        </p>
      ) : (
        <>
          <p className="-mt-1 text-sm text-muted-foreground tabular-nums">
            {entries.length} {entries.length === 1 ? "entry" : "entries"} today
          </p>
          <ul aria-label="Today's entries" className="grid gap-1 text-sm">
            {entries.map((entry) => (
              <li key={entry.id}>
                <Link
                  href={`/journal/${entry.id}`}
                  className="-mx-2 block truncate rounded-lg px-2 py-1.5 outline-none hover:bg-muted/60 focus-visible:ring-3 focus-visible:ring-ring/50"
                >
                  {entryHeading(entry)}
                </Link>
              </li>
            ))}
          </ul>
        </>
      )}
    </DashboardCard>
  )
}
