import type { Metadata } from "next"
import { Suspense } from "react"

import { PageHeader } from "@/components/layout/page-header"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { SignOutButton } from "@/features/auth/components/sign-out-button"
import { ProfileForm } from "@/features/profile/components/profile-form"
import { getProfile } from "@/features/profile/queries"
import { listTimeZones } from "@/lib/dates/timezone"

export const metadata: Metadata = { title: "Settings" }

export default function SettingsPage() {
  return (
    <>
      <PageHeader title="Settings" />
      <div className="grid gap-6">
        <Card>
          <CardHeader>
            <CardTitle>
              <h2>Profile</h2>
            </CardTitle>
            <CardDescription>How DayBloom greets you and when your day starts.</CardDescription>
          </CardHeader>
          <CardContent>
            <Suspense fallback={<Skeleton className="h-40" />}>
              <ProfileSection />
            </Suspense>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>
              <h2>Account</h2>
            </CardTitle>
            <Suspense fallback={<Skeleton className="h-4 w-48" />}>
              <AccountEmail />
            </Suspense>
          </CardHeader>
          <CardContent>
            <SignOutButton className="-ml-3 w-fit" />
          </CardContent>
        </Card>
      </div>
    </>
  )
}

async function ProfileSection() {
  const profile = await getProfile()
  return (
    <ProfileForm
      displayName={profile.displayName}
      timezone={profile.timezone}
      timezones={listTimeZones(profile.timezone)}
    />
  )
}

async function AccountEmail() {
  const profile = await getProfile()
  return <CardDescription>Signed in as {profile.email}</CardDescription>
}
