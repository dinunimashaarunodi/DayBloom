import { getProfile } from "../queries"

/** Avatar initial, name and email of the signed-in user. Reads the session, so render it inside <Suspense>. */
export async function UserSummary() {
  const profile = await getProfile()
  const initial = (profile.displayName ?? profile.email ?? "?")
    .trim()
    .charAt(0)
    .toUpperCase()

  return (
    <div className="flex min-w-0 items-center gap-3 text-sm">
      <span
        aria-hidden="true"
        className="grid size-9 shrink-0 place-items-center rounded-full bg-bloom font-semibold"
      >
        {initial}
      </span>
      <span className="grid min-w-0">
        <span className="truncate font-medium">
          {profile.displayName ?? "Welcome!"}
        </span>
        <span className="truncate text-xs text-muted-foreground">
          {profile.email}
        </span>
      </span>
    </div>
  )
}
