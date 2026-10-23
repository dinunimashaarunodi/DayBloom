import { Archive, ArchiveRestore, BookOpen, Layers } from "lucide-react"
import type { Metadata } from "next"
import Link from "next/link"
import { notFound } from "next/navigation"
import { Suspense } from "react"

import { EmptyState } from "@/components/empty-state"
import { BackLink } from "@/components/layout/back-link"
import { PageHeader } from "@/components/layout/page-header"
import { Section } from "@/components/layout/section"
import { Button, buttonVariants } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { Skeleton } from "@/components/ui/skeleton"
import {
  setLanguageArchived,
  updateLanguage,
} from "@/features/languages/actions"
import { LanguageForm } from "@/features/languages/components/language-form"
import { PracticeForm } from "@/features/languages/components/practice-form"
import { PracticeList } from "@/features/languages/components/practice-list"
import { WordForm } from "@/features/languages/components/word-form"
import { WordList } from "@/features/languages/components/word-list"
import { isDue, weekMinutes } from "@/features/languages/logic"
import {
  getLanguage,
  getLanguagesOverview,
  RECENT_PRACTICE,
} from "@/features/languages/queries"
import { idSchema } from "@/features/languages/schema"
import { formatMinutes } from "@/lib/duration"
import { cn } from "@/lib/utils"

export const metadata: Metadata = { title: "Language" }

export default function LanguagePage({ params }: PageProps<"/languages/[id]">) {
  return (
    <>
      <BackLink href="/languages" label="Languages" />
      <Suspense fallback={<Skeleton className="h-96" />}>
        <LanguageDetail params={params} />
      </Suspense>
    </>
  )
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid content-start gap-0.5 surface p-3 sm:p-4">
      <p className="text-xs text-muted-foreground sm:text-sm">{label}</p>
      <p className="text-lg font-semibold tabular-nums sm:text-2xl">{value}</p>
    </div>
  )
}

async function LanguageDetail({
  params,
}: Pick<PageProps<"/languages/[id]">, "params">) {
  const { id } = await params
  if (!idSchema.safeParse(id).success) notFound()
  const [detail, { today, practice: allPractice }] = await Promise.all([
    getLanguage(id),
    getLanguagesOverview(),
  ])
  if (!detail) notFound()
  const { language, words } = detail

  const practice = allPractice.filter((p) => p.language_id === id)
  const learned = words.filter((w) => w.learned).length
  const toReview = words.filter((w) => isDue(w, today)).length

  return (
    <>
      <PageHeader
        eyebrow={language.archived ? "Archived" : undefined}
        title={language.name}
        description={language.level ? `Level ${language.level}` : undefined}
        actions={
          toReview > 0 && (
            <Link
              href={`/languages/${id}/review`}
              className={cn(buttonVariants(), "h-10 px-4")}
            >
              <Layers aria-hidden="true" />
              Review {toReview} word{toReview === 1 ? "" : "s"}
            </Link>
          )
        }
      />
      <div className="grid gap-8">
        <div className="grid grid-cols-3 gap-2 sm:gap-4">
          <Stat
            label="This week"
            value={formatMinutes(weekMinutes(practice, today))}
          />
          <Stat label="Words" value={String(words.length)} />
          <Stat label="Learned" value={String(learned)} />
        </div>

        {!language.archived && (
          <div className="grid items-start gap-8 lg:grid-cols-2">
            <Section id="log" title="Log practice">
              <PracticeForm languageId={id} today={today} />
            </Section>
            <Section id="add-word" title="Add a word">
              <WordForm languageId={id} />
            </Section>
          </div>
        )}

        <Section id="practice" title="Recent practice">
          {practice.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No practice logged yet. Even 10 minutes counts.
            </p>
          ) : (
            <PracticeList practice={practice.slice(0, RECENT_PRACTICE)} />
          )}
        </Section>

        <Section
          id="words"
          title="Words"
          description="Tick a word once you know it well."
        >
          {words.length === 0 ? (
            <EmptyState icon={BookOpen} accent="lavender" title="No words yet">
              Add words and phrases as you meet them, then review them as
              flashcards.
            </EmptyState>
          ) : (
            <WordList words={words} today={today} />
          )}
        </Section>

        {!language.archived && (
          <Section id="edit" title="Edit language">
            <div className="max-w-md">
              <LanguageForm
                action={updateLanguage.bind(null, id)}
                submitLabel="Save changes"
                language={language}
              />
            </div>
          </Section>
        )}

        <Separator />
        <form action={setLanguageArchived.bind(null, id, !language.archived)}>
          <Button type="submit" variant="outline" className="h-10 px-4">
            {language.archived ? (
              <>
                <ArchiveRestore aria-hidden="true" />
                Restore language
              </>
            ) : (
              <>
                <Archive aria-hidden="true" />
                Archive language
              </>
            )}
          </Button>
          {!language.archived && (
            <p className="mt-2 text-xs text-muted-foreground">
              Archiving hides it and keeps its practice and words.
            </p>
          )}
        </form>
      </div>
    </>
  )
}
