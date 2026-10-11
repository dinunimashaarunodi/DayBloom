import type * as React from "react"

/** A titled page section with an accessible heading. */
export function Section({
  id,
  title,
  description,
  children,
}: {
  id: string
  title: React.ReactNode
  description?: React.ReactNode
  children: React.ReactNode
}) {
  return (
    <section aria-labelledby={`${id}-heading`} className="grid gap-3">
      <div className="grid gap-0.5">
        <h2 id={`${id}-heading`} className="font-medium">
          {title}
        </h2>
        {description && (
          <p className="text-sm text-muted-foreground">{description}</p>
        )}
      </div>
      {children}
    </section>
  )
}
