import type { Metadata } from "next"
import Link from "next/link"
import { Suspense } from "react"

import { Skeleton } from "@/components/ui/skeleton"
import { AuthCard } from "@/features/auth/components/auth-card"
import { LoginForm } from "@/features/auth/components/login-form"
import { LOGIN_NOTICES } from "@/features/auth/errors"
import { safeNextPath } from "@/lib/auth/routes"

export const metadata: Metadata = { title: "Log in" }

export default function LoginPage({ searchParams }: PageProps<"/login">) {
  return (
    <AuthCard
      title="Welcome back"
      description="Log in to plan your day."
      footer={
        <span>
          New to DayBloom?{" "}
          <Link href="/signup" className="font-medium text-foreground underline-offset-4 hover:underline">
            Create an account
          </Link>
        </span>
      }
    >
      <Suspense fallback={<FormSkeleton />}>
        <LoginFormWithParams searchParams={searchParams} />
      </Suspense>
    </AuthCard>
  )
}

// Reading searchParams is request-time data, so it lives inside <Suspense>.
async function LoginFormWithParams({ searchParams }: Pick<PageProps<"/login">, "searchParams">) {
  const params = await searchParams
  const next = typeof params.next === "string" ? safeNextPath(params.next) : undefined
  const notice = typeof params.notice === "string" ? LOGIN_NOTICES[params.notice] : undefined
  return <LoginForm next={next} notice={notice} />
}

function FormSkeleton() {
  return (
    <div className="grid gap-4" aria-hidden="true">
      <Skeleton className="h-14" />
      <Skeleton className="h-14" />
      <Skeleton className="h-10" />
    </div>
  )
}
