import { CalendarClock, Leaf, Sun } from "lucide-react"
import type { Metadata } from "next"
import Link from "next/link"
import { Suspense } from "react"

import { EmptyState } from "@/components/empty-state"
import { DashboardCard } from "@/components/layout/dashboard-card"
import { Section } from "@/components/layout/section"
import { Skeleton } from "@/components/ui/skeleton"
import { TodayAchievementsCard } from "@/features/achievements/components/today-achievements-card"
import { eventTimeLabel } from "@/features/calendar/logic"
import { getEvents } from "@/features/calendar/queries"
import { ReviewForm } from "@/features/days/components/review-form"
import { ensurePastDaysClosed, getDay } from "@/features/days/queries"
import { SpendingCard } from "@/features/finance/components/spending-card"
import { dailyMinutes } from "@/features/focus/logic"
import { TodayFocusCard } from "@/features/focus/components/today-focus-card"
import { getFocusOverview } from "@/features/focus/queries"
import { TodayGoalsCard } from "@/features/goals/components/today-goals-card"
import { TodayHabitsCard } from "@/features/habits/components/today-habits-card"
import { isScheduled } from "@/features/habits/logic"
import { getHabits } from "@/features/habits/queries"
import { TodayJournalCard } from "@/features/journal/components/today-journal-card"
import { TodayLanguagesCard } from "@/features/languages/components/today-languages-card"
import { getProfile } from "@/features/profile/queries"
import { NeedsDecisionCard } from "@/features/tasks/components/needs-decision-card"
import { QuickAddTask } from "@/features/tasks/components/quick-add-task"
import { TaskList } from "@/features/tasks/components/task-list"
import { dueLabel } from "@/features/tasks/logic"
import { getTasks, getTodayTasks, getUserToday } from "@/features/tasks/queries"
import { QuickActions } from "@/features/today/components/quick-actions"
import { TodayHero } from "@/features/today/components/today-hero"
import {
  encouragement,
  greeting,
  suggestNextStep,
} from "@/features/today/logic"
import { TodayWorkoutsCard } from "@/features/workouts/components/today-workouts-card"
import { formatLongDate, localHour } from "@/lib/dates/timezone"
import { formatMinutes } from "@/lib/duration"

export const metadata: Metadata = { title: "Today" }

const UPCOMING_PREVIEW = 4

/** The cards that summarise each module (each loads its own data). */
const MODULE_CARDS = [
  ["spending", SpendingCard],
  ["workouts", TodayWorkoutsCard],
  ["goals", TodayGoalsCard],
  ["languages", TodayLanguagesCard],
  ["journal", TodayJournalCard],
  ["achievements", TodayAchievementsCard],
] as const

export default function TodayPage() {
  return (
    <div className="grid gap-6 md:gap-8">
      <Suspense fallback={<TodaySkeleton />}>
        <Today />
      </Suspense>
    </div>
  )
}

async function Today() {
  const [{ today, timezone }, profile] = await Promise.all([
    getUserToday(),
    getProfile(),
  ])
  const [{ overdue, planned, done }, events, day, upcoming, { habits }, focus] =
    await Promise.all([
      getTodayTasks(),
      getEvents(today, today, timezone),
      getDay(today),
      getTasks("upcoming"),
      getHabits(),
      getFocusOverview(),
      ensurePastDaysClosed(),
    ])

  const now = new Date()
  const hour = localHour(now, timezone)
  const scheduledHabits = habits.filter((h) => isScheduled(h.days_mask, today))
  const habitsDone = scheduledHabits.filter((h) =>
    h.done.includes(today),
  ).length
  const focusToday = dailyMinutes(
    focus.sessions,
    today,
    timezone,
    focus.now,
    1,
  )[0]!.minutes
  const nextEvent = events.find((e) => e.all_day || new Date(e.ends_at!) > now)
  const name = profile.displayName ? `, ${profile.displayName}` : ""

  const nextStep = suggestNextStep({
    overdue: overdue.length,
    planned: planned.length,
    done: done.length,
    habitsLeft: scheduledHabits.length - habitsDone,
    reflected: day?.reviewed_at != null,
    hour,
  })

  return (
    <>
      <TodayHero
        date={formatLongDate(now, timezone)}
        title={`${greeting(hour)}${name}`}
        message={encouragement(done.length, planned.length)}
        done={done.length}
        planned={planned.length}
        habits={{ done: habitsDone, scheduled: scheduledHabits.length }}
        focusMinutes={focusToday > 0 ? formatMinutes(focusToday) : null}
        nextEvent={
          nextEvent
            ? `${eventTimeLabel(nextEvent, today, timezone)} · ${nextEvent.title}`
            : null
        }
        nextStep={nextStep}
      />

      <QuickActions />

      {overdue.length > 0 && (
        <div id="needs-decision" className="scroll-mt-24">
          <NeedsDecisionCard tasks={overdue} today={today} />
        </div>
      )}

      <div className="grid gap-6 md:gap-8 lg:grid-cols-[minmax(0,1fr)_20rem]">
        <div className="grid content-start gap-6 md:gap-8">
          <Section
            id="today"
            title="Today's plan"
            description="What you'd like to get done today."
          >
            <div id="quick-add" className="scroll-mt-24">
              <QuickAddTask fixedDueDate={today} />
            </div>
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

        <aside className="grid content-start gap-4 md:gap-6">
          <Suspense fallback={<Skeleton className="h-32 rounded-xl" />}>
            <TodayHabitsCard />
          </Suspense>
          <Suspense fallback={<Skeleton className="h-28 rounded-xl" />}>
            <TodayFocusCard />
          </Suspense>
          <DashboardCard
            title="Schedule"
            icon={CalendarClock}
            accent="mint"
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
              <p className="text-sm text-muted-foreground">
                No events today.{" "}
                <Link
                  href={`/calendar/events/new?date=${today}`}
                  className="font-medium text-primary underline-offset-4 hover:underline"
                >
                  Add an event
                </Link>
              </p>
            ) : (
              <ul aria-label="Today's events" className="grid gap-1 text-sm">
                {events.map((event) => (
                  <li key={event.id}>
                    <Link
                      href={`/calendar/events/${event.id}`}
                      className="-mx-2 grid gap-0.5 rounded-lg px-2 py-1.5 outline-none hover:bg-muted focus-visible:ring-3 focus-visible:ring-ring/50"
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
        </aside>
      </div>

      <Section
        id="life"
        title="Across your life"
        description="A glance at everything else you're growing."
      >
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {MODULE_CARDS.map(([key, Card]) => (
            <Suspense
              key={key}
              fallback={<Skeleton className="h-32 rounded-xl" />}
            >
              <Card />
            </Suspense>
          ))}
        </div>
      </Section>

      <div id="reflect" className="scroll-mt-24">
        <DashboardCard title="Reflect on your day" icon={Leaf} accent="mint">
          <p className="-mt-1 text-sm text-muted-foreground">
            A minute to notice how today went. Only you can see this.
          </p>
          <ReviewForm date={today} review={day} />
        </DashboardCard>
      </div>
    </>
  )
}

function TodaySkeleton() {
  return (
    <div className="grid gap-6" aria-hidden="true">
      <Skeleton className="h-64 rounded-3xl" />
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
        {Array.from({ length: 5 }, (_, i) => (
          <Skeleton key={i} className="h-14 rounded-xl" />
        ))}
      </div>
      <Skeleton className="h-64 rounded-xl" />
    </div>
  )
}
