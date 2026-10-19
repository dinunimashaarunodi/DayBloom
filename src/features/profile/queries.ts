import "server-only"

import { redirect } from "next/navigation"
import { cache } from "react"

import { getCurrentUser } from "@/lib/auth/session"
import { createClient } from "@/lib/supabase/server"

export type Profile = {
  id: string
  email: string
  displayName: string | null
  timezone: string
  /** ISO 4217 code for finance, or null until finance is set up. */
  currency: string | null
}

/** The signed-in user's profile. Cached per request. */
export const getProfile = cache(async (): Promise<Profile> => {
  const user = await getCurrentUser()
  const supabase = await createClient()
  const { data, error } = await supabase
    .from("profiles")
    .select("display_name, timezone, currency")
    .eq("user_id", user.id)
    .maybeSingle()

  if (error) throw new Error("We couldn't load your profile.")
  // A valid login whose account no longer exists (deleted on another device):
  // sign this device out instead of showing an error.
  if (!data) redirect("/auth/signout?reason=account-missing")

  return {
    ...user,
    displayName: data.display_name,
    timezone: data.timezone,
    currency: data.currency,
  }
})
