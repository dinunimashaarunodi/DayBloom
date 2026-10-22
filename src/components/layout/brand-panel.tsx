import {
  CircleCheck,
  Repeat,
  Sparkles,
  Target,
  type LucideIcon,
} from "lucide-react"

import { Logo } from "@/components/layout/logo"
import { cn } from "@/lib/utils"

const HIGHLIGHTS: { icon: LucideIcon; title: string; text: string }[] = [
  {
    icon: CircleCheck,
    title: "Plan a calm day",
    text: "Tasks, calendar and a gentle daily review.",
  },
  {
    icon: Repeat,
    title: "Grow small habits",
    text: "Streaks, focus sessions, workouts and languages.",
  },
  {
    icon: Target,
    title: "See your progress",
    text: "Goals, finances and achievements in one place.",
  },
]

/** The gradient story panel used on the landing and sign-in pages. */
export function BrandPanel({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "relative isolate flex flex-col justify-between gap-10 overflow-hidden bg-bloom p-8 lg:p-12",
        className,
      )}
    >
      <div
        aria-hidden="true"
        className="absolute -top-32 -right-24 -z-10 size-96 rounded-full bg-white/15 blur-3xl"
      />
      <div
        aria-hidden="true"
        className="absolute -bottom-40 -left-24 -z-10 size-96 rounded-full bg-white/10 blur-3xl"
      />
      <Logo className="text-white max-lg:hidden" />
      <div className="grid gap-4">
        <p className="inline-flex w-fit items-center gap-2 rounded-full bg-white/12 px-3 py-1 text-xs font-medium ring-1 ring-white/20">
          <Sparkles className="size-3.5" aria-hidden="true" />
          Your days, gently organised
        </p>
        <p className="max-w-md text-3xl font-semibold tracking-tight lg:text-4xl">
          Plan your day, notice your progress, and watch your life bloom.
        </p>
      </div>
      <ul className="grid gap-4">
        {HIGHLIGHTS.map(({ icon: Icon, title, text }) => (
          <li key={title} className="flex items-start gap-3">
            <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-white/15 ring-1 ring-white/20">
              <Icon className="size-4.5" aria-hidden="true" />
            </span>
            <span className="grid">
              <span className="font-medium">{title}</span>
              <span className="text-sm text-white/85">{text}</span>
            </span>
          </li>
        ))}
      </ul>
    </div>
  )
}
