"use client"

import { Plus } from "lucide-react"
import { useActionState } from "react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { idleState } from "@/lib/action-state"

import { createTask } from "../actions"

/** One-line task entry. With `fixedDueDate` the date is set for you (e.g. Today). */
export function QuickAddTask({
  fixedDueDate,
  defaultDueDate,
}: {
  fixedDueDate?: string
  defaultDueDate?: string
}) {
  const [state, formAction, pending] = useActionState(createTask, idleState)
  const titleError = state.fieldErrors?.title?.[0]
  const dateError = state.fieldErrors?.dueDate?.[0]
  const error =
    titleError ??
    dateError ??
    (state.status === "error" ? state.message : undefined)

  return (
    <form action={formAction} className="grid gap-1.5" noValidate>
      <div className="flex flex-wrap gap-2">
        <Input
          name="title"
          aria-label="New task"
          placeholder="Add a task…"
          autoComplete="off"
          maxLength={200}
          defaultValue={state.values?.title}
          aria-invalid={titleError ? true : undefined}
          aria-describedby={error ? "quick-add-error" : undefined}
          className="h-10 min-w-0 flex-1 basis-48"
        />
        {fixedDueDate !== undefined ? (
          <input type="hidden" name="dueDate" value={fixedDueDate} />
        ) : (
          <Input
            type="date"
            name="dueDate"
            aria-label="Due date (optional)"
            defaultValue={state.values?.dueDate ?? defaultDueDate}
            aria-invalid={dateError ? true : undefined}
            className="h-10 w-auto"
          />
        )}
        <Button type="submit" className="h-10 px-4" disabled={pending}>
          <Plus aria-hidden="true" />
          Add
        </Button>
      </div>
      {error && (
        <p
          id="quick-add-error"
          role="alert"
          className="text-sm text-destructive"
        >
          {error}
        </p>
      )}
    </form>
  )
}
