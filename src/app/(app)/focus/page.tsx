import { Play, Timer } from "lucide-react"
import type { Metadata } from "next"
import { Suspense } from "react"

import { EmptyState } from "@/components/empty-state"
import { DashboardCard } from "@/components/layout/dashboard-card"
import { PageHeader } from "@/components/layout/page-header"
import { Section } from "@/components/layout/section"
import { Skeleton } from "@/components/ui/skeleton"
import { FocusTimer } from "@/features/focus/components/focus-timer"
import { SessionList } from "@/features/focus/components/session-list"
import { StartFocusForm } from "@/features/focus/components/start-focus-form"
import { dailyMinutes, formatMinutes, isActive } from "@/features/focus/logic"
import { getFocusOverview, RECENT_DAYS } from "@/features/focus/queries"
import { formatLocalDate, toLocalDate } from "@/lib/dates/local-date"

export const metadata: Metadata = { title: "Focus" }

export default function FocusPage() {
  return (
    <>
      <PageHeader
        title="Focus"
        description="Pick one thing and give it your full attention for a while."
      />
      <Suspense fallback={<Skeleton className="h-96 rounded-xl" />}>
        <Focus />
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

async function Focus() {
  const { today, timezone, now, sessions, active } = await getFocusOverview()
  const days = dailyMinutes(sessions, today, timezone, now, RECENT_DAYS)
  const week = days.reduce((sum, day) => sum + day.minutes, 0)
  const finishedToday = sessions.filter(
    (s) =>
      !isActive(s, now) &&
      toLocalDate(new Date(s.started_at), timezone) === today,
  )

  return (
    <div className="grid gap-8">
      <DashboardCard
        title={active ? "Focusing" : "Start a session"}
        icon={active ? Timer : Play}
        accent="lavender"
      >
        {active ? (
          // Keyed by session so a new session starts with a fresh timer.
          <FocusTimer
            key={active.id}
            session={active}
            serverNow={now.getTime()}
          />
        ) : (
          <StartFocusForm />
        )}
      </DashboardCard>

      <div className="grid grid-cols-3 gap-2 sm:gap-4">
        <Stat label="Today" value={formatMinutes(days.at(-1)!.minutes)} />
        <Stat label="Last 7 days" value={formatMinutes(week)} />
        <Stat
          label="Sessions today"
          value={String(finishedToday.length + (active ? 1 : 0))}
        />
      </div>

      <Section id="today-sessions" title="Today's sessions">
        {finishedToday.length === 0 ? (
          <EmptyState icon={Timer} accent="lavender" title="No sessions yet">
            Finished sessions appear here. Even 15 minutes counts.
          </EmptyState>
        ) : (
          <SessionList
            label="Today's sessions"
            sessions={finishedToday}
            timezone={timezone}
            now={now}
          />
        )}
      </Section>

      <Section id="week" title="Last 7 days">
        <table className="w-full max-w-md text-sm">
          <caption className="sr-only">Focused time per day</caption>
          <thead className="sr-only">
            <tr>
              <th scope="col">Day</th>
              <th scope="col">Focused</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {[...days].reverse().map((day) => (
              <tr key={day.date}>
                <th scope="row" className="py-2 text-left font-normal">
                  {day.date === today
                    ? "Today"
                    : formatLocalDate(day.date, "long")}
                </th>
                <td className="py-2 text-right tabular-nums">
                  {day.minutes === 0 ? (
                    <span className="text-muted-foreground">–</span>
                  ) : (
                    formatMinutes(day.minutes)
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Section>
    </div>
  )
}
