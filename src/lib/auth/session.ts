import "server-only"

import { redirect } from "next/navigation"
import { cache } from "react"

import { LOGIN_PATH } from "@/lib/auth/routes"
import { createClient } from "@/lib/supabase/server"

export type CurrentUser = {
  id: string
  email: string
}

/**
 * The single place that answers "who is signed in?" on the server.
 * getClaims() verifies the JWT (never trust getSession() on the server).
 * Redirects to the login page when there is no valid session.
 * Cached per request, so calling it from many components is cheap.
 */
export const getCurrentUser = cache(async (): Promise<CurrentUser> => {
  const supabase = await createClient()
  const { data } = await supabase.auth.getClaims()
  const claims = data?.claims

  if (!claims?.sub) {
    redirect(LOGIN_PATH)
  }

  return {
    id: claims.sub,
    email: typeof claims.email === "string" ? claims.email : "",
  }
})
