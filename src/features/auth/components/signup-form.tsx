"use client"

import { useActionState } from "react"

import { FormField } from "@/components/form/form-field"
import { FormMessage } from "@/components/form/form-message"
import { Button } from "@/components/ui/button"
import { idleState } from "@/lib/action-state"

import { signUp } from "../actions"

export function SignUpForm() {
  const [state, formAction, pending] = useActionState(signUp, idleState)

  // Read the timezone at submit time (not during render) to avoid a
  // server/client hydration mismatch. Without JavaScript the server falls back to UTC.
  function submit(formData: FormData) {
    formData.set("timezone", Intl.DateTimeFormat().resolvedOptions().timeZone)
    formAction(formData)
  }

  if (state.status === "success") {
    return <FormMessage state={state} />
  }

  return (
    <form action={submit} className="grid gap-4" noValidate>
      <FormMessage state={state} />
      <FormField
        name="displayName"
        label="Name (optional)"
        autoComplete="given-name"
        defaultValue={state.values?.displayName}
        errors={state.fieldErrors?.displayName}
      />
      <FormField
        name="email"
        label="Email"
        type="email"
        autoComplete="email"
        required
        defaultValue={state.values?.email}
        errors={state.fieldErrors?.email}
      />
      <FormField
        name="password"
        label="Password"
        type="password"
        autoComplete="new-password"
        required
        hint="At least 8 characters, with letters and numbers."
        errors={state.fieldErrors?.password}
      />
      <Button type="submit" size="lg" className="h-10" disabled={pending}>
        {pending ? "Creating account…" : "Create account"}
      </Button>
    </form>
  )
}
