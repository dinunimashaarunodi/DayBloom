import type { Metadata } from "next"

import { Logo } from "@/components/layout/logo"
import { AuthCard } from "@/features/auth/components/auth-card"
import { EmailLinkHandler } from "@/features/auth/components/email-link-handler"

export const metadata: Metadata = { title: "Signing you in" }

// Landing page for links in DayBloom emails. Public (see lib/auth/routes.ts).
export default function EmailLinkPage() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-6 px-4 py-10">
      <Logo />
      <AuthCard
        title="Just a moment"
        description="Finishing up from your email link."
      >
        <EmailLinkHandler />
      </AuthCard>
    </main>
  )
}
