import { createBrowserClient } from "@supabase/ssr"

import { supabasePublishableKey, supabaseUrl } from "@/lib/env"
import type { Database } from "@/types/database"

/** Supabase client for Client Components. Stores the session in cookies, like the server client. */
export function createClient() {
  return createBrowserClient<Database>(supabaseUrl, supabasePublishableKey)
}
