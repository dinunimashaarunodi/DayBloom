import { toLocalTime } from "@/lib/dates/local-date"

import {
  focusedSeconds,
  formatMinutes,
  isComplete,
  sessionEnd,
  type FocusSession,
} from "../logic"
import { DeleteSessionButton } from "./delete-session-button"

/** Finished sessions with their times and focused minutes. */
export function SessionList({
  label,
  sessions,
  timezone,
  now,
}: {
  label: string
  sessions: FocusSession[]
  timezone: string
  now: Date
}) {
  return (
    <ul aria-label={label} className="divide-y overflow-hidden surface">
      {sessions.map((session) => {
        const name = session.label ?? "Focus session"
        const minutes = Math.floor(focusedSeconds(session, now) / 60)
        return (
          <li key={session.id} className="flex items-center gap-3 px-4 py-3">
            <div className="grid min-w-0 flex-1 gap-0.5">
              <span className="truncate font-medium">{name}</span>
              <span className="text-xs text-muted-foreground tabular-nums">
                {toLocalTime(new Date(session.started_at), timezone)}–
                {toLocalTime(sessionEnd(session), timezone)}
                {!isComplete(session) &&
                  ` · ended early (planned ${formatMinutes(session.planned_minutes)})`}
              </span>
            </div>
            <span className="shrink-0 text-sm font-medium tabular-nums">
              {formatMinutes(minutes)}
            </span>
            <DeleteSessionButton sessionId={session.id} name={name} />
          </li>
        )
      })}
    </ul>
  )
}
