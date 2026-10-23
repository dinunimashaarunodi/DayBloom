import type { Metadata } from "next"
import { Suspense } from "react"

import { PageHeader } from "@/components/layout/page-header"
import { Section } from "@/components/layout/section"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { CalendarToolbar } from "@/features/calendar/components/calendar-toolbar"
import {
  CalendarDnd,
  DropDay,
} from "@/features/calendar/components/calendar-dnd"
import { EventList } from "@/features/calendar/components/event-list"
import { MonthGrid } from "@/features/calendar/components/month-grid"
import { groupByDay, type CalendarDay } from "@/features/calendar/logic"
import { getEvents } from "@/features/calendar/queries"
import { parseCalendarView } from "@/features/calendar/schema"
import { TaskList } from "@/features/tasks/components/task-list"
import type { Task } from "@/features/tasks/logic"
import {
  ensureRepeatingTasks,
  getTasksInRange,
  getUserToday,
} from "@/features/tasks/queries"
import {
  addDays,
  addMonths,
  formatLocalDate,
  isLocalDate,
  monthGrid,
  startOfWeek,
  type LocalDate,
} from "@/lib/dates/local-date"

export const metadata: Metadata = { title: "Calendar" }

export default function CalendarPage({ searchParams }: PageProps<"/calendar">) {
  return (
    <>
      <PageHeader
        title="Calendar"
        description="See your days, weeks and months at a glance."
      />
      <Suspense fallback={<Skeleton className="h-96" />}>
        <CalendarContent searchParams={searchParams} />
      </Suspense>
    </>
  )
}

async function CalendarContent({
  searchParams,
}: Pick<PageProps<"/calendar">, "searchParams">) {
  const params = await searchParams
  const view = parseCalendarView(params.view)
  const { today, timezone } = await getUserToday()
  const selected: LocalDate = isLocalDate(params.date) ? params.date : today

  const weeks = monthGrid(selected)
  const days =
    view === "month"
      ? weeks.flat()
      : Array.from({ length: 7 }, (_, i) => addDays(startOfWeek(selected), i))
  const from = days[0]
  const to = days[days.length - 1]

  await ensureRepeatingTasks()
  const [tasks, events] = await Promise.all([
    getTasksInRange(from, to),
    getEvents(from, to, timezone),
  ])
  const byDay = groupByDay(days, tasks, events, timezone)
  const agenda = (day: LocalDate) => (
    <DayAgenda
      key={day}
      day={day}
      today={today}
      timezone={timezone}
      items={byDay.get(day)!}
    />
  )

  return (
    <>
      <CalendarToolbar
        title={
          view === "month"
            ? formatLocalDate(selected, "month")
            : `${formatLocalDate(from, "short")} – ${formatLocalDate(to, "short")}`
        }
        view={view}
        selected={selected}
        today={today}
        previous={
          view === "month" ? addMonths(selected, -1) : addDays(selected, -7)
        }
        next={view === "month" ? addMonths(selected, 1) : addDays(selected, 7)}
      />
      <CalendarDnd>
        {view === "month" ? (
          <div className="grid gap-6">
            <MonthGrid
              weeks={weeks}
              month={selected}
              selected={selected}
              today={today}
              days={byDay}
            />
            {agenda(selected)}
          </div>
        ) : (
          <div className="grid gap-6">{days.map(agenda)}</div>
        )}
      </CalendarDnd>
    </>
  )
}

/** One day's events and tasks. */
function DayAgenda({
  day,
  today,
  timezone,
  items,
}: {
  day: LocalDate
  today: LocalDate
  timezone: string
  items: CalendarDay<Task>
}) {
  const name = formatLocalDate(day, "long")
  const empty = items.events.length === 0 && items.tasks.length === 0

  return (
    <DropDay day={day} className="-m-2 p-2">
      <Section
        id={`day-${day}`}
        title={
          <span className="flex items-center gap-2">
            {name}
            {day === today && <Badge variant="secondary">Today</Badge>}
          </span>
        }
      >
        {empty ? (
          <p className="text-sm text-muted-foreground">Nothing planned.</p>
        ) : (
          <div className="grid gap-2">
            {items.events.length > 0 && (
              <EventList
                label={`Events on ${name}`}
                events={items.events}
                day={day}
                timezone={timezone}
                draggable
              />
            )}
            {items.tasks.length > 0 && (
              <TaskList
                label={`Tasks on ${name}`}
                tasks={items.tasks}
                today={today}
                hideDue
              />
            )}
          </div>
        )}
      </Section>
    </DropDay>
  )
}
