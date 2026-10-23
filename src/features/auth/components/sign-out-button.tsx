import { LogOut } from "lucide-react"

import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

import { signOut } from "../actions"

/**
 * Works without JavaScript: a plain form posting to the signOut Server Action.
 * `compact` shows just the icon (its accessible name is still "Sign out").
 */
export function SignOutButton({
  className,
  compact = false,
}: {
  className?: string
  compact?: boolean
}) {
  return (
    <form action={signOut} className={className}>
      <Button
        type="submit"
        variant="ghost"
        aria-label={compact ? "Sign out" : undefined}
        title={compact ? "Sign out" : undefined}
        className={cn(
          compact ? "size-9 p-0" : "w-full justify-start gap-3 px-3",
        )}
      >
        <LogOut aria-hidden="true" />
        {!compact && "Sign out"}
      </Button>
    </form>
  )
}
