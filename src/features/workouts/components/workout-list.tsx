import Link from "next/link"

import { formatLocalDate } from "@/lib/dates/local-date"
import { formatMinutes } from "@/lib/duration"

import { effortLabel, kindLabel, workoutHeading, type Workout } from "../logic"

/** Workouts, newest first, each linking to its edit page. */
export function WorkoutList({ workouts }: { workouts: Workout[] }) {
  return (
    <ul aria-label="Workouts" className="divide-y overflow-hidden surface">
      {workouts.map((workout) => {
        const effort = effortLabel(workout.effort)
        const details = [
          formatLocalDate(workout.local_date, "short"),
          workout.title ? kindLabel(workout.kind) : null,
          effort,
        ].filter(Boolean)
        return (
          <li key={workout.id}>
            <Link
              href={`/workouts/${workout.id}`}
              className="flex items-center gap-3 px-4 py-3 transition-colors duration-200 outline-none hover:bg-muted/40 focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:ring-inset"
            >
              <span className="grid min-w-0 flex-1 gap-0.5">
                <span className="truncate font-medium">
                  {workoutHeading(workout)}
                </span>
                <span className="truncate text-xs text-muted-foreground">
                  {details.join(" · ")}
                </span>
              </span>
              <span className="shrink-0 text-sm font-medium tabular-nums">
                {formatMinutes(workout.duration_minutes)}
              </span>
            </Link>
          </li>
        )
      })}
    </ul>
  )
}
