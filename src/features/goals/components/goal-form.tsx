"use client"

import { useActionState } from "react"

import { FormField } from "@/components/form/form-field"
import { FormMessage } from "@/components/form/form-message"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { type ActionState, idleState } from "@/lib/action-state"

import type { Goal } from "../logic"

type GoalAction = (
  prev: ActionState,
  formData: FormData,
) => Promise<ActionState>

/** Create or edit a goal: a name, why it matters, and an optional target date. */
export function GoalForm({
  action,
  submitLabel,
  goal,
}: {
  action: GoalAction
  submitLabel: string
  goal?: Pick<Goal, "title" | "why" | "target_date">
}) {
  const [state, formAction, pending] = useActionState(action, idleState)
  const values = state.values ?? {
    title: goal?.title ?? "",
    why: goal?.why ?? "",
    target: goal?.target_date ?? "",
  }
  const errors = state.fieldErrors ?? {}

  return (
    // React resets the fields after each submit; they refill from state.
    <form action={formAction} className="grid gap-4" noValidate>
      <FormMessage state={state} />
      <FormField
        name="title"
        label="Goal"
        placeholder="e.g. Run a 10K"
        maxLength={100}
        autoComplete="off"
        defaultValue={values.title}
        errors={errors.title}
      />
      <div className="grid gap-1.5">
        <Label htmlFor="why">Why it matters (optional)</Label>
        <Textarea
          id="why"
          name="why"
          rows={2}
          maxLength={1000}
          placeholder="A reminder for the days motivation is low."
          defaultValue={values.why}
          aria-invalid={errors.why ? true : undefined}
        />
        {errors.why && (
          <p className="text-sm text-destructive">{errors.why[0]}</p>
        )}
      </div>
      <FormField
        name="target"
        label="Target date (optional)"
        type="date"
        className="h-10 sm:max-w-48 md:h-9"
        defaultValue={values.target}
        errors={errors.target}
      />
      <Button
        type="submit"
        className="h-10 justify-self-start px-4"
        disabled={pending}
      >
        {pending ? "Saving…" : submitLabel}
      </Button>
    </form>
  )
}
