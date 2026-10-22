import { Sprout } from "lucide-react"
import Link from "next/link"

import { cn } from "@/lib/utils"

export function Logo({
  href = "/",
  className,
}: {
  href?: string
  className?: string
}) {
  return (
    <Link
      href={href}
      className={cn(
        "inline-flex items-center gap-2.5 rounded-md text-lg font-semibold tracking-tight outline-none focus-visible:ring-3 focus-visible:ring-ring/50",
        className,
      )}
    >
      <span className="grid size-8 place-items-center rounded-xl bg-bloom shadow-md shadow-bloom-via/30">
        <Sprout className="size-4.5" aria-hidden="true" />
      </span>
      DayBloom
    </Link>
  )
}
