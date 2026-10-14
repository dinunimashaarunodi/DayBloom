import "server-only"

import { createClient } from "@supabase/supabase-js"

import { supabasePublishableKey, supabaseUrl } from "@/lib/env"
import type { Database } from "@/types/database"

/**
 * Client for requests that send auth emails (signup confirmation, password
 * reset). It uses the "implicit" flow: the emailed link returns with the
 * session in the URL fragment, handled by /auth/callback in the browser.
 *
 * Why not the default PKCE flow: a PKCE link only works in the same browser
 * that requested it, so opening the email on a phone or in the Gmail app fails.
 * Supabase's free tier doesn't allow the custom templates (token_hash links)
 * that would fix this until custom SMTP is configured (Phase 6).
 *
 * It holds no session and is only used to start these flows.
 */
export function createEmailLinkClient() {
  return createClient<Database>(supabaseUrl, supabasePublishableKey, {
    auth: {
      flowType: "implicit",
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  })
}
