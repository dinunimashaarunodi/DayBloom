import {
  ArrowRight,
  CalendarClock,
  CalendarPlus,
  CircleCheck,
  Compass,
  Repeat,
  Sparkles,
  Timer,
  type LucideIcon,
} from "lucide-react"
import Link from "next/link"
import type * as React from "react"

import { ProgressRing } from "@/components/progress-ring"
import { cn } from "@/lib/utils"

import type { NextStep } from "../logic"

function Stat({
  icon: Icon,
  children,
}: {
  icon: LucideIcon
  children: React.ReactNode
}) {
  return (
    <li className="flex min-w-0 items-center gap-1.5 rounded-full bg-white/12 px-3 py-1.5 text-sm ring-1 ring-white/15 backdrop-blur-sm">
      <Icon className="size-4 shrink-0 opacity-90" aria-hidden="true" />
      <span className="truncate">{children}</span>
    </li>
  )
}

/**
 * The top of Today: greeting, task progress ring, today's numbers at a glance
 * and one suggested next step. White text on the bloom gradient (AA at every
 * gradient stop).
 */
export function TodayHero({
  date,
  title,
  message,
  done,
  planned,
  habits,
  focusMinutes,
  nextEvent,
  nextStep,
}: {
  date: string
  title: string
  message: string
  done: number
  planned: number
  habits: { done: number; scheduled: number }
  focusMinutes: string | null
  nextEvent: string | null
  nextStep: NextStep
}) {
  const total = done + planned

  return (
    <section
      aria-labelledby="today-title"
      className="relative isolate overflow-hidden rounded-3xl bg-bloom p-5 shadow-lift sm:p-7"
    >
      {/* Soft light blooms, purely decorative. */}
      <div
        aria-hidden="true"
        className="absolute -top-24 -right-16 -z-10 size-72 rounded-full bg-white/15 blur-3xl"
      />
      <div
        aria-hidden="true"
        className="absolute -bottom-28 -left-10 -z-10 size-64 rounded-full bg-white/10 blur-3xl"
      />

      <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
        <div className="grid min-w-0 gap-3">
          <p className="text-sm font-medium text-white/85">{date}</p>
          <h1
            id="today-title"
            className="text-3xl font-semibold tracking-tight text-white md:text-4xl"
          >
            {title}
          </h1>
          <p className="text-white/90">{message}</p>
          <ul aria-label="Today at a glance" className="flex flex-wrap gap-2">
            <Stat icon={CircleCheck}>
              {done} of {total} task{total === 1 ? "" : "s"} done
            </Stat>
            {habits.scheduled > 0 && (
              <Stat icon={Repeat}>
                {habits.done} of {habits.scheduled} habit
                {habits.scheduled === 1 ? "" : "s"}
              </Stat>
            )}
            {focusMinutes && <Stat icon={Timer}>{focusMinutes} focused</Stat>}
            {nextEvent && <Stat icon={CalendarClock}>{nextEvent}</Stat>}
          </ul>
        </div>

        <div className="flex items-center gap-4 lg:flex-col lg:items-end">
          <ProgressRing
            value={done}
            max={total}
            label="Today's tasks completed"
            className="text-white"
            trackClassName="stroke-white/20"
          >
            <span className="grid leading-tight text-white">
              <span className="text-2xl font-semibold tabular-nums">
                {total === 0 ? "–" : `${Math.round((done / total) * 100)}%`}
              </span>
              <span className="text-[11px] text-white/80">of today</span>
            </span>
          </ProgressRing>
          <Link
            href="/tasks?view=upcoming"
            className="inline-flex h-10 items-center gap-2 rounded-xl bg-white/12 px-4 text-sm font-medium text-white ring-1 ring-white/25 transition-colors outline-none hover:bg-white/20 focus-visible:ring-3 focus-visible:ring-white/70"
          >
            <CalendarPlus className="size-4" aria-hidden="true" />
            Plan tomorrow
          </Link>
        </div>
      </div>

      <div
        className={cn(
          "mt-6 flex flex-col gap-3 rounded-2xl bg-white/10 p-4 ring-1 ring-white/15 sm:flex-row sm:items-center",
        )}
      >
        <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-white/15">
          {nextStep.key === "done" ? (
            <Sparkles className="size-5" aria-hidden="true" />
          ) : (
            <Compass className="size-5" aria-hidden="true" />
          )}
        </span>
        <div className="grid min-w-0 flex-1 gap-0.5">
          <p className="text-xs font-semibold tracking-wider text-white/75 uppercase">
            Suggested next step
          </p>
          <p className="font-semibold text-white">{nextStep.title}</p>
          <p className="text-sm text-white/85">{nextStep.description}</p>
        </div>
        {nextStep.href && nextStep.cta && (
          <Link
            href={nextStep.href}
            className="inline-flex h-10 shrink-0 items-center justify-center gap-2 rounded-xl bg-white px-4 text-sm font-semibold text-bloom-via shadow-md transition-transform outline-none hover:-translate-y-0.5 focus-visible:ring-3 focus-visible:ring-white/70"
          >
            {nextStep.cta}
            <ArrowRight className="size-4" aria-hidden="true" />
          </Link>
        )}
      </div>
    </section>
  )
}
