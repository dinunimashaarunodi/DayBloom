"use client"

import { useActionState } from "react"

import { FormField, SelectField } from "@/components/form/form-field"
import { FormMessage } from "@/components/form/form-message"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { NativeSelectOption } from "@/components/ui/native-select"
import { Textarea } from "@/components/ui/textarea"
import { idleState } from "@/lib/action-state"

import { updateTask } from "../actions"
import type { Task } from "../logic"

const PRIORITY_LABELS = { low: "Low", normal: "Normal", high: "High" } as const

export function TaskEditForm({ task }: { task: Task }) {
  const [state, formAction, pending] = useActionState(
    updateTask.bind(null, task.id),
    idleState,
  )
  const values = state.values ?? {
    title: task.title,
    notes: task.notes ?? "",
    dueDate: task.due_date ?? "",
    priority: task.priority,
  }

  return (
    <form action={formAction} className="grid gap-4" noValidate>
      <FormMessage state={state} />
      <FormField
        name="title"
        label="Task"
        maxLength={200}
        required
        defaultValue={values.title}
        errors={state.fieldErrors?.title}
      />
      <div className="grid gap-1.5">
        <Label htmlFor="notes">Notes</Label>
        <Textarea
          id="notes"
          name="notes"
          rows={4}
          maxLength={5000}
          defaultValue={values.notes}
          aria-invalid={state.fieldErrors?.notes ? true : undefined}
        />
        {state.fieldErrors?.notes && (
          <p className="text-sm text-destructive">
            {state.fieldErrors.notes[0]}
          </p>
        )}
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <FormField
          name="dueDate"
          label="Date"
          type="date"
          hint="Leave empty for no date."
          defaultValue={values.dueDate}
          errors={state.fieldErrors?.dueDate}
        />
        <SelectField
          name="priority"
          label="Priority"
          defaultValue={values.priority}
          errors={state.fieldErrors?.priority}
        >
          {Object.entries(PRIORITY_LABELS).map(([value, label]) => (
            <NativeSelectOption key={value} value={value}>
              {label}
            </NativeSelectOption>
          ))}
        </SelectField>
      </div>
      <Button
        type="submit"
        className="h-10 justify-self-start px-4"
        disabled={pending}
      >
        {pending ? "Saving…" : "Save changes"}
      </Button>
    </form>
  )
}
