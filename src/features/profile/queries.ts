import "server-only"

import { cache } from "react"

import { getCurrentUser } from "@/lib/auth/session"
import { createClient } from "@/lib/supabase/server"

export type Profile = {
  id: string
  email: string
  displayName: string | null
  timezone: string
}

/** The signed-in user's profile. Cached per request. */
export const getProfile = cache(async (): Promise<Profile> => {
  const user = await getCurrentUser()
  const supabase = await createClient()
  const { data, error } = await supabase
    .from("profiles")
    .select("display_name, timezone")
    .eq("user_id", user.id)
    .single()

  if (error) throw new Error("We couldn't load your profile.")

  return { ...user, displayName: data.display_name, timezone: data.timezone }
})
