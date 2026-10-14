import type * as React from "react"

export function PageHeader({
  title,
  description,
  eyebrow,
  actions,
}: {
  title: React.ReactNode
  description?: React.ReactNode
  /** Small line above the title, e.g. today's date. */
  eyebrow?: React.ReactNode
  /** Primary actions, shown to the right on wide screens and below on phones. */
  actions?: React.ReactNode
}) {
  return (
    <header className="mb-6 flex flex-wrap items-end justify-between gap-4 md:mb-8">
      <div className="grid gap-1">
        {eyebrow && (
          <p className="text-sm font-medium text-muted-foreground">{eyebrow}</p>
        )}
        <h1 className="text-2xl font-semibold md:text-3xl">{title}</h1>
        {description && (
          <p className="text-sm text-muted-foreground md:text-base">
            {description}
          </p>
        )}
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </header>
  )
}
