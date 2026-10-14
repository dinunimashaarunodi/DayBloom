import { ChevronLeft, ChevronRight, Plus } from "lucide-react"
import Link from "next/link"

import { buttonVariants } from "@/components/ui/button"
import type { LocalDate } from "@/lib/dates/local-date"
import { cn } from "@/lib/utils"

import type { CalendarView } from "../schema"

export function calendarHref(view: CalendarView, date: LocalDate): string {
  return `/calendar?view=${view}&date=${date}`
}

/** Title, previous/next/today navigation, view switch and "New event". */
export function CalendarToolbar({
  title,
  view,
  selected,
  previous,
  next,
  today,
}: {
  title: string
  view: CalendarView
  selected: LocalDate
  previous: LocalDate
  next: LocalDate
  today: LocalDate
}) {
  const unit = view === "month" ? "month" : "week"

  return (
    <div className="mb-4 grid gap-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-lg font-medium" aria-live="polite">
          {title}
        </h2>
        <Link
          href={`/calendar/events/new?date=${selected}`}
          className={cn(buttonVariants(), "h-9 px-3")}
        >
          <Plus aria-hidden="true" />
          New event
        </Link>
      </div>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-1">
          <Link
            href={calendarHref(view, previous)}
            aria-label={`Previous ${unit}`}
            className={cn(
              buttonVariants({ variant: "outline", size: "icon" }),
              "size-9",
            )}
          >
            <ChevronLeft />
          </Link>
          <Link
            href={calendarHref(view, today)}
            className={cn(buttonVariants({ variant: "outline" }), "h-9 px-3")}
          >
            Today
          </Link>
          <Link
            href={calendarHref(view, next)}
            aria-label={`Next ${unit}`}
            className={cn(
              buttonVariants({ variant: "outline", size: "icon" }),
              "size-9",
            )}
          >
            <ChevronRight />
          </Link>
        </div>
        <nav aria-label="Calendar view">
          <ul className="flex gap-1 rounded-lg bg-muted p-1">
            {(["month", "week"] as const).map((v) => (
              <li key={v}>
                <Link
                  href={calendarHref(v, selected)}
                  aria-current={v === view ? "page" : undefined}
                  className={cn(
                    "block rounded-md px-3 py-1 text-sm capitalize outline-none focus-visible:ring-3 focus-visible:ring-ring/50",
                    v === view
                      ? "bg-background font-medium shadow-sm"
                      : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  {v}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      </div>
    </div>
  )
}
