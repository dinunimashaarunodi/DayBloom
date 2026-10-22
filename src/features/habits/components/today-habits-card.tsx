import { Repeat } from "lucide-react"
import Link from "next/link"

import { DashboardCard } from "@/components/layout/dashboard-card"

import { isScheduled } from "../logic"
import { getHabits } from "../queries"
import { HabitList } from "./habit-list"
import { toListItems } from "./to-list-items"

/** Today's dashboard: check off today's scheduled habits in one tap. */
export async function TodayHabitsCard() {
  const { today, habits } = await getHabits()
  const scheduledToday = habits.filter((h) => isScheduled(h.days_mask, today))
  const doneToday = scheduledToday.filter((h) => h.done.includes(today)).length

  return (
    <DashboardCard
      title="Habits"
      icon={Repeat}
      accent="sage"
      action={
        <Link
          href="/habits"
          className="text-xs font-medium text-primary underline-offset-4 hover:underline"
        >
          {habits.length > 0 ? "All habits" : "Add a habit"}
        </Link>
      }
    >
      {scheduledToday.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          {habits.length === 0
            ? "Build a small daily habit and track your streak."
            : "No habits scheduled today. Enjoy the rest."}
        </p>
      ) : (
        <>
          <p className="-mt-1 text-sm text-muted-foreground tabular-nums">
            {doneToday} of {scheduledToday.length} done today
          </p>
          <HabitList
            items={toListItems(scheduledToday, today)}
            today={today}
            variant="today"
          />
        </>
      )}
    </DashboardCard>
  )
}
