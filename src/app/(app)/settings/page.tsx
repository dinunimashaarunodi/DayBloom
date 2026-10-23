import type { Metadata } from "next"
import Link from "next/link"
import { Suspense } from "react"

import { PageHeader } from "@/components/layout/page-header"
import { InstallApp } from "@/components/pwa/install-app"
import { ThemeSwitcher } from "@/components/theme-switcher"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { DeleteAccountForm } from "@/features/auth/components/delete-account-form"
import { SignOutButton } from "@/features/auth/components/sign-out-button"
import { ExportData } from "@/features/export/components/export-data"
import { DevicePush } from "@/features/reminders/components/device-push"
import { ReminderForm } from "@/features/reminders/components/reminder-form"
import { getReminders } from "@/features/reminders/queries"
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
            <CardDescription>
              How DayBloom greets you and when your day starts.
            </CardDescription>
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
              <h2>Appearance</h2>
            </CardTitle>
            <CardDescription>
              Choose light or dark, or follow your device. Saved on this device.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ThemeSwitcher variant="full" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>
              <h2>Reminders</h2>
            </CardTitle>
            <CardDescription>
              Gentle nudges at times you choose. Off unless you turn them on,
              and you can stop them any time.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-6">
            <DevicePush />
            <Suspense fallback={<Skeleton className="h-48" />}>
              <Reminders />
            </Suspense>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>
              <h2>Install the app</h2>
            </CardTitle>
            <CardDescription>
              Add DayBloom to your home screen or desktop. It opens in its own
              window, like any other app.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <InstallApp />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>
              <h2>Your data</h2>
            </CardTitle>
            <CardDescription>
              Download a copy of everything you&apos;ve saved in DayBloom. It
              stays yours.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ExportData />
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
          <CardContent className="flex flex-wrap items-center justify-between gap-2">
            <SignOutButton className="-ml-3 w-fit" />
            <Link
              href="/privacy"
              className="text-sm text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
            >
              Privacy
            </Link>
          </CardContent>
        </Card>

        <Card className="border-destructive/30">
          <CardHeader>
            <CardTitle>
              <h2>Delete account</h2>
            </CardTitle>
            <CardDescription>
              Permanently deletes your account and everything in it: tasks,
              events, history, reflections, finances, habits, focus sessions,
              workouts, goals, languages and journal. This can&apos;t be undone.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <DeleteAccountForm />
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

async function Reminders() {
  const [{ settings }, profile] = await Promise.all([
    getReminders(),
    getProfile(),
  ])
  return <ReminderForm settings={settings} timezone={profile.timezone} />
}
