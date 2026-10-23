"use client"

import { CloudOff, Plus } from "lucide-react"
import { useActionState, useSyncExternalStore } from "react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  type ActionState,
  idleState,
  validationError,
} from "@/lib/action-state"
import {
  isOffline,
  outboxItems,
  queueChange,
  subscribeOutbox,
  type OutboxItem,
} from "@/lib/outbox"

import { createTask } from "../actions"
import { createTaskSchema } from "../schema"

const NONE: OutboxItem[] = []
const NOT_KEPT =
  "You're offline, and this device couldn't keep the task. Please try again when you're back online."

/**
 * Keeps a task on the device while offline (validated with the same rules),
 * to be added when the connection is back.
 */
function queueTask(formData: FormData): ActionState {
  const values = {
    title: String(formData.get("title") ?? ""),
    dueDate: String(formData.get("dueDate") ?? ""),
  }
  const parsed = createTaskSchema.safeParse(values)
  if (!parsed.success) return validationError(parsed.error, values)
  const kept = queueChange({
    kind: "createTask",
    id: crypto.randomUUID(),
    title: parsed.data.title,
    dueDate: parsed.data.dueDate,
  })
  if (!kept) return { status: "error", message: NOT_KEPT, values }
  return { status: "success", values: { title: "", dueDate: values.dueDate } }
}

async function addTask(prev: ActionState, formData: FormData) {
  if (isOffline()) return queueTask(formData)
  try {
    return await createTask(prev, formData)
  } catch {
    // The connection dropped mid-request: keep it for later instead.
    return queueTask(formData)
  }
}

/** One-line task entry. With `fixedDueDate` the date is set for you (e.g. Today). */
export function QuickAddTask({
  fixedDueDate,
  defaultDueDate,
}: {
  fixedDueDate?: string
  defaultDueDate?: string
}) {
  const [state, formAction, pending] = useActionState(addTask, idleState)
  const waiting = useSyncExternalStore(
    subscribeOutbox,
    outboxItems,
    () => NONE,
  ).filter((item) => item.kind === "createTask")
  const titleError = state.fieldErrors?.title?.[0]
  const dateError = state.fieldErrors?.dueDate?.[0]
  const error =
    titleError ??
    dateError ??
    (state.status === "error" ? state.message : undefined)

  return (
    <div className="grid gap-2">
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
      {waiting.length > 0 && (
        <ul
          aria-label="Waiting to sync"
          className="grid gap-1 rounded-xl border border-dashed px-3 py-2 text-sm"
        >
          {waiting.map((item) => (
            <li key={item.key} className="flex items-center gap-2">
              <CloudOff
                className="size-4 shrink-0 text-muted-foreground"
                aria-hidden="true"
              />
              <span className="min-w-0 flex-1 truncate">
                {item.kind === "createTask" && item.title}
              </span>
              <span className="shrink-0 text-xs text-muted-foreground">
                Waiting to sync
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
