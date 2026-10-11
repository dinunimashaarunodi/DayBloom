import { Sprout } from "lucide-react"
import Link from "next/link"

export function Logo({ href = "/" }: { href?: string }) {
  return (
    <Link
      href={href}
      className="inline-flex items-center gap-2 rounded-md text-lg font-semibold tracking-tight outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
    >
      <Sprout className="size-5 text-primary" aria-hidden="true" />
      DayBloom
    </Link>
  )
}
