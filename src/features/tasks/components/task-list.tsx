"use client"

import { ChevronDown, ChevronUp, Repeat } from "lucide-react"
import Link from "next/link"
import { useOptimistic, useState, useTransition } from "react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import type { LocalDate } from "@/lib/dates/local-date"
import { cn } from "@/lib/utils"

import { reorderTasks, setTaskDone } from "../actions"
import { dueLabel, isOverdue, shouldWarnAboutMoves, type Task } from "../logic"
import { MovedWarning } from "./moved-warning"

export function TaskList({
  tasks,
  today,
  reorderable = false,
  hideDueToday = false,
  hideDue = false,
  label,
}: {
  tasks: Task[]
  today: LocalDate
  /** Show move up/down buttons (manual order). */
  reorderable?: boolean
  /** Don't repeat "Today" on a list that is all today's tasks. */
  hideDueToday?: boolean
  /** Never show the due date (e.g. a single day on the calendar). */
  hideDue?: boolean
  label: string
}) {
  const [optimisticTasks, applyOptimistic] = useOptimistic(tasks)
  // Controls are disabled while a change saves: Next.js sends server actions
  // one at a time, and a second change queued behind the first could be lost.
  const [saving, startTransition] = useTransition()
  const [error, setError] = useState<string>()

  function toggle(task: Task, done: boolean) {
    startTransition(async () => {
      applyOptimistic((current) =>
        current.map((t) =>
          t.id === task.id ? { ...t, status: done ? "done" : "todo" } : t,
        ),
      )
      const result = await setTaskDone(task.id, done)
      setError(result.error)
    })
  }

  function move(index: number, delta: -1 | 1) {
    const next = [...optimisticTasks]
    const [item] = next.splice(index, 1)
    next.splice(index + delta, 0, item)
    startTransition(async () => {
      applyOptimistic(next)
      const result = await reorderTasks(next.map((t) => t.id))
      setError(result.error)
    })
  }

  return (
    <div className="grid gap-2">
      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}
      <ul aria-label={label} className="divide-y overflow-hidden surface">
        {optimisticTasks.map((task, index) => {
          const done = task.status === "done"
          const showDue =
            !hideDue &&
            task.due_date &&
            !(hideDueToday && task.due_date === today)
          return (
            <li
              key={task.id}
              className="flex items-center gap-3 px-4 py-3 transition-colors duration-200 hover:bg-muted/40"
            >
              <Checkbox
                className="size-5 rounded-md"
                disabled={saving}
                checked={done}
                onCheckedChange={(checked) => toggle(task, checked === true)}
                aria-label={`${done ? "Mark as not done" : "Mark as done"}: ${task.title}`}
              />
              <div className="grid min-w-0 flex-1 gap-0.5">
                <div className="flex min-w-0 items-center gap-1.5">
                  <Link
                    href={`/tasks/${task.id}`}
                    className={cn(
                      "truncate rounded-sm outline-none hover:underline focus-visible:ring-3 focus-visible:ring-ring/50",
                      done && "text-muted-foreground line-through",
                    )}
                  >
                    {task.title}
                  </Link>
                  {task.series_id && (
                    <Repeat
                      className="size-3.5 shrink-0 text-muted-foreground"
                      aria-label="Repeating task"
                      role="img"
                    />
                  )}
                </div>
                {(showDue ||
                  task.priority !== "normal" ||
                  shouldWarnAboutMoves(task)) && (
                  <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground">
                    {showDue && (
                      <span
                        className={cn(
                          isOverdue(task, today) && "text-foreground",
                        )}
                      >
                        {dueLabel(task.due_date, today)}
                      </span>
                    )}
                    {task.priority === "high" && (
                      <Badge variant="secondary">High priority</Badge>
                    )}
                    {task.priority === "low" && <span>Low priority</span>}
                    {shouldWarnAboutMoves(task) && (
                      <MovedWarning timesMoved={task.times_moved} compact />
                    )}
                  </div>
                )}
              </div>
              {reorderable && optimisticTasks.length > 1 && (
                <div className="flex shrink-0">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="size-9"
                    aria-label={`Move up: ${task.title}`}
                    disabled={saving || index === 0}
                    onClick={() => move(index, -1)}
                  >
                    <ChevronUp />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="size-9"
                    aria-label={`Move down: ${task.title}`}
                    disabled={saving || index === optimisticTasks.length - 1}
                    onClick={() => move(index, 1)}
                  >
                    <ChevronDown />
                  </Button>
                </div>
              )}
            </li>
          )
        })}
      </ul>
    </div>
  )
}
