import type { Metadata } from "next"
import Link from "next/link"

import { Logo } from "@/components/layout/logo"

export const metadata: Metadata = {
  title: "Privacy",
  description: "What DayBloom stores, why, and how to delete it.",
}

const UPDATED = "19 October 2026"

/**
 * Plain-language privacy notice. Keep it in sync with what the app actually
 * does. It is not legal advice; have it reviewed before a public launch.
 */
export default function PrivacyPage() {
  return (
    <main className="mx-auto w-full max-w-2xl flex-1 px-4 py-10 md:py-16">
      <div className="mb-10">
        <Logo />
      </div>
      <article className="grid gap-8 text-[15px] leading-relaxed">
        <header className="grid gap-2">
          <h1 className="text-3xl font-semibold">Privacy</h1>
          <p className="text-sm text-muted-foreground">
            Last updated {UPDATED}
          </p>
          <p>
            DayBloom is a personal space for planning your days and noticing
            your progress. Your data is yours. We collect only what the app
            needs to work, we never sell it, and you can download or delete it
            at any time.
          </p>
        </header>

        <PrivacySection title="What we store">
          <ul className="grid list-disc gap-1.5 pl-5">
            <li>
              <strong>Your account:</strong> email address, a securely hashed
              password, and your name if you choose to add one.
            </li>
            <li>
              <strong>Your settings:</strong> your timezone, so your day starts
              and ends at your midnight, and your currency if you use Finance.
            </li>
            <li>
              <strong>What you create:</strong> tasks and repeating tasks,
              calendar events, daily reflections (mood, energy and notes) and
              the daily history built from them, income and expenses with their
              categories and budgets, habits with their check-ins, focus
              sessions, workouts, goals with their milestones, language practice
              and vocabulary, and journal entries. Deleting a journal entry
              removes it immediately.
            </li>
            <li>
              <strong>On your device:</strong> your theme choice, and (if you
              install the app) a small offline notice page. Your own data is
              never stored on the device by the app.
            </li>
            <li>
              <strong>Achievements:</strong> worked out from the data above; we
              only store which unlocked achievements you have already seen.
            </li>
          </ul>
        </PrivacySection>

        <PrivacySection title="How it is protected">
          <p>
            Your data is stored with Supabase, our database and sign-in
            provider, in their South Asia (Mumbai) region. Every table is locked
            so that each account can only read and change its own rows.
            Connections are encrypted.
          </p>
        </PrivacySection>

        <PrivacySection title="Cookies and local storage">
          <p>
            We use cookies only to keep you signed in. Your light or dark theme
            choice is saved in your browser&apos;s local storage. There are no
            advertising or tracking cookies, and no third-party analytics.
          </p>
        </PrivacySection>

        <PrivacySection title="Emails">
          <p>
            We email you only for your account: confirming your address and
            resetting your password.
          </p>
        </PrivacySection>

        <PrivacySection title="Downloading your data">
          <p>
            In Settings, under &ldquo;Your data&rdquo;, you can download
            everything you have stored as one JSON file, or parts of it as CSV
            files for spreadsheets. Only you can download your data.
          </p>
        </PrivacySection>

        <PrivacySection title="Deleting your data">
          <p>
            You can delete your account at any time in{" "}
            <Link
              href="/settings"
              className="font-medium text-primary underline-offset-4 hover:underline"
            >
              Settings
            </Link>
            . This immediately and permanently removes your account and
            everything in it.
          </p>
        </PrivacySection>

        <PrivacySection title="Questions">
          <p>
            If you have a question about your data, contact the person who runs
            this DayBloom service.
          </p>
        </PrivacySection>
      </article>
    </main>
  )
}

function PrivacySection({
  title,
  children,
}: {
  title: string
  children: React.ReactNode
}) {
  return (
    <section className="grid gap-2">
      <h2 className="text-lg font-semibold">{title}</h2>
      {children}
    </section>
  )
}
