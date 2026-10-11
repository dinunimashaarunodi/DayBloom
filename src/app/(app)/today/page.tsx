import { Sun } from "lucide-react"
import type { Metadata } from "next"
import { connection } from "next/server"
import { Suspense } from "react"

import { EmptyState } from "@/components/empty-state"
import { PageHeader } from "@/components/layout/page-header"
import { Skeleton } from "@/components/ui/skeleton"
import { getProfile } from "@/features/profile/queries"
import { formatLongDate, localHour } from "@/lib/dates/timezone"

export const metadata: Metadata = { title: "Today" }

export default function TodayPage() {
  return (
    <>
      <Suspense fallback={<HeaderSkeleton />}>
        <TodayHeader />
      </Suspense>
      <EmptyState icon={Sun} title="Your day is a blank page">
        Soon you&apos;ll plan today&apos;s tasks here and see what&apos;s coming up.
      </EmptyState>
    </>
  )
}

async function TodayHeader() {
  const profile = await getProfile()
  await connection() // "now" must be read at request time, never at build time.
  const now = new Date()
  const hour = localHour(now, profile.timezone)
  const greeting = hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening"
  const name = profile.displayName ? `, ${profile.displayName}` : ""

  return (
    <PageHeader title={`${greeting}${name}`} description={formatLongDate(now, profile.timezone)} />
  )
}

function HeaderSkeleton() {
  return (
    <div className="mb-6 grid gap-2" aria-hidden="true">
      <Skeleton className="h-8 w-64" />
      <Skeleton className="h-4 w-40" />
    </div>
  )
}
