"use client"

import { X } from "lucide-react"
import { useOptimistic, useState, useTransition } from "react"

import { Button } from "@/components/ui/button"
import { formatLocalDate } from "@/lib/dates/local-date"
import { formatMinutes } from "@/lib/duration"

import { deletePractice } from "../actions"
import { activityLabel, type Practice } from "../logic"

/** Recent practice, newest first; entries can be removed (e.g. logged twice). */
export function PracticeList({ practice }: { practice: Practice[] }) {
  const [items, remove] = useOptimistic(practice, (current, id: string) =>
    current.filter((p) => p.id !== id),
  )
  const [saving, startTransition] = useTransition()
  const [error, setError] = useState<string>()

  return (
    <div className="grid gap-2">
      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}
      <ul
        aria-label="Recent practice"
        className="divide-y overflow-hidden surface"
      >
        {items.map((p) => {
          const label = `${activityLabel(p.activity)}, ${formatLocalDate(p.local_date, "short")}`
          return (
            <li key={p.id} className="flex items-center gap-3 px-4 py-2.5">
              <span className="grid min-w-0 flex-1 gap-0.5">
                <span className="text-sm font-medium">
                  {activityLabel(p.activity)}
                </span>
                <span className="truncate text-xs text-muted-foreground">
                  {formatLocalDate(p.local_date, "short")}
                  {p.notes && ` · ${p.notes}`}
                </span>
              </span>
              <span className="shrink-0 text-sm tabular-nums">
                {formatMinutes(p.minutes)}
              </span>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="size-9 shrink-0 text-muted-foreground"
                disabled={saving}
                aria-label={`Remove practice: ${label}`}
                onClick={() =>
                  startTransition(async () => {
                    remove(p.id)
                    setError((await deletePractice(p.id)).error)
                  })
                }
              >
                <X aria-hidden="true" />
              </Button>
            </li>
          )
        })}
      </ul>
    </div>
  )
}
