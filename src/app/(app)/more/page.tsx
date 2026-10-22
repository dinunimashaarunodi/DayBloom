import { ChevronRight } from "lucide-react"
import type { Metadata } from "next"
import Link from "next/link"

import { PageHeader } from "@/components/layout/page-header"
import { MORE_ITEMS } from "@/components/layout/nav-items"

export const metadata: Metadata = { title: "More" }

const DESCRIPTIONS: Record<string, string> = {
  "/focus": "Timed sessions for deep work or study",
  "/workouts": "Log your movement and see your week",
  "/goals": "Bigger aims, broken into milestones",
  "/journal": "Private notes and reflections",
  "/history": "Your past days at a glance",
  "/settings": "Profile, timezone, appearance and account",
}

/** The mobile "More" tab: every page that isn't in the tab bar. */
export default function MorePage() {
  return (
    <>
      <PageHeader title="More" />
      <ul aria-label="More pages" className="divide-y overflow-hidden surface">
        {MORE_ITEMS.map(({ href, label, icon: Icon }) => (
          <li key={href}>
            <Link
              href={href}
              className="flex min-h-14 items-center gap-3 px-4 py-3 transition-colors duration-200 outline-none hover:bg-muted/40 focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:ring-inset"
            >
              <span className="grid size-9 shrink-0 place-items-center rounded-full bg-muted">
                <Icon className="size-5" aria-hidden="true" />
              </span>
              <span className="grid min-w-0 flex-1 gap-0.5">
                <span className="font-medium">{label}</span>
                {DESCRIPTIONS[href] && (
                  <span className="truncate text-xs text-muted-foreground">
                    {DESCRIPTIONS[href]}
                  </span>
                )}
              </span>
              <ChevronRight
                className="size-4 shrink-0 text-muted-foreground"
                aria-hidden="true"
              />
            </Link>
          </li>
        ))}
      </ul>
    </>
  )
}
