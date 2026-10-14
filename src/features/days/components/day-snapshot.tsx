import { CircleCheck, CircleDashed, Leaf } from "lucide-react"

import { Section } from "@/components/layout/section"

import type { DaySummary, SummaryTaskStatus } from "../logic"

const STATUS = {
  done: { icon: CircleCheck, label: "Done", className: "text-primary" },
  unfinished: {
    icon: CircleDashed,
    label: "Not finished",
    className: "text-muted-foreground",
  },
  dropped: { icon: Leaf, label: "Let go", className: "text-muted-foreground" },
} satisfies Record<SummaryTaskStatus, unknown>

/** The frozen record of a closed day's tasks. Read-only by design. */
export function DaySnapshotTasks({ summary }: { summary: DaySummary }) {
  const plannedIds = new Set(summary.planned.map((t) => t.id))
  const extra = summary.completed.filter((t) => !plannedIds.has(t.id))

  return (
    <>
      <Section id="planned" title="Planned for this day">
        {summary.planned.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No tasks were planned.
          </p>
        ) : (
          <ul
            aria-label="Planned for this day"
            className="divide-y overflow-hidden surface"
          >
            {summary.planned.map((task) => {
              const status = STATUS[task.status]
              const Icon = status.icon
              return (
                <li
                  key={task.id}
                  className="flex items-center gap-3 px-3 py-2.5"
                >
                  <Icon
                    className={`size-4 shrink-0 ${status.className}`}
                    aria-hidden="true"
                  />
                  <span className="min-w-0 flex-1 truncate">{task.title}</span>
                  <span className="text-xs text-muted-foreground">
                    {status.label}
                  </span>
                </li>
              )
            })}
          </ul>
        )}
      </Section>

      {extra.length > 0 && (
        <Section id="also-done" title="Also finished">
          <ul
            aria-label="Also finished"
            className="divide-y overflow-hidden surface"
          >
            {extra.map((task) => (
              <li key={task.id} className="flex items-center gap-3 px-3 py-2.5">
                <CircleCheck
                  className="size-4 shrink-0 text-primary"
                  aria-hidden="true"
                />
                <span className="min-w-0 truncate">{task.title}</span>
              </li>
            ))}
          </ul>
        </Section>
      )}
    </>
  )
}
