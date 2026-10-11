import type { EmailOtpType } from "@supabase/supabase-js"
import { NextResponse, type NextRequest } from "next/server"

import { LOGIN_PATH, safeNextPath } from "@/lib/auth/routes"
import { createClient } from "@/lib/supabase/server"

const OTP_TYPES: EmailOtpType[] = ["signup", "invite", "magiclink", "recovery", "email_change", "email"]

/**
 * Landing point for links in Supabase auth emails (signup confirmation and
 * password recovery). Supports both link styles:
 * - `?code=`: Supabase's default templates (PKCE; same browser only)
 * - `?token_hash=&type=`: custom templates in supabase/templates (any device)
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl
  const next = safeNextPath(searchParams.get("next"))
  const code = searchParams.get("code")
  const tokenHash = searchParams.get("token_hash")
  const type = searchParams.get("type") as EmailOtpType | null

  const supabase = await createClient()
  let ok = false

  if (tokenHash && type && OTP_TYPES.includes(type)) {
    const { error } = await supabase.auth.verifyOtp({ type, token_hash: tokenHash })
    ok = !error
  } else if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    ok = !error
  }

  if (ok) {
    return NextResponse.redirect(new URL(next, origin))
  }

  const failure = new URL(LOGIN_PATH, origin)
  failure.searchParams.set("notice", "link-invalid")
  return NextResponse.redirect(failure)
}
