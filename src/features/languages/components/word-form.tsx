"use client"

import { useActionState } from "react"

import { FormField } from "@/components/form/form-field"
import { FormMessage } from "@/components/form/form-message"
import { Button } from "@/components/ui/button"
import { idleState } from "@/lib/action-state"

import { addWord } from "../actions"

/** Add a word or phrase with its meaning and an optional example. */
export function WordForm({ languageId }: { languageId: string }) {
  const [state, formAction, pending] = useActionState(
    addWord.bind(null, languageId),
    idleState,
  )
  const values = state.values ?? {}
  const errors = state.fieldErrors ?? {}

  return (
    // React resets the fields after each submit; on errors they refill.
    <form action={formAction} className="grid gap-4" noValidate>
      <FormMessage state={state} />
      <div className="grid gap-4 sm:grid-cols-2">
        <FormField
          name="term"
          label="Word or phrase"
          placeholder="e.g. la biblioteca"
          maxLength={100}
          autoComplete="off"
          defaultValue={values.term ?? ""}
          errors={errors.term}
        />
        <FormField
          name="meaning"
          label="Meaning"
          placeholder="e.g. the library"
          maxLength={200}
          autoComplete="off"
          defaultValue={values.meaning ?? ""}
          errors={errors.meaning}
        />
      </div>
      <FormField
        name="example"
        label="Example (optional)"
        placeholder="e.g. Estudio en la biblioteca."
        maxLength={300}
        autoComplete="off"
        defaultValue={values.example ?? ""}
        errors={errors.example}
      />
      <Button
        type="submit"
        variant="outline"
        className="h-10 justify-self-start px-4"
        disabled={pending}
      >
        {pending ? "Saving…" : "Add word"}
      </Button>
    </form>
  )
}
