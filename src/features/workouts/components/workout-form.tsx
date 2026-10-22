"use client"

import { useActionState } from "react"

import { FormField, SelectField } from "@/components/form/form-field"
import { FormMessage } from "@/components/form/form-message"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { type ActionState, idleState } from "@/lib/action-state"
import type { LocalDate } from "@/lib/dates/local-date"
import { cn } from "@/lib/utils"

import { EFFORTS, KINDS, type Workout } from "../logic"

type WorkoutAction = (
  prev: ActionState,
  formData: FormData,
) => Promise<ActionState>

/** Log or edit a workout. */
export function WorkoutForm({
  action,
  submitLabel,
  today,
  workout,
}: {
  action: WorkoutAction
  submitLabel: string
  today: LocalDate
  workout?: Workout
}) {
  const [state, formAction, pending] = useActionState(action, idleState)
  const values = state.values ?? {
    date: workout?.local_date ?? today,
    kind: workout?.kind ?? "",
    title: workout?.title ?? "",
    duration: workout ? String(workout.duration_minutes) : "",
    effort: workout?.effort ? String(workout.effort) : "",
    notes: workout?.notes ?? "",
  }
  const errors = state.fieldErrors ?? {}

  return (
    // React resets the fields after each submit; on errors they refill from state.
    <form action={formAction} className="grid gap-4" noValidate>
      <FormMessage state={state} />
      <fieldset className="grid gap-2">
        <legend className="mb-1 text-sm font-medium">Type</legend>
        <div className="flex flex-wrap gap-1.5">
          {KINDS.map((kind) => (
            <label
              key={kind.value}
              className={cn(
                "flex h-10 cursor-pointer items-center justify-center rounded-lg border px-3 text-sm transition-colors",
                "hover:bg-muted has-[:checked]:border-primary has-[:checked]:bg-primary has-[:checked]:text-primary-foreground",
                "has-[:focus-visible]:ring-3 has-[:focus-visible]:ring-ring/50",
              )}
            >
              <input
                type="radio"
                name="kind"
                value={kind.value}
                defaultChecked={values.kind === kind.value}
                className="sr-only"
              />
              {kind.label}
            </label>
          ))}
        </div>
        {errors.kind && (
          <p className="text-sm text-destructive">{errors.kind[0]}</p>
        )}
      </fieldset>
      <div className="grid grid-cols-2 gap-4">
        <FormField
          name="date"
          label="Day"
          type="date"
          max={today}
          required
          defaultValue={values.date}
          errors={errors.date}
        />
        <FormField
          name="duration"
          label="Minutes"
          type="number"
          inputMode="numeric"
          min={1}
          max={600}
          required
          defaultValue={values.duration}
          errors={errors.duration}
        />
      </div>
      <SelectField
        name="effort"
        label="Effort (optional)"
        defaultValue={values.effort}
        errors={errors.effort}
      >
        <option value="">Not set</option>
        {EFFORTS.map((effort) => (
          <option key={effort.value} value={effort.value}>
            {effort.label}
          </option>
        ))}
      </SelectField>
      <FormField
        name="title"
        label="Title (optional)"
        placeholder="e.g. Morning run"
        maxLength={80}
        autoComplete="off"
        defaultValue={values.title}
        errors={errors.title}
      />
      <div className="grid gap-1.5">
        <Label htmlFor="notes">Notes (optional)</Label>
        <Textarea
          id="notes"
          name="notes"
          rows={3}
          maxLength={2000}
          placeholder="How did it feel? Anything to remember?"
          defaultValue={values.notes}
          aria-invalid={errors.notes ? true : undefined}
        />
        {errors.notes && (
          <p className="text-sm text-destructive">{errors.notes[0]}</p>
        )}
      </div>
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
