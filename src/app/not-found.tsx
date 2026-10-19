import { Compass } from "lucide-react"
import Link from "next/link"

import { EmptyState } from "@/components/empty-state"
import { buttonVariants } from "@/components/ui/button"
import { cn } from "@/lib/utils"

export default function NotFound() {
  return (
    <main className="flex flex-1 items-center justify-center px-4 py-16">
      <EmptyState
        icon={Compass}
        title="We couldn't find that page"
        action={
          <Link href="/today" className={cn(buttonVariants(), "h-10 px-4")}>
            Back to Today
          </Link>
        }
      >
        It may have been moved or deleted, or the link may be mistyped.
      </EmptyState>
    </main>
  )
}
