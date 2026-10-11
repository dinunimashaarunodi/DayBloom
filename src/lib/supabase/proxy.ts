import { createServerClient } from "@supabase/ssr"
import { NextResponse, type NextRequest } from "next/server"

import {
  HOME_PATH,
  LOGIN_PATH,
  isGuestOnlyPath,
  isPublicPath,
} from "@/lib/auth/routes"
import { supabasePublishableKey, supabaseUrl } from "@/lib/env"
import type { Database } from "@/types/database"

/**
 * Refreshes the Supabase session cookie and applies route guards.
 * This is a UX convenience only: every Server Action and data read must
 * still check the user itself (see lib/auth/session.ts).
 */
export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request })

  const supabase = createServerClient<Database>(
    supabaseUrl,
    supabasePublishableKey,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet, headers) {
          for (const { name, value } of cookiesToSet)
            request.cookies.set(name, value)
          response = NextResponse.next({ request })
          for (const { name, value, options } of cookiesToSet) {
            response.cookies.set(name, value, options)
          }
          // No-cache headers so a CDN never serves one user's cookies to another.
          for (const [key, value] of Object.entries(headers))
            response.headers.set(key, value)
        },
      },
    },
  )

  // Must run before any redirect decision: it validates the JWT and refreshes it.
  const { data } = await supabase.auth.getClaims()
  const signedIn = Boolean(data?.claims)
  const { pathname, search } = request.nextUrl

  if (!signedIn && !isPublicPath(pathname)) {
    const url = request.nextUrl.clone()
    url.pathname = LOGIN_PATH
    url.search = ""
    url.searchParams.set("next", pathname + search)
    return redirectWithCookies(url, response)
  }

  if (signedIn && isGuestOnlyPath(pathname)) {
    const url = request.nextUrl.clone()
    url.pathname = HOME_PATH
    url.search = ""
    return redirectWithCookies(url, response)
  }

  return response
}

/** Redirect while keeping any refreshed session cookies and cache headers. */
function redirectWithCookies(url: URL, from: NextResponse) {
  const redirect = NextResponse.redirect(url)
  for (const cookie of from.cookies.getAll()) redirect.cookies.set(cookie)
  const cacheControl = from.headers.get("Cache-Control")
  if (cacheControl) redirect.headers.set("Cache-Control", cacheControl)
  return redirect
}
