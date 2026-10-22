import { Languages, Plus } from "lucide-react"
import type { Metadata } from "next"
import Link from "next/link"
import { Suspense } from "react"

import { EmptyState } from "@/components/empty-state"
import { DashboardCard } from "@/components/layout/dashboard-card"
import { PageHeader } from "@/components/layout/page-header"
import { Section } from "@/components/layout/section"
import { Skeleton } from "@/components/ui/skeleton"
import { createLanguage } from "@/features/languages/actions"
import { LanguageForm } from "@/features/languages/components/language-form"
import { dayStreak, weekMinutes } from "@/features/languages/logic"
import { getLanguagesOverview } from "@/features/languages/queries"
import { formatMinutes } from "@/lib/duration"

export const metadata: Metadata = { title: "Languages" }

export default function LanguagesPage() {
  return (
    <>
      <PageHeader
        title="Languages"
        description="A little practice most days adds up. Track your time and new words."
      />
      <div className="grid gap-6 md:gap-8 lg:grid-cols-[minmax(0,1fr)_20rem]">
        <aside className="order-last">
          <DashboardCard title="Add a language" icon={Plus} accent="lavender">
            <LanguageForm action={createLanguage} submitLabel="Add language" />
          </DashboardCard>
        </aside>
        <Suspense fallback={<Skeleton className="h-64 rounded-xl" />}>
          <Overview />
        </Suspense>
      </div>
    </>
  )
}

async function Overview() {
  const { today, languages, practice } = await getLanguagesOverview()
  const active = languages.filter((l) => !l.archived)
  const archived = languages.filter((l) => l.archived)

  if (active.length === 0 && archived.length === 0) {
    return (
      <EmptyState icon={Languages} accent="lavender" title="No languages yet">
        Add the language you&apos;re learning to start logging practice and new
        words.
      </EmptyState>
    )
  }

  const streak = dayStreak(
    practice.map((p) => p.local_date),
    today,
  )

  return (
    <div className="grid content-start gap-8">
      <div className="grid grid-cols-2 gap-2 sm:gap-4">
        <div className="grid gap-0.5 surface p-3 sm:p-4">
          <p className="text-xs text-muted-foreground sm:text-sm">This week</p>
          <p className="text-lg font-semibold tabular-nums sm:text-2xl">
            {formatMinutes(weekMinutes(practice, today))}
          </p>
        </div>
        <div className="grid gap-0.5 surface p-3 sm:p-4">
          <p className="text-xs text-muted-foreground sm:text-sm">
            Practice streak
          </p>
          <p className="text-lg font-semibold tabular-nums sm:text-2xl">
            {streak} day{streak === 1 ? "" : "s"}
          </p>
        </div>
      </div>

      <Section id="learning" title="Learning">
        {active.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No languages in progress. Add one, or restore an archived one.
          </p>
        ) : (
          <ul aria-label="Languages" className="grid gap-3 sm:grid-cols-2">
            {active.map((language) => {
              const minutes = weekMinutes(
                practice.filter((p) => p.language_id === language.id),
                today,
              )
              return (
                <li key={language.id}>
                  <Link
                    href={`/languages/${language.id}`}
                    className="grid h-full content-start gap-1 surface p-4 transition-colors duration-200 outline-none hover:bg-muted/40 focus-visible:ring-3 focus-visible:ring-ring/50"
                  >
                    <span className="flex items-baseline gap-2">
                      <span className="truncate font-medium">
                        {language.name}
                      </span>
                      {language.level && (
                        <span className="rounded-md bg-lavender px-1.5 text-xs font-medium text-foreground">
                          {language.level}
                        </span>
                      )}
                    </span>
                    <span className="text-xs text-muted-foreground tabular-nums">
                      {formatMinutes(minutes)} this week · {language.learned} of{" "}
                      {language.words} word
                      {language.words === 1 ? "" : "s"} learned
                    </span>
                  </Link>
                </li>
              )
            })}
          </ul>
        )}
      </Section>

      {archived.length > 0 && (
        <details>
          <summary className="cursor-pointer rounded-sm font-medium outline-none focus-visible:ring-3 focus-visible:ring-ring/50">
            Archived · {archived.length}
          </summary>
          <ul aria-label="Archived languages" className="mt-3 grid gap-1">
            {archived.map((language) => (
              <li key={language.id}>
                <Link
                  href={`/languages/${language.id}`}
                  className="text-sm text-primary underline-offset-4 hover:underline"
                >
                  {language.name}
                </Link>
              </li>
            ))}
          </ul>
        </details>
      )}
    </div>
  )
}
