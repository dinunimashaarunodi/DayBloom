// Maps Supabase Auth error codes to friendly, non-technical messages.
// Pure function so it can be unit-tested.

const MESSAGES: Record<string, string> = {
  invalid_credentials: "That email and password don't match. Please try again.",
  email_not_confirmed:
    "Please confirm your email first. Check your inbox for the link we sent you.",
  weak_password: "That password is too weak. Use at least 8 characters with letters and numbers.",
  same_password: "Choose a password that's different from your current one.",
  over_email_send_rate_limit: "We've sent several emails already. Please wait a minute and try again.",
  over_request_rate_limit: "Too many attempts. Please wait a minute and try again.",
  signup_disabled: "Sign-ups are currently closed.",
}

export const GENERIC_AUTH_ERROR = "Something went wrong. Please try again."

export function friendlyAuthError(error: { code?: string } | null | undefined): string {
  if (!error?.code) return GENERIC_AUTH_ERROR
  return MESSAGES[error.code] ?? GENERIC_AUTH_ERROR
}

/** Messages shown on the login page for `?notice=` values. */
export const LOGIN_NOTICES: Record<string, string> = {
  "link-invalid":
    "That link has expired or was opened in a different browser. If you were confirming your email, it may already be confirmed, so try logging in. Otherwise, request a new link.",
  "signed-out": "You've been signed out. See you soon!",
}
