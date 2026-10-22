"use client"

import { useActionState } from "react"

import { FormField } from "@/components/form/form-field"
import { FormMessage } from "@/components/form/form-message"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { type ActionState, idleState } from "@/lib/action-state"
import type { LocalDate } from "@/lib/dates/local-date"

import { BODY_MAX, TITLE_MAX } from "../logic"

type EntryAction = (
  prev: ActionState,
  formData: FormData,
) => Promise<ActionState>

/** Write or edit an entry: its day, an optional title and the text. */
export function EntryForm({
  action,
  submitLabel,
  today,
  prompt,
  date,
  title = "",
  body = "",
}: {
  action: EntryAction
  submitLabel: string
  today: LocalDate
  /** Placeholder for the text, e.g. today's writing prompt. */
  prompt: string
  date: LocalDate
  title?: string
  body?: string
}) {
  const [state, formAction, pending] = useActionState(action, idleState)
  const values = state.values ?? { date, title, body }
  const bodyError = state.fieldErrors?.body?.[0]

  return (
    // React resets the fields after each submit; they refill from state.
    <form action={formAction} className="grid gap-4" noValidate>
      <FormMessage state={state} />
      <div className="grid gap-4 sm:grid-cols-[12rem_minmax(0,1fr)]">
        <FormField
          name="date"
          label="Day"
          type="date"
          max={today}
          required
          defaultValue={values.date}
          errors={state.fieldErrors?.date}
        />
        <FormField
          name="title"
          label="Title (optional)"
          maxLength={TITLE_MAX}
          autoComplete="off"
          defaultValue={values.title}
          errors={state.fieldErrors?.title}
        />
      </div>
      <div className="grid gap-1.5">
        <Label htmlFor="body">Entry</Label>
        <Textarea
          id="body"
          name="body"
          rows={10}
          maxLength={BODY_MAX}
          placeholder={prompt}
          defaultValue={values.body}
          aria-invalid={bodyError ? true : undefined}
          aria-describedby={bodyError ? "body-error" : undefined}
          className="min-h-48 text-base leading-relaxed"
        />
        {bodyError && (
          <p id="body-error" className="text-sm text-destructive">
            {bodyError}
          </p>
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
