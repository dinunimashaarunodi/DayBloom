import { NextResponse, type NextRequest } from "next/server"

import { HOME_PATH, LOGIN_PATH } from "@/lib/auth/routes"
import { createClient } from "@/lib/supabase/server"

/**
 * Signs out a device whose login points at an account that no longer exists
 * (e.g. deleted on another device). getProfile() redirects here.
 *
 * It only signs out when the account really is gone, so a link to this URL
 * can't be used to log out someone with a working account.
 */
export async function GET(request: NextRequest) {
  const supabase = await createClient()
  const { data } = await supabase.auth.getClaims()
  const userId = data?.claims?.sub

  if (userId) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("user_id")
      .eq("user_id", userId)
      .maybeSingle()
    if (profile) {
      return NextResponse.redirect(new URL(HOME_PATH, request.url))
    }
    await supabase.auth.signOut({ scope: "local" })
  }

  const url = new URL(LOGIN_PATH, request.url)
  url.searchParams.set("notice", "account-deleted")
  return NextResponse.redirect(url)
}
