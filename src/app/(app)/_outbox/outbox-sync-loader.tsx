import { getCurrentUser } from "@/lib/auth/session"

import { OutboxSync } from "./outbox-sync"

/** Reads the session, so render it inside <Suspense>. */
export async function OutboxSyncLoader() {
  const user = await getCurrentUser()
  return <OutboxSync userId={user.id} />
}
