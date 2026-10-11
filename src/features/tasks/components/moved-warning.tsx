import { TriangleAlert } from "lucide-react"

import { moveWarningText } from "../logic"

/** Gentle nudge shown once a task has been postponed repeatedly. */
export function MovedWarning({
  timesMoved,
  compact = false,
}: {
  timesMoved: number
  compact?: boolean
}) {
  if (compact) {
    return (
      <span className="inline-flex items-center gap-1 text-xs text-warning">
        <TriangleAlert className="size-3" aria-hidden="true" />
        Moved {timesMoved}×
      </span>
    )
  }

  return (
    <div
      role="status"
      className="flex gap-2 rounded-lg border border-warning/40 bg-warning/10 px-3 py-2 text-sm"
    >
      <TriangleAlert
        className="mt-0.5 size-4 shrink-0 text-warning"
        aria-hidden="true"
      />
      <p>{moveWarningText(timesMoved)}</p>
    </div>
  )
}
