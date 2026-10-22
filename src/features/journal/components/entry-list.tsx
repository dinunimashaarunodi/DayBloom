import Link from "next/link"

import { formatLocalDate } from "@/lib/dates/local-date"

import {
  entryHeading,
  excerpt,
  groupByDate,
  wordCount,
  type JournalEntry,
} from "../logic"

/** Entries grouped under their day, each linking to the full entry. */
export function EntryList({ entries }: { entries: JournalEntry[] }) {
  return (
    <div className="grid gap-6">
      {groupByDate(entries).map(({ date, entries: dayEntries }) => (
        <section key={date} aria-labelledby={`day-${date}`}>
          <h2
            id={`day-${date}`}
            className="mb-2 text-sm font-medium text-muted-foreground"
          >
            {formatLocalDate(date, "longYear")}
          </h2>
          <ul className="grid gap-2">
            {dayEntries.map((entry) => (
              <li key={entry.id}>
                <EntryLink entry={entry} />
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  )
}

export function EntryLink({ entry }: { entry: JournalEntry }) {
  const words = wordCount(entry.body)
  return (
    <Link
      href={`/journal/${entry.id}`}
      className="grid gap-1 surface p-4 transition-colors duration-200 outline-none hover:bg-muted/40 focus-visible:ring-3 focus-visible:ring-ring/50"
    >
      <span className="truncate font-medium">{entryHeading(entry)}</span>
      {entry.title && (
        <span className="line-clamp-2 text-sm text-muted-foreground">
          {excerpt(entry.body)}
        </span>
      )}
      <span className="text-xs text-muted-foreground tabular-nums">
        {words} word{words === 1 ? "" : "s"}
      </span>
    </Link>
  )
}
