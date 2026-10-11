// Route access rules shared by the proxy and auth actions.
// Pure functions: no Next.js or Supabase imports, so they are unit-testable.

export const HOME_PATH = "/today"
export const LOGIN_PATH = "/login"

/** Pages only signed-out visitors should see. Signed-in users go to HOME_PATH. */
const GUEST_ONLY = ["/", "/login", "/signup", "/forgot-password"]

/** Reachable without a session. Everything else requires sign-in. */
const PUBLIC_PREFIXES = ["/auth/"]

export function isGuestOnlyPath(pathname: string): boolean {
  return GUEST_ONLY.includes(pathname)
}

export function isPublicPath(pathname: string): boolean {
  return (
    isGuestOnlyPath(pathname) ||
    PUBLIC_PREFIXES.some((prefix) => pathname.startsWith(prefix))
  )
}

/**
 * Sanitizes a post-login redirect target. Only same-site relative paths are
 * allowed, which prevents open redirects such as `?next=//evil.com`.
 */
export function safeNextPath(
  next: unknown,
  fallback: string = HOME_PATH,
): string {
  if (typeof next !== "string" || next.length === 0) return fallback
  if (
    !next.startsWith("/") ||
    next.startsWith("//") ||
    next.startsWith("/\\")
  ) {
    return fallback
  }
  // Reject anything a URL parser would treat as another origin.
  try {
    const url = new URL(next, "http://daybloom.local")
    if (url.origin !== "http://daybloom.local") return fallback
    return url.pathname + url.search + url.hash
  } catch {
    return fallback
  }
}
