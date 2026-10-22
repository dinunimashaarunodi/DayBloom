"use client"

import { Play } from "lucide-react"
import { useActionState } from "react"

import { FormField } from "@/components/form/form-field"
import { FormMessage } from "@/components/form/form-message"
import { Button } from "@/components/ui/button"
import { idleState } from "@/lib/action-state"
import { cn } from "@/lib/utils"

import { startFocus } from "../actions"
import { DEFAULT_DURATION, DURATIONS, formatMinutes } from "../logic"

/** What to focus on (optional) and for how long. */
export function StartFocusForm() {
  const [state, formAction, pending] = useActionState(startFocus, idleState)
  const minutes = state.values?.minutes ?? String(DEFAULT_DURATION)

  return (
    <form action={formAction} className="grid gap-4" noValidate>
      {state.status === "error" && <FormMessage state={state} />}
      <FormField
        name="label"
        label="What are you focusing on? (optional)"
        placeholder="e.g. Chapter 3 notes"
        maxLength={80}
        autoComplete="off"
        defaultValue={state.values?.label ?? ""}
        errors={state.fieldErrors?.label}
      />
      <fieldset className="grid gap-2">
        <legend className="mb-1 text-sm font-medium">Length</legend>
        <div className="flex flex-wrap gap-1.5">
          {DURATIONS.map((value) => (
            <label
              key={value}
              className={cn(
                "flex h-10 min-w-16 cursor-pointer items-center justify-center rounded-lg border px-3 text-sm transition-colors",
                "hover:bg-muted has-[:checked]:border-primary has-[:checked]:bg-primary has-[:checked]:text-primary-foreground",
                "has-[:focus-visible]:ring-3 has-[:focus-visible]:ring-ring/50",
              )}
            >
              <input
                type="radio"
                name="minutes"
                value={value}
                defaultChecked={minutes === String(value)}
                className="sr-only"
              />
              {formatMinutes(value)}
            </label>
          ))}
        </div>
        {state.fieldErrors?.minutes && (
          <p className="text-sm text-destructive">
            {state.fieldErrors.minutes[0]}
          </p>
        )}
      </fieldset>
      <Button
        type="submit"
        className="h-10 justify-self-start px-4"
        disabled={pending}
      >
        <Play aria-hidden="true" />
        {pending ? "Starting…" : "Start focus"}
      </Button>
    </form>
  )
}
