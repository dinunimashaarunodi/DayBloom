import type { Metadata } from "next"

import { AuthCard } from "@/features/auth/components/auth-card"
import { ResetPasswordForm } from "@/features/auth/components/reset-password-form"

export const metadata: Metadata = { title: "Choose a new password" }

// Reached from the password-reset email. The proxy requires the session that
// /auth/confirm created from the email link.
export default function ResetPasswordPage() {
  return (
    <AuthCard title="Choose a new password" description="You'll use it next time you log in.">
      <ResetPasswordForm />
    </AuthCard>
  )
}
