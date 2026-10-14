"use client"

import Link from "next/link"
import { useActionState } from "react"

import { FormField } from "@/components/form/form-field"
import { FormMessage } from "@/components/form/form-message"
import { PasswordField } from "@/components/form/password-field"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { idleState } from "@/lib/action-state"

import { signIn } from "../actions"

export function LoginForm({
  next,
  notice,
}: {
  next?: string
  notice?: string
}) {
  const [state, formAction, pending] = useActionState(signIn, idleState)

  return (
    <form action={formAction} className="grid gap-4" noValidate>
      {notice && state.status === "idle" && (
        <Alert>
          <AlertDescription>{notice}</AlertDescription>
        </Alert>
      )}
      <FormMessage state={state} />
      {next && <input type="hidden" name="next" value={next} />}
      <FormField
        name="email"
        label="Email"
        type="email"
        autoComplete="email"
        required
        defaultValue={state.values?.email}
        errors={state.fieldErrors?.email}
      />
      <PasswordField
        name="password"
        label="Password"
        autoComplete="current-password"
        required
        errors={state.fieldErrors?.password}
      />
      <div className="-mt-2 text-right text-sm">
        <Link
          href="/forgot-password"
          className="text-muted-foreground underline-offset-4 hover:underline"
        >
          Forgot password?
        </Link>
      </div>
      <Button type="submit" size="lg" className="h-10" disabled={pending}>
        {pending ? "Logging in…" : "Log in"}
      </Button>
    </form>
  )
}
