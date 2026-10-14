import { Sprout } from "lucide-react"
import Link from "next/link"

import { buttonVariants } from "@/components/ui/button"
import { cn } from "@/lib/utils"

// Signed-in visitors are sent to /today by the proxy.
export default function LandingPage() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-8 px-4 py-16 text-center">
      <div className="rounded-full bg-sage p-4">
        <Sprout className="size-10 text-primary" aria-hidden="true" />
      </div>
      <div className="grid max-w-md gap-3">
        <h1 className="text-4xl font-semibold tracking-tight">DayBloom</h1>
        <p className="text-muted-foreground">
          Plan your day, reflect on it, and watch your progress grow, one day at
          a time.
        </p>
      </div>
      <div className="flex w-full max-w-xs flex-col gap-3 sm:max-w-none sm:flex-row sm:justify-center">
        <Link
          href="/signup"
          className={cn(buttonVariants({ size: "lg" }), "h-10 px-5")}
        >
          Create an account
        </Link>
        <Link
          href="/login"
          className={cn(
            buttonVariants({ size: "lg", variant: "outline" }),
            "h-10 px-5",
          )}
        >
          Log in
        </Link>
      </div>
    </main>
  )
}
