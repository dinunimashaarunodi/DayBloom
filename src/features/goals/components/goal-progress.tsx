import { cn } from "@/lib/utils"

import { progress, type Milestone } from "../logic"

/** A progress bar with its numbers in words (never colour alone). */
export function GoalProgress({
  milestones,
  label,
  className,
}: {
  milestones: Pick<Milestone, "done">[]
  /** Accessible name, e.g. the goal's title. */
  label: string
  className?: string
}) {
  const { done, total, percent } = progress(milestones)
  if (total === 0) {
    return (
      <p className={cn("text-xs text-muted-foreground", className)}>
        No milestones yet
      </p>
    )
  }
  return (
    <div className={cn("grid gap-1.5", className)}>
      <div
        role="progressbar"
        aria-label={`${label} progress`}
        aria-valuemin={0}
        aria-valuemax={total}
        aria-valuenow={done}
        aria-valuetext={`${done} of ${total} milestones done`}
        className="h-2 overflow-hidden rounded-full bg-muted"
      >
        <div
          className="h-full rounded-full bg-primary transition-[width] duration-500"
          style={{ width: `${percent}%` }}
        />
      </div>
      <p className="text-xs text-muted-foreground tabular-nums">
        {done} of {total} milestone{total === 1 ? "" : "s"} done · {percent}%
      </p>
    </div>
  )
}
