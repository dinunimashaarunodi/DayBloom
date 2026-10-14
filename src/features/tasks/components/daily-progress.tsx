import { CircleCheck, PartyPopper } from "lucide-react"

import { DashboardCard } from "@/components/layout/dashboard-card"

/** Today's completion: tasks finished today out of everything for today. */
export function DailyProgress({
  done,
  remaining,
}: {
  done: number
  remaining: number
}) {
  const total = done + remaining
  const percent = total === 0 ? 0 : Math.round((done / total) * 100)
  const allDone = total > 0 && remaining === 0

  return (
    <DashboardCard title="Today's progress" icon={CircleCheck} accent="sage">
      {total === 0 ? (
        <p className="text-sm text-muted-foreground">
          Nothing planned yet. Add a task to get started.
        </p>
      ) : (
        <div className="grid gap-2.5">
          <p className="flex items-baseline gap-1.5">
            <span className="text-2xl font-semibold tabular-nums">{done}</span>
            <span className="text-sm text-muted-foreground">
              of {total} done
            </span>
          </p>
          <div
            role="progressbar"
            aria-label="Today's tasks completed"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={percent}
            className="h-2 overflow-hidden rounded-full bg-muted"
          >
            <div
              className="h-full rounded-full bg-primary transition-[width] duration-500 ease-out"
              style={{ width: `${percent}%` }}
            />
          </div>
          {allDone && (
            <p className="flex animate-in items-center gap-1.5 text-sm font-medium text-primary duration-500 fade-in slide-in-from-bottom-1">
              <PartyPopper className="size-4" aria-hidden="true" />
              All done for today. Well bloomed!
            </p>
          )}
        </div>
      )}
    </DashboardCard>
  )
}
