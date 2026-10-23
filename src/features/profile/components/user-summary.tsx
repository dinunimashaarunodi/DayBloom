import { getProfile } from "../queries"

/**
 * Avatar initial, name and email of the signed-in user. Long emails wrap onto
 * a second line (and show in full on hover) instead of being cut off.
 * Reads the session, so render it inside <Suspense>.
 */
export async function UserSummary() {
  const profile = await getProfile()
  const initial = (profile.displayName ?? profile.email ?? "?")
    .trim()
    .charAt(0)
    .toUpperCase()

  return (
    <div className="flex min-w-0 items-center gap-3">
      <span
        aria-hidden="true"
        className="grid size-10 shrink-0 place-items-center rounded-full bg-bloom text-base font-semibold shadow-md shadow-bloom-via/30"
      >
        {initial}
      </span>
      <span className="grid min-w-0 flex-1 gap-0.5">
        <span className="truncate text-sm font-semibold">
          {profile.displayName ?? "Welcome!"}
        </span>
        {profile.email && (
          <span
            title={profile.email}
            className="line-clamp-2 text-xs leading-snug break-all text-muted-foreground"
          >
            {profile.email}
          </span>
        )}
      </span>
    </div>
  )
}
