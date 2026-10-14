import { Sprout } from "lucide-react"
import Link from "next/link"

export function Logo({ href = "/" }: { href?: string }) {
  return (
    <Link
      href={href}
      className="inline-flex items-center gap-2.5 rounded-md text-lg font-semibold tracking-tight outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
    >
      <span className="grid size-8 place-items-center rounded-lg bg-primary text-primary-foreground">
        <Sprout className="size-4.5" aria-hidden="true" />
      </span>
      DayBloom
    </Link>
  )
}
