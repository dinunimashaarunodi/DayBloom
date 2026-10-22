"use client"

import { useActionState } from "react"

import { FormField, SelectField } from "@/components/form/form-field"
import { FormMessage } from "@/components/form/form-message"
import { Button } from "@/components/ui/button"
import { type ActionState, idleState } from "@/lib/action-state"

import { LEVELS, type Language } from "../logic"

type LanguageAction = (
  prev: ActionState,
  formData: FormData,
) => Promise<ActionState>

/** Add or edit a language: its name and (optionally) the current level. */
export function LanguageForm({
  action,
  submitLabel,
  language,
}: {
  action: LanguageAction
  submitLabel: string
  language?: Pick<Language, "name" | "level">
}) {
  const [state, formAction, pending] = useActionState(action, idleState)
  const values = state.values ?? {
    name: language?.name ?? "",
    level: language?.level ?? "",
  }

  return (
    // React resets the fields after each submit; they refill from state.
    <form action={formAction} className="grid gap-4" noValidate>
      <FormMessage state={state} />
      <FormField
        name="name"
        label="Language"
        placeholder="e.g. Spanish"
        maxLength={40}
        autoComplete="off"
        defaultValue={values.name}
        errors={state.fieldErrors?.name}
      />
      <SelectField
        name="level"
        label="Level (optional)"
        hint="A1 is a beginner, C2 is fluent."
        defaultValue={values.level}
        errors={state.fieldErrors?.level}
      >
        <option value="">Not sure yet</option>
        {LEVELS.map((level) => (
          <option key={level} value={level}>
            {level}
          </option>
        ))}
      </SelectField>
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
