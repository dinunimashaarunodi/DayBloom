import type { LucideIcon } from "lucide-react"
import type * as React from "react"

export function EmptyState({
  icon: Icon,
  title,
  children,
}: {
  icon: LucideIcon
  title: string
  children?: React.ReactNode
}) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed px-6 py-12 text-center">
      <div className="rounded-full bg-muted p-3">
        <Icon className="size-6 text-muted-foreground" aria-hidden="true" />
      </div>
      <h2 className="font-medium">{title}</h2>
      {children && (
        <div className="max-w-sm text-sm text-muted-foreground">{children}</div>
      )}
    </div>
  )
}
