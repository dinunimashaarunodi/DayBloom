import {
  Dumbbell,
  ListPlus,
  NotebookPen,
  Timer,
  Wallet,
  type LucideIcon,
} from "lucide-react"
import Link from "next/link"

import { ACCENT_CHIP, type Accent } from "@/components/accent"
import { cn } from "@/lib/utils"

const ACTIONS: {
  href: string
  label: string
  icon: LucideIcon
  accent: Accent
}[] = [
  { href: "#quick-add", label: "Add a task", icon: ListPlus, accent: "sage" },
  { href: "/focus", label: "Start focus", icon: Timer, accent: "lavender" },
  { href: "/workouts", label: "Log a workout", icon: Dumbbell, accent: "mint" },
  {
    href: "/journal/new",
    label: "Write in journal",
    icon: NotebookPen,
    accent: "rose",
  },
  { href: "/finance", label: "Add an expense", icon: Wallet, accent: "peach" },
]

/** Shortcuts to the most common actions. Every one goes somewhere real. */
export function QuickActions() {
  return (
    <nav aria-label="Quick actions" className="min-w-0">
      {/* A swipeable row on phones, a grid from tablet width up. */}
      <ul className="-mx-4 flex snap-x gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:grid sm:grid-cols-3 sm:overflow-visible sm:px-0 sm:pb-0 lg:grid-cols-5">
        {ACTIONS.map(({ href, label, icon: Icon, accent }) => (
          <li key={href} className="shrink-0 snap-start">
            <Link
              href={href}
              className="flex h-full surface-interactive items-center gap-3 surface px-3 py-3 text-sm font-medium whitespace-nowrap outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
            >
              <span
                className={cn(
                  "grid size-9 shrink-0 place-items-center rounded-xl",
                  ACCENT_CHIP[accent],
                )}
              >
                <Icon className="size-4.5" aria-hidden="true" />
              </span>
              {label}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  )
}
