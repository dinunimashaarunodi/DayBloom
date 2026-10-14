import type { LucideIcon } from "lucide-react"
import type * as React from "react"

import { ACCENT_CHIP, type Accent } from "@/components/accent"
import { cn } from "@/lib/utils"

/** A titled card with a module-accent icon chip. The building block of dashboards. */
export function DashboardCard({
  title,
  icon: Icon,
  accent = "sage",
  action,
  className,
  children,
}: {
  title: string
  icon: LucideIcon
  accent?: Accent
  /** Optional link or button shown at the top right. */
  action?: React.ReactNode
  className?: string
  children: React.ReactNode
}) {
  return (
    <section
      aria-label={title}
      className={cn("flex flex-col gap-3 surface p-4 sm:p-5", className)}
    >
      <header className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2.5">
          <span
            className={cn(
              "grid size-8 place-items-center rounded-lg",
              ACCENT_CHIP[accent],
            )}
          >
            <Icon className="size-4" aria-hidden="true" />
          </span>
          <h2 className="text-sm font-medium">{title}</h2>
        </div>
        {action}
      </header>
      {children}
    </section>
  )
}
