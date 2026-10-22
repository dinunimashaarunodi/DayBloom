import type { LucideIcon } from "lucide-react"
import type * as React from "react"

import { ACCENT_CHIP, type Accent } from "@/components/accent"
import { cn } from "@/lib/utils"

/** Friendly "nothing here yet" panel with an optional next action. */
export function EmptyState({
  icon: Icon,
  title,
  accent = "sage",
  action,
  children,
}: {
  icon: LucideIcon
  title: string
  accent?: Accent
  action?: React.ReactNode
  children?: React.ReactNode
}) {
  return (
    <div className="flex animate-in flex-col items-center gap-3 rounded-2xl border border-dashed border-border bg-card/70 px-6 py-10 text-center duration-300 fade-in">
      <div
        className={cn(
          "rounded-2xl p-3.5 ring-8 ring-current/5",
          ACCENT_CHIP[accent],
        )}
      >
        <Icon className="size-6" aria-hidden="true" />
      </div>
      <h2 className="font-semibold">{title}</h2>
      {children && (
        <div className="max-w-sm text-sm text-muted-foreground">{children}</div>
      )}
      {action && <div className="mt-1">{action}</div>}
    </div>
  )
}
