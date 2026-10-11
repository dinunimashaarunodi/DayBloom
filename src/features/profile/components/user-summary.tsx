import { getProfile } from "../queries"

/** Name and email of the signed-in user. Reads the session, so render it inside <Suspense>. */
export async function UserSummary() {
  const profile = await getProfile()

  return (
    <div className="grid min-w-0 px-3 text-sm">
      <span className="truncate font-medium">{profile.displayName ?? "Welcome!"}</span>
      <span className="truncate text-muted-foreground">{profile.email}</span>
    </div>
  )
}
