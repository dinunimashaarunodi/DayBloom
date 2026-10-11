import type { Metadata } from "next"
import Link from "next/link"

import { AuthCard } from "@/features/auth/components/auth-card"
import { SignUpForm } from "@/features/auth/components/signup-form"

export const metadata: Metadata = { title: "Create an account" }

export default function SignUpPage() {
  return (
    <AuthCard
      title="Create your account"
      description="Start planning your days with DayBloom."
      footer={
        <span>
          Already have an account?{" "}
          <Link
            href="/login"
            className="font-medium text-foreground underline-offset-4 hover:underline"
          >
            Log in
          </Link>
        </span>
      }
    >
      <SignUpForm />
    </AuthCard>
  )
}
