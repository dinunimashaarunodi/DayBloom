"use client"

import { Check, Flame } from "lucide-react"
import Link from "next/link"
import { useOptimistic, useState, useTransition } from "react"

import type { LocalDate } from "@/lib/dates/local-date"
import { cn } from "@/lib/utils"

import { setCheckIn } from "../actions"

export type HabitDay = {
  date: LocalDate
  /** Short weekday, e.g. "Mon". */
  label: string
  scheduled: boolean
  done: boolean
}

export type HabitListItem = {
  id: string
  name: string
  schedule: string
  streak: number
  days: HabitDay[]
}

/**
 * Habits with tappable check-in circles. "week" shows the last 7 days;
 * "today" shows only today (for the dashboard). Buttons are disabled while a
 * change saves (Next.js sends actions one at a time).
 */
export function HabitList({
  items,
  today,
  variant = "week",
}: {
  items: HabitListItem[]
  today: LocalDate
  variant?: "week" | "today"
}) {
  const [optimistic, toggleOptimistic] = useOptimistic(
    items,
    (current, change: { id: string; date: LocalDate; done: boolean }) =>
      current.map((habit) =>
        habit.id === change.id
          ? {
              ...habit,
              days: habit.days.map((day) =>
                day.date === change.date ? { ...day, done: change.done } : day,
              ),
            }
          : habit,
      ),
  )
  const [saving, startTransition] = useTransition()
  const [error, setError] = useState<string>()

  function toggle(habit: HabitListItem, day: HabitDay) {
    const done = !day.done
    startTransition(async () => {
      toggleOptimistic({ id: habit.id, date: day.date, done })
      const result = await setCheckIn(habit.id, day.date, done)
      setError(result.error)
    })
  }

  return (
    <div className="grid gap-2">
      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}
      <ul
        aria-label={variant === "today" ? "Today's habits" : "Habits"}
        className={cn(
          "divide-y",
          variant === "week" && "overflow-hidden surface",
        )}
      >
        {optimistic.map((habit) => {
          const days =
            variant === "today"
              ? habit.days.filter((d) => d.date === today)
              : habit.days
          return (
            <li
              key={habit.id}
              className={cn(
                "flex gap-3",
                variant === "week"
                  ? "flex-col px-4 py-3 sm:flex-row sm:items-center"
                  : "items-center py-2",
              )}
            >
              <div className="grid w-full min-w-0 flex-1 gap-0.5">
                <Link
                  href={`/habits/${habit.id}`}
                  className="truncate rounded-sm font-medium outline-none hover:underline focus-visible:ring-3 focus-visible:ring-ring/50"
                >
                  {habit.name}
                </Link>
                <span className="flex items-center gap-2 text-xs text-muted-foreground">
                  {variant === "week" && <span>{habit.schedule}</span>}
                  {habit.streak > 0 && (
                    <span className="inline-flex items-center gap-0.5">
                      <Flame
                        className="size-3.5 text-gold"
                        aria-hidden="true"
                      />
                      {habit.streak}-day streak
                    </span>
                  )}
                </span>
              </div>
              <ol
                className={cn(
                  "flex shrink-0 gap-1",
                  variant === "week" && "justify-between sm:justify-start",
                )}
                aria-label={`${habit.name} check-ins`}
              >
                {days.map((day) => (
                  <li
                    key={day.date}
                    className="grid justify-items-center gap-0.5"
                  >
                    {variant === "week" && (
                      <span
                        className="text-[10px] text-muted-foreground"
                        aria-hidden="true"
                      >
                        {day.label.slice(0, 1)}
                      </span>
                    )}
                    <button
                      type="button"
                      disabled={saving}
                      aria-pressed={day.done}
                      aria-label={`${habit.name}, ${day.label}${day.date === today ? " (today)" : ""}${day.scheduled ? "" : " (not scheduled)"}: ${day.done ? "done" : "not done"}`}
                      onClick={() => toggle(habit, day)}
                      className={cn(
                        "grid size-8 place-items-center rounded-full border transition-colors duration-200 outline-none focus-visible:ring-3 focus-visible:ring-ring/50 disabled:opacity-60 sm:size-9",
                        day.done
                          ? "border-primary bg-primary text-primary-foreground"
                          : day.scheduled
                            ? "border-input hover:bg-muted"
                            : "border-dashed border-border text-muted-foreground hover:bg-muted",
                        day.date === today && !day.done && "border-primary",
                      )}
                    >
                      {day.done && (
                        <Check
                          className="size-4 animate-in duration-200 zoom-in-50"
                          aria-hidden="true"
                        />
                      )}
                    </button>
                  </li>
                ))}
              </ol>
            </li>
          )
        })}
      </ul>
    </div>
  )
}
