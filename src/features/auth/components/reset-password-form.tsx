"use client"

import { useActionState } from "react"

import { FormMessage } from "@/components/form/form-message"
import { PasswordField } from "@/components/form/password-field"
import { Button } from "@/components/ui/button"
import { idleState } from "@/lib/action-state"

import { updatePassword } from "../actions"

export function ResetPasswordForm() {
  const [state, formAction, pending] = useActionState(updatePassword, idleState)

  return (
    <form action={formAction} className="grid gap-4" noValidate>
      <FormMessage state={state} />
      <PasswordField
        name="password"
        label="New password"
        autoComplete="new-password"
        required
        hint="At least 8 characters, with letters and numbers."
        errors={state.fieldErrors?.password}
      />
      <PasswordField
        name="confirmPassword"
        label="Confirm new password"
        autoComplete="new-password"
        required
        errors={state.fieldErrors?.confirmPassword}
      />
      <Button type="submit" size="lg" className="h-10" disabled={pending}>
        {pending ? "Saving…" : "Save new password"}
      </Button>
    </form>
  )
}
