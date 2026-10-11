import { LogOut } from "lucide-react"

import { Button } from "@/components/ui/button"

import { signOut } from "../actions"

/** Works without JavaScript: a plain form posting to the signOut Server Action. */
export function SignOutButton({ className }: { className?: string }) {
  return (
    <form action={signOut} className={className}>
      <Button type="submit" variant="ghost" className="w-full justify-start gap-3 px-3">
        <LogOut aria-hidden="true" />
        Sign out
      </Button>
    </form>
  )
}
