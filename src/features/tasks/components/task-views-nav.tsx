import Link from "next/link"

import { cn } from "@/lib/utils"

import type { TaskView } from "../schema"

const VIEWS: { view: TaskView; label: string }[] = [
  { view: "today", label: "Today" },
  { view: "upcoming", label: "Upcoming" },
  { view: "someday", label: "No date" },
  { view: "done", label: "Done" },
]

export function TaskViewsNav({ current }: { current: TaskView }) {
  return (
    <nav aria-label="Task lists" className="mb-4">
      <ul className="flex gap-1 overflow-x-auto rounded-lg bg-muted p-1">
        {VIEWS.map(({ view, label }) => (
          <li key={view} className="flex-1">
            <Link
              href={`/tasks?view=${view}`}
              aria-current={view === current ? "page" : undefined}
              className={cn(
                "block rounded-md px-3 py-1.5 text-center text-sm whitespace-nowrap outline-none focus-visible:ring-3 focus-visible:ring-ring/50",
                view === current
                  ? "bg-background font-medium shadow-sm"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              {label}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  )
}
