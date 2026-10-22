"use client"

import { useActionState } from "react"

import { FormField } from "@/components/form/form-field"
import { FormMessage } from "@/components/form/form-message"
import { Button } from "@/components/ui/button"
import { type ActionState, idleState } from "@/lib/action-state"
import { cn } from "@/lib/utils"

const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]

type HabitAction = (
  prev: ActionState,
  formData: FormData,
) => Promise<ActionState>

/** Create or edit a habit: a name and the weekdays it's for. */
export function HabitForm({
  action,
  submitLabel,
  name = "",
  daysMask = 0b1111111,
}: {
  action: HabitAction
  submitLabel: string
  name?: string
  daysMask?: number
}) {
  const [state, formAction, pending] = useActionState(action, idleState)
  const checked = state.values?.days
    ? new Set(state.values.days.split(",").filter(Boolean))
    : new Set(
        DAYS.map((_, i) => String(i)).filter(
          (i) => daysMask & (1 << Number(i)),
        ),
      )

  return (
    // React resets the fields after each submit; on errors they refill from state.
    <form action={formAction} className="grid gap-4" noValidate>
      <FormMessage state={state} />
      <FormField
        name="name"
        label="Habit"
        placeholder="e.g. Read for 20 minutes"
        maxLength={60}
        autoComplete="off"
        defaultValue={state.values?.name ?? name}
        errors={state.fieldErrors?.name}
      />
      <fieldset className="grid gap-2">
        <legend className="mb-1 text-sm font-medium">Days</legend>
        <div className="flex flex-wrap gap-1.5">
          {DAYS.map((day, i) => (
            <label
              key={day}
              className={cn(
                "flex h-9 min-w-11 cursor-pointer items-center justify-center rounded-lg border px-2 text-sm transition-colors",
                "hover:bg-muted has-[:checked]:border-primary has-[:checked]:bg-primary has-[:checked]:text-primary-foreground",
                "has-[:focus-visible]:ring-3 has-[:focus-visible]:ring-ring/50",
              )}
            >
              <input
                type="checkbox"
                name="days"
                value={String(i)}
                defaultChecked={checked.has(String(i))}
                className="sr-only"
              />
              {day}
            </label>
          ))}
        </div>
        {state.fieldErrors?.days && (
          <p className="text-sm text-destructive">
            {state.fieldErrors.days[0]}
          </p>
        )}
      </fieldset>
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
