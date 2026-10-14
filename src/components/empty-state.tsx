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
    <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed bg-card/60 px-6 py-10 text-center">
      <div className={cn("rounded-full p-3", ACCENT_CHIP[accent])}>
        <Icon className="size-6" aria-hidden="true" />
      </div>
      <h2 className="font-medium">{title}</h2>
      {children && (
        <div className="max-w-sm text-sm text-muted-foreground">{children}</div>
      )}
      {action && <div className="mt-1">{action}</div>}
    </div>
  )
}
