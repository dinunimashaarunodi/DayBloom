import { History, NotebookPen, Plus, Search, SearchX } from "lucide-react"
import type { Metadata } from "next"
import Link from "next/link"
import { Suspense } from "react"

import { EmptyState } from "@/components/empty-state"
import { PageHeader } from "@/components/layout/page-header"
import { Button, buttonVariants } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Skeleton } from "@/components/ui/skeleton"
import { EntryList } from "@/features/journal/components/entry-list"
import { PAGE_SIZE, getEntries } from "@/features/journal/queries"
import { searchQuerySchema } from "@/features/journal/schema"
import { cn } from "@/lib/utils"

export const metadata: Metadata = { title: "Journal" }

export default function JournalPage({ searchParams }: PageProps<"/journal">) {
  return (
    <>
      <PageHeader
        title="Journal"
        description="A private place for your thoughts. Only you can read it."
        actions={
          <>
            {/* A shortcut to History, which on mobile sits under More. */}
            <Link
              href="/history"
              className={cn(
                buttonVariants({ variant: "outline" }),
                "h-10 px-4",
              )}
            >
              <History aria-hidden="true" />
              Past days
            </Link>
            <Link
              href="/journal/new"
              className={cn(buttonVariants(), "h-10 px-4")}
            >
              <Plus aria-hidden="true" />
              New entry
            </Link>
          </>
        }
      />
      <Suspense fallback={<JournalSkeleton />}>
        <Entries searchParams={searchParams} />
      </Suspense>
    </>
  )
}

function pageCount(value: string | string[] | undefined) {
  const n = Number(Array.isArray(value) ? value[0] : value)
  return Number.isInteger(n) && n >= 1 && n <= 50 ? n : 1
}

async function Entries({
  searchParams,
}: Pick<PageProps<"/journal">, "searchParams">) {
  const params = await searchParams
  const query = searchQuerySchema.parse(
    Array.isArray(params.q) ? params.q[0] : params.q,
  )
  const pages = pageCount(params.pages)
  const { entries, hasMore } = await getEntries({
    query,
    limit: pages * PAGE_SIZE,
  })

  if (entries.length === 0 && !query) {
    return (
      <EmptyState
        icon={NotebookPen}
        accent="mint"
        title="Your journal is empty"
        action={
          <Link
            href="/journal/new"
            className={cn(buttonVariants(), "h-10 px-4")}
          >
            Write your first entry
          </Link>
        }
      >
        A few lines a day is plenty. Write about anything you like.
      </EmptyState>
    )
  }

  const more = new URLSearchParams({ pages: String(pages + 1) })
  if (query) more.set("q", query)

  return (
    <div className="grid gap-6">
      <form
        role="search"
        action="/journal"
        className="flex max-w-md gap-2"
        aria-label="Search your journal"
      >
        <Input
          type="search"
          name="q"
          defaultValue={query ?? ""}
          placeholder="Search your entries"
          aria-label="Search your entries"
          maxLength={100}
          className="h-10 md:h-9"
        />
        <Button
          type="submit"
          variant="outline"
          className="h-10 shrink-0 px-4 md:h-9"
        >
          <Search aria-hidden="true" />
          Search
        </Button>
      </form>

      {query && (
        <p className="text-sm text-muted-foreground" role="status">
          {entries.length === 0
            ? "No entries match"
            : `${entries.length}${hasMore ? "+" : ""} ${entries.length === 1 ? "entry matches" : "entries match"}`}{" "}
          &ldquo;{query}&rdquo;.{" "}
          <Link
            href="/journal"
            className="font-medium text-primary underline-offset-4 hover:underline"
          >
            Clear search
          </Link>
        </p>
      )}

      {entries.length === 0 ? (
        <EmptyState icon={SearchX} accent="mint" title="Nothing found">
          Try a different word.
        </EmptyState>
      ) : (
        <EntryList entries={entries} />
      )}

      {hasMore && (
        <Link
          href={`/journal?${more}`}
          scroll={false}
          className={cn(
            buttonVariants({ variant: "outline" }),
            "h-10 justify-self-start px-4",
          )}
        >
          Show older entries
        </Link>
      )}
    </div>
  )
}

function JournalSkeleton() {
  return (
    <div className="grid gap-3" aria-hidden="true">
      <Skeleton className="h-10 max-w-md" />
      <Skeleton className="h-24 rounded-xl" />
      <Skeleton className="h-24 rounded-xl" />
    </div>
  )
}
