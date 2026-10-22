"use client"

import { useActionState } from "react"

import { FormField, SelectField } from "@/components/form/form-field"
import { FormMessage } from "@/components/form/form-message"
import { Button } from "@/components/ui/button"
import { idleState } from "@/lib/action-state"
import type { LocalDate } from "@/lib/dates/local-date"

import { logPractice } from "../actions"
import { ACTIVITIES } from "../logic"

/** Log time spent practising a language. */
export function PracticeForm({
  languageId,
  today,
}: {
  languageId: string
  today: LocalDate
}) {
  const [state, formAction, pending] = useActionState(
    logPractice.bind(null, languageId),
    idleState,
  )
  const values = state.values ?? {}
  const errors = state.fieldErrors ?? {}

  return (
    // React resets the fields after each submit; on errors they refill.
    <form action={formAction} className="grid gap-4" noValidate>
      <FormMessage state={state} />
      <div className="grid grid-cols-2 gap-4">
        <FormField
          name="date"
          label="Day"
          type="date"
          max={today}
          required
          defaultValue={values.date ?? today}
          errors={errors.date}
        />
        <FormField
          name="minutes"
          label="Minutes"
          type="number"
          inputMode="numeric"
          min={1}
          max={600}
          required
          defaultValue={values.minutes ?? ""}
          errors={errors.minutes}
        />
      </div>
      <SelectField
        name="activity"
        label="What did you practise?"
        defaultValue={values.activity ?? ""}
        errors={errors.activity}
      >
        <option value="" disabled>
          Choose…
        </option>
        {ACTIVITIES.map((activity) => (
          <option key={activity.value} value={activity.value}>
            {activity.label}
          </option>
        ))}
      </SelectField>
      <FormField
        name="notes"
        label="Notes (optional)"
        placeholder="e.g. Duolingo unit 4, a podcast episode"
        maxLength={500}
        autoComplete="off"
        defaultValue={values.notes ?? ""}
        errors={errors.notes}
      />
      <Button
        type="submit"
        className="h-10 justify-self-start px-4"
        disabled={pending}
      >
        {pending ? "Saving…" : "Log practice"}
      </Button>
    </form>
  )
}
