import Link from "next/link"

import {
  dayOfMonth,
  formatLocalDate,
  isSameMonth,
  type LocalDate,
} from "@/lib/dates/local-date"
import { cn } from "@/lib/utils"

import type { CalendarDay } from "../logic"
import { calendarHref } from "./calendar-toolbar"
import { DraggableEvent, DropDay } from "./calendar-dnd"

const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]
const MAX_TITLES = 2

/**
 * Month overview. Each day links to itself so its agenda shows below.
 * Phones show dots; wider screens show the first titles.
 */
export function MonthGrid({
  weeks,
  month,
  selected,
  today,
  days,
}: {
  weeks: LocalDate[][]
  month: LocalDate
  selected: LocalDate
  today: LocalDate
  days: Map<LocalDate, CalendarDay>
}) {
  return (
    <div className="overflow-hidden surface">
      <div className="grid grid-cols-7 border-b bg-muted/60 text-center text-xs font-medium text-muted-foreground">
        {WEEKDAYS.map((name) => (
          <div key={name} className="py-2" aria-hidden="true">
            {name}
          </div>
        ))}
      </div>
      <ol
        className="grid grid-cols-7"
        aria-label={formatLocalDate(month, "month")}
      >
        {weeks.flat().map((day) => {
          const items = days.get(day) ?? { events: [], tasks: [] }
          const titles = [
            ...items.events.map((e) => ({
              id: e.id,
              title: e.title,
              done: false,
              event: true,
            })),
            ...items.tasks.map((t) => ({
              id: t.id,
              title: t.title,
              done: t.status === "done",
              event: false,
            })),
          ]
          const count = titles.length
          const inMonth = isSameMonth(day, month)
          const isSelected = day === selected
          const isToday = day === today
          const label = `${formatLocalDate(day, "long")}${count ? `, ${count} item${count === 1 ? "" : "s"}` : ""}`

          return (
            <li
              key={day}
              className="min-w-0 border-r border-b [&:nth-child(7n)]:border-r-0"
            >
              <DropDay day={day}>
                <Link
                  href={calendarHref("month", day)}
                  aria-label={label}
                  aria-current={isSelected ? "date" : undefined}
                  scroll={false}
                  className={cn(
                    "flex h-14 flex-col gap-1 p-1 outline-none hover:bg-muted/60 focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:ring-inset md:h-24 md:p-1.5",
                    !inMonth && "text-muted-foreground/60",
                    isSelected && "bg-sage/70",
                  )}
                >
                  <span
                    className={cn(
                      "grid size-6 place-items-center rounded-full text-xs",
                      isToday &&
                        "bg-primary font-medium text-primary-foreground",
                    )}
                  >
                    {dayOfMonth(day)}
                  </span>
                  {count > 0 && (
                    <>
                      {/* Phones: one dot per item, up to three. */}
                      <span
                        className="flex gap-0.5 px-1 md:hidden"
                        aria-hidden="true"
                      >
                        {titles.slice(0, 3).map((item) => (
                          <span
                            key={item.id}
                            className={cn(
                              "size-1.5 rounded-full bg-primary",
                              item.done && "bg-muted-foreground/40",
                            )}
                          />
                        ))}
                      </span>
                      {/* Wider screens: first titles, then "+N more". */}
                      <span
                        className="hidden min-w-0 flex-col gap-0.5 md:flex"
                        aria-hidden="true"
                      >
                        {titles.slice(0, MAX_TITLES).map((item) => {
                          const chip = (
                            <span
                              className={cn(
                                "block truncate rounded px-1 text-[11px] leading-4",
                                item.event
                                  ? "bg-mint text-mint-ink"
                                  : "bg-sage text-sage-ink",
                                item.done &&
                                  "text-muted-foreground line-through",
                              )}
                            >
                              {item.title}
                            </span>
                          )
                          // Only events move by dragging; tasks never do.
                          return item.event ? (
                            <DraggableEvent
                              key={item.id}
                              id={item.id}
                              from={day}
                            >
                              {chip}
                            </DraggableEvent>
                          ) : (
                            <span key={item.id}>{chip}</span>
                          )
                        })}
                        {count > MAX_TITLES && (
                          <span className="px-1 text-[11px] leading-4 text-muted-foreground">
                            +{count - MAX_TITLES} more
                          </span>
                        )}
                      </span>
                    </>
                  )}
                </Link>
              </DropDay>
            </li>
          )
        })}
      </ol>
    </div>
  )
}
