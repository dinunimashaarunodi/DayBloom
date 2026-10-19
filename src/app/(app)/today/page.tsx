import { CalendarClock, CalendarPlus, Clock, Leaf, Sun } from "lucide-react"
import type { Metadata } from "next"
import Link from "next/link"
import { connection } from "next/server"
import { Suspense } from "react"

import { EmptyState } from "@/components/empty-state"
import { DashboardCard } from "@/components/layout/dashboard-card"
import { PageHeader } from "@/components/layout/page-header"
import { Section } from "@/components/layout/section"
import { buttonVariants } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { eventTimeLabel } from "@/features/calendar/logic"
import { getEvents } from "@/features/calendar/queries"
import { ReviewForm } from "@/features/days/components/review-form"
import { SpendingCard } from "@/features/finance/components/spending-card"
import { ensurePastDaysClosed, getDay } from "@/features/days/queries"
import { getProfile } from "@/features/profile/queries"
import { DailyProgress } from "@/features/tasks/components/daily-progress"
import { NeedsDecisionCard } from "@/features/tasks/components/needs-decision-card"
import { QuickAddTask } from "@/features/tasks/components/quick-add-task"
import { TaskList } from "@/features/tasks/components/task-list"
import { dueLabel } from "@/features/tasks/logic"
import { getTasks, getTodayTasks, getUserToday } from "@/features/tasks/queries"
import { formatLongDate, localHour } from "@/lib/dates/timezone"
import { cn } from "@/lib/utils"

export const metadata: Metadata = { title: "Today" }

const UPCOMING_PREVIEW = 4

export default function TodayPage() {
  return (
    <>
      <Suspense fallback={<HeaderSkeleton />}>
        <TodayHeader />
      </Suspense>
      <Suspense fallback={<DashboardSkeleton />}>
        <TodayDashboard />
      </Suspense>
    </>
  )
}

async function TodayHeader() {
  const profile = await getProfile()
  await connection() // "now" must be read at request time, never at build time.
  const now = new Date()
  const hour = localHour(now, profile.timezone)
  const greeting =
    hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening"
  const name = profile.displayName ? `, ${profile.displayName}` : ""

  return (
    <PageHeader
      eyebrow={formatLongDate(now, profile.timezone)}
      title={`${greeting}${name}`}
      actions={
        <Link
          href="/tasks?view=upcoming"
          className={cn(buttonVariants({ variant: "outline" }), "h-10 px-4")}
        >
          <CalendarPlus aria-hidden="true" />
          Plan tomorrow
        </Link>
      }
    />
  )
}

async function TodayDashboard() {
  const { today, timezone } = await getUserToday()
  const [{ overdue, planned, done }, events, day, upcoming] = await Promise.all(
    [
      getTodayTasks(),
      getEvents(today, today, timezone),
      getDay(today),
      getTasks("upcoming"),
      ensurePastDaysClosed(),
    ],
  )
  const now = new Date()
  const nextEvent = events.find((e) => e.all_day || new Date(e.ends_at!) > now)

  return (
    <div className="grid gap-6 md:gap-8">
      {/* At a glance: real numbers only. */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <DailyProgress done={done.length} remaining={planned.length} />

        <Suspense fallback={<Skeleton className="h-28 rounded-xl" />}>
          <SpendingCard />
        </Suspense>

        <DashboardCard title="Up next" icon={Clock} accent="sage">
          {nextEvent ? (
            <p className="grid gap-0.5">
              <span className="text-sm text-muted-foreground tabular-nums">
                {eventTimeLabel(nextEvent, today, timezone)}
              </span>
              <span className="truncate font-medium">{nextEvent.title}</span>
            </p>
          ) : (
            <p className="text-sm text-muted-foreground">
              Nothing else scheduled today.{" "}
              <Link
                href={`/calendar/events/new?date=${today}`}
                className="font-medium text-primary underline-offset-4 hover:underline"
              >
                Add an event
              </Link>
            </p>
          )}
        </DashboardCard>

        <DashboardCard
          title="Coming up"
          icon={CalendarClock}
          accent="sage"
          action={
            upcoming.tasks.length > 0 && (
              <Link
                href="/tasks?view=upcoming"
                className="text-xs font-medium text-primary underline-offset-4 hover:underline"
              >
                See all
              </Link>
            )
          }
        >
          {upcoming.tasks.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Nothing planned ahead yet.
            </p>
          ) : (
            <ul className="grid gap-1.5 text-sm" aria-label="Coming up">
              {upcoming.tasks.slice(0, UPCOMING_PREVIEW).map((task) => (
                <li key={task.id} className="flex justify-between gap-3">
                  <span className="truncate">{task.title}</span>
                  <span className="shrink-0 text-muted-foreground">
                    {dueLabel(task.due_date, today)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </DashboardCard>
      </div>

      {overdue.length > 0 && (
        <NeedsDecisionCard tasks={overdue} today={today} />
      )}

      <div className="grid gap-6 md:gap-8 lg:grid-cols-[minmax(0,1fr)_18rem]">
        <div className="grid content-start gap-6 md:gap-8">
          <Section id="today" title="Today">
            <QuickAddTask fixedDueDate={today} />
            {planned.length > 0 ? (
              <TaskList
                label="Today"
                tasks={planned}
                today={today}
                reorderable
                hideDueToday
              />
            ) : (
              <EmptyState icon={Sun} title="Your day is a blank page">
                Add something you&apos;d like to get done today.
              </EmptyState>
            )}
          </Section>

          {done.length > 0 && (
            <Section
              id="done"
              title={`Done today · ${done.length}`}
              description="Nice work. Every one counts."
            >
              <TaskList
                label="Done today"
                tasks={done}
                today={today}
                hideDueToday
              />
            </Section>
          )}
        </div>

        <aside className="grid content-start gap-6">
          <DashboardCard
            title="Schedule"
            icon={CalendarClock}
            accent="sage"
            action={
              <Link
                href={`/calendar?view=week&date=${today}`}
                className="text-xs font-medium text-primary underline-offset-4 hover:underline"
              >
                Calendar
              </Link>
            }
          >
            {events.length === 0 ? (
              <p className="text-sm text-muted-foreground">No events today.</p>
            ) : (
              <ul aria-label="Today's events" className="grid gap-1 text-sm">
                {events.map((event) => (
                  <li key={event.id}>
                    <Link
                      href={`/calendar/events/${event.id}`}
                      className="-mx-2 grid gap-0.5 rounded-lg px-2 py-1.5 outline-none hover:bg-muted/60 focus-visible:ring-3 focus-visible:ring-ring/50"
                    >
                      <span className="text-xs text-muted-foreground tabular-nums">
                        {eventTimeLabel(event, today, timezone)}
                      </span>
                      <span className="truncate">{event.title}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </DashboardCard>
        </aside>
      </div>

      <DashboardCard title="Reflect on your day" icon={Leaf} accent="mint">
        <p className="-mt-1 text-sm text-muted-foreground">
          A minute to notice how today went. Only you can see this.
        </p>
        <ReviewForm date={today} review={day} />
      </DashboardCard>
    </div>
  )
}

function HeaderSkeleton() {
  return (
    <div className="mb-8 grid gap-2" aria-hidden="true">
      <Skeleton className="h-4 w-40" />
      <Skeleton className="h-9 w-72" />
    </div>
  )
}

function DashboardSkeleton() {
  return (
    <div className="grid gap-6" aria-hidden="true">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Skeleton className="h-28 rounded-xl" />
        <Skeleton className="h-28 rounded-xl" />
        <Skeleton className="h-28 rounded-xl" />
        <Skeleton className="h-28 rounded-xl" />
      </div>
      <Skeleton className="h-64 rounded-xl" />
    </div>
  )
}
