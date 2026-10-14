"use client"

import { CalendarDays, Leaf, Sprout, Sun } from "lucide-react"
import Link from "next/link"
import { useOptimistic, useState, useTransition } from "react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { addDays, type LocalDate } from "@/lib/dates/local-date"

import { decideTask } from "../actions"
import { dueLabel, shouldWarnAboutMoves, type Task } from "../logic"
import type { TaskDecision } from "../schema"
import { MovedWarning } from "./moved-warning"

/**
 * Unfinished tasks from earlier days. Nothing moves until the user decides,
 * one task at a time. Ignoring the card is fine: the tasks simply wait here.
 */
export function NeedsDecisionCard({
  tasks,
  today,
}: {
  tasks: Task[]
  today: LocalDate
}) {
  const [remaining, removeOptimistic] = useOptimistic(
    tasks,
    (current, id: string) => current.filter((t) => t.id !== id),
  )
  // While one decision saves, the buttons are disabled. Next.js sends server
  // actions one at a time, and a second click queued behind the first was
  // occasionally lost; one decision at a time also keeps the list calm.
  const [saving, startTransition] = useTransition()
  const [choosingDateFor, setChoosingDateFor] = useState<string | null>(null)
  const [error, setError] = useState<string>()

  if (remaining.length === 0) return null

  function decide(task: Task, decision: TaskDecision, date?: string) {
    setError(undefined)
    startTransition(async () => {
      removeOptimistic(task.id)
      const result = await decideTask(task.id, decision, date)
      if (result.error) setError(`${task.title}: ${result.error}`)
      else setChoosingDateFor(null)
    })
  }

  const count = remaining.length

  return (
    <section
      aria-labelledby="needs-decision-heading"
      className="grid gap-4 rounded-xl border border-sage bg-sage/60 p-4 shadow-soft sm:p-5"
    >
      <div className="flex gap-3">
        <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-primary text-primary-foreground">
          <Sprout className="size-4.5" aria-hidden="true" />
        </span>
        <div className="grid gap-0.5">
          <h2 id="needs-decision-heading" className="font-medium">
            {count === 1
              ? "1 task from an earlier day wasn't finished"
              : `${count} tasks from earlier days weren't finished`}
          </h2>
          <p className="text-sm text-sage-ink">
            That&apos;s okay. Let&apos;s decide what to do with each one.
          </p>
        </div>
      </div>

      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}

      <ul aria-label="Needs a decision" className="grid gap-2">
        {remaining.map((task) => (
          <li
            key={task.id}
            className="grid gap-2.5 rounded-lg border bg-card p-3 shadow-soft"
          >
            <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
              <Link
                href={`/tasks/${task.id}`}
                className="min-w-0 truncate rounded-sm font-medium outline-none hover:underline focus-visible:ring-3 focus-visible:ring-ring/50"
              >
                {task.title}
              </Link>
              <span className="flex items-center gap-2 text-xs text-muted-foreground">
                {dueLabel(task.due_date, today)}
                {shouldWarnAboutMoves(task) && (
                  <MovedWarning timesMoved={task.times_moved} compact />
                )}
              </span>
            </div>

            {choosingDateFor === task.id ? (
              <form
                className="flex flex-wrap items-center gap-2"
                onSubmit={(event) => {
                  event.preventDefault()
                  const date = new FormData(event.currentTarget).get("date")
                  decide(
                    task,
                    "date",
                    typeof date === "string" ? date : undefined,
                  )
                }}
              >
                <Input
                  type="date"
                  name="date"
                  aria-label={`New date for ${task.title}`}
                  min={today}
                  defaultValue={addDays(today, 1)}
                  required
                  className="h-9 w-auto"
                />
                <Button type="submit" className="h-9 px-3" disabled={saving}>
                  Save date
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  className="h-9 px-3"
                  onClick={() => setChoosingDateFor(null)}
                >
                  Cancel
                </Button>
              </form>
            ) : (
              <div
                className="flex flex-wrap gap-2"
                role="group"
                aria-label={`Decide: ${task.title}`}
              >
                <Button
                  className="h-9 px-3"
                  disabled={saving}
                  onClick={() => decide(task, "today")}
                >
                  <Sun aria-hidden="true" />
                  Do it today
                </Button>
                <Button
                  variant="outline"
                  className="h-9 px-3"
                  disabled={saving}
                  onClick={() => setChoosingDateFor(task.id)}
                >
                  <CalendarDays aria-hidden="true" />
                  Choose a date
                </Button>
                <Button
                  variant="ghost"
                  className="h-9 px-3"
                  disabled={saving}
                  onClick={() => decide(task, "letGo")}
                >
                  <Leaf aria-hidden="true" />
                  Let it go
                </Button>
              </div>
            )}
          </li>
        ))}
      </ul>
    </section>
  )
}
