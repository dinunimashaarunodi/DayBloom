"use client"

import { useActionState } from "react"

import { FormMessage } from "@/components/form/form-message"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { idleState } from "@/lib/action-state"

import { saveReminderSettings } from "../actions"
import type { ReminderSettings } from "../queries"

const REMINDERS = [
  {
    key: "morning",
    label: "Morning plan",
    hint: "How many tasks you have planned for the day.",
  },
  {
    key: "evening",
    label: "Evening reflection",
    hint: "An invitation to reflect, only if you haven't yet that day.",
  },
] as const

/** Which reminders to send, and when (in the user's own timezone). */
export function ReminderForm({
  settings,
  timezone,
}: {
  settings: ReminderSettings
  timezone: string
}) {
  const [state, formAction, pending] = useActionState(
    saveReminderSettings,
    idleState,
  )
  const values = state.values
  const errors = state.fieldErrors ?? {}

  return (
    <form action={formAction} className="grid gap-4" noValidate>
      <FormMessage state={state} />
      {REMINDERS.map(({ key, label, hint }) => {
        const enabled = `${key}Enabled` as const
        const time = `${key}Time` as const
        return (
          <fieldset key={key} className="grid gap-2 rounded-xl border p-3">
            <legend className="sr-only">{label}</legend>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-start gap-3">
                <input
                  type="checkbox"
                  id={enabled}
                  name={enabled}
                  className="mt-0.5 size-5 shrink-0 accent-primary"
                  defaultChecked={
                    values
                      ? values[enabled] === "on"
                      : settings[`${key}_enabled`]
                  }
                />
                <div className="grid gap-0.5">
                  <Label htmlFor={enabled}>{label}</Label>
                  <p className="text-xs text-muted-foreground">{hint}</p>
                </div>
              </div>
              <div className="grid gap-1 max-sm:pl-8">
                <Label htmlFor={time} className="sr-only">
                  {label} time
                </Label>
                <Input
                  id={time}
                  name={time}
                  type="time"
                  className="h-10 w-36 md:h-9"
                  defaultValue={values?.[time] ?? settings[`${key}_time`]}
                  aria-invalid={errors[time] ? true : undefined}
                />
              </div>
            </div>
            {errors[time] && (
              <p className="text-sm text-destructive">{errors[time][0]}</p>
            )}
          </fieldset>
        )
      })}
      <p className="text-xs text-muted-foreground">
        Times are in your timezone ({timezone}). Reminders are sent within a few
        minutes of the time you choose.
      </p>
      <Button
        type="submit"
        className="h-10 justify-self-start px-4"
        disabled={pending}
      >
        {pending ? "Saving…" : "Save reminder times"}
      </Button>
    </form>
  )
}
