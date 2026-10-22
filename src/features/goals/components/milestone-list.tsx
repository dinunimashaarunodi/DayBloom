"use client"

import { Plus, X } from "lucide-react"
import { useActionState, useOptimistic, useState, useTransition } from "react"

import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { idleState } from "@/lib/action-state"
import { cn } from "@/lib/utils"

import { addMilestone, deleteMilestone, setMilestoneDone } from "../actions"
import type { Milestone } from "../logic"

type Change = { id: string; done?: boolean; removed?: boolean }

/**
 * A goal's checklist: tick, remove and add milestones. Controls are disabled
 * while a change saves (Next.js sends actions one at a time).
 */
export function MilestoneList({
  goalId,
  milestones,
  editable,
}: {
  goalId: string
  milestones: Milestone[]
  /** False for archived goals: shown read-only. */
  editable: boolean
}) {
  const [optimistic, apply] = useOptimistic(
    milestones,
    (current, change: Change) =>
      change.removed
        ? current.filter((m) => m.id !== change.id)
        : current.map((m) =>
            m.id === change.id ? { ...m, done: change.done ?? m.done } : m,
          ),
  )
  const [saving, startTransition] = useTransition()
  const [error, setError] = useState<string>()
  const [addState, addAction, adding] = useActionState(
    addMilestone.bind(null, goalId),
    idleState,
  )
  const busy = saving || adding

  function run(change: Change, save: () => Promise<{ error?: string }>) {
    startTransition(async () => {
      apply(change)
      setError((await save()).error)
    })
  }

  return (
    <div className="grid gap-3">
      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}
      {optimistic.length > 0 && (
        <ul
          aria-label="Milestones"
          className="divide-y overflow-hidden surface"
        >
          {optimistic.map((m) => (
            <li key={m.id} className="flex items-center gap-3 px-4 py-2.5">
              <Checkbox
                className="size-5 rounded-md"
                disabled={busy || !editable}
                checked={m.done}
                onCheckedChange={(checked) =>
                  run({ id: m.id, done: checked === true }, () =>
                    setMilestoneDone(m.id, checked === true),
                  )
                }
                aria-label={`${m.done ? "Mark as not done" : "Mark as done"}: ${m.title}`}
              />
              <span
                className={cn(
                  "min-w-0 flex-1 text-sm break-words",
                  m.done && "text-muted-foreground line-through",
                )}
              >
                {m.title}
              </span>
              {editable && (
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="size-9 shrink-0 text-muted-foreground"
                  disabled={busy}
                  aria-label={`Remove milestone: ${m.title}`}
                  onClick={() =>
                    run({ id: m.id, removed: true }, () =>
                      deleteMilestone(m.id),
                    )
                  }
                >
                  <X aria-hidden="true" />
                </Button>
              )}
            </li>
          ))}
        </ul>
      )}
      {editable && (
        // React resets the field after each submit; on errors it refills.
        <form action={addAction} className="grid gap-1.5" noValidate>
          <div className="flex gap-2">
            <Input
              name="title"
              aria-label="New milestone"
              placeholder="Add a milestone, e.g. Run 5K without stopping"
              maxLength={100}
              autoComplete="off"
              defaultValue={addState.values?.title ?? ""}
              aria-invalid={addState.fieldErrors?.title ? true : undefined}
              className="h-10 md:h-9"
            />
            <Button
              type="submit"
              variant="outline"
              className="h-10 shrink-0 px-3 md:h-9"
              disabled={busy}
            >
              <Plus aria-hidden="true" />
              Add
            </Button>
          </div>
          {(addState.fieldErrors?.title || addState.message) && (
            <p className="text-sm text-destructive">
              {addState.fieldErrors?.title?.[0] ?? addState.message}
            </p>
          )}
        </form>
      )}
    </div>
  )
}
