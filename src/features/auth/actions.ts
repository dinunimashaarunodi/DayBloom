"use server"

import { headers } from "next/headers"
import { redirect } from "next/navigation"

import {
  type ActionState,
  formValues,
  validationError,
} from "@/lib/action-state"
import { HOME_PATH, LOGIN_PATH, safeNextPath } from "@/lib/auth/routes"
import { getCurrentUser } from "@/lib/auth/session"
import { createEmailLinkClient } from "@/lib/supabase/email-links"
import { createClient } from "@/lib/supabase/server"

import { friendlyAuthError } from "./errors"
import {
  forgotPasswordSchema,
  resetPasswordSchema,
  signInSchema,
  signUpSchema,
} from "./schema"

/**
 * Where Supabase email links return to: /auth/callback, which finishes sign-in
 * in the browser (works on any device). Supabase checks it against its allow-list.
 */
async function emailLinkUrl(next: string): Promise<string> {
  const h = await headers()
  const origin =
    h.get("origin") ??
    `${h.get("x-forwarded-proto") ?? "http"}://${h.get("host")}`
  return `${origin}/auth/callback?next=${encodeURIComponent(next)}`
}

export async function signIn(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const values = formValues(formData, ["email"])
  const parsed = signInSchema.safeParse(Object.fromEntries(formData))
  if (!parsed.success) return validationError(parsed.error, values)

  const supabase = await createClient()
  const { error } = await supabase.auth.signInWithPassword(parsed.data)
  if (error)
    return { status: "error", message: friendlyAuthError(error), values }

  redirect(safeNextPath(formData.get("next")))
}

export async function signUp(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const values = formValues(formData, ["displayName", "email"])
  const parsed = signUpSchema.safeParse(Object.fromEntries(formData))
  if (!parsed.success) return validationError(parsed.error, values)

  const { email, password, displayName, timezone } = parsed.data
  const supabase = createEmailLinkClient()
  const { error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: await emailLinkUrl(HOME_PATH),
      // Copied into public.profiles by the on_auth_user_created trigger.
      data: { display_name: displayName, timezone },
    },
  })
  if (error)
    return { status: "error", message: friendlyAuthError(error), values }

  // Same message whether or not the email was already registered, so the form
  // can't be used to discover who has an account.
  return {
    status: "success",
    message: `Almost there! We've sent a confirmation link to ${email}. Open it to start using DayBloom.`,
  }
}

export async function requestPasswordReset(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const values = formValues(formData, ["email"])
  const parsed = forgotPasswordSchema.safeParse(Object.fromEntries(formData))
  if (!parsed.success) return validationError(parsed.error, values)

  const supabase = createEmailLinkClient()
  const { error } = await supabase.auth.resetPasswordForEmail(
    parsed.data.email,
    {
      redirectTo: await emailLinkUrl("/reset-password"),
    },
  )
  if (error?.code?.startsWith("over_")) {
    return { status: "error", message: friendlyAuthError(error), values }
  }

  return {
    status: "success",
    message:
      "If an account exists for that email, we've sent a link to reset your password.",
  }
}

export async function updatePassword(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  await getCurrentUser()
  const parsed = resetPasswordSchema.safeParse(Object.fromEntries(formData))
  if (!parsed.success) return validationError(parsed.error)

  const supabase = await createClient()
  const { error } = await supabase.auth.updateUser({
    password: parsed.data.password,
  })
  if (error) return { status: "error", message: friendlyAuthError(error) }

  redirect(HOME_PATH)
}

export async function signOut(): Promise<void> {
  const supabase = await createClient()
  // "local" signs out this device only; other devices stay signed in.
  await supabase.auth.signOut({ scope: "local" })
  redirect(`${LOGIN_PATH}?notice=signed-out`)
}
