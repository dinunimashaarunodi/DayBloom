import { ArrowRight } from "lucide-react"
import Link from "next/link"

import { BrandPanel } from "@/components/layout/brand-panel"
import { Logo } from "@/components/layout/logo"
import { PrivacyLink } from "@/components/layout/privacy-link"
import { buttonVariants } from "@/components/ui/button"
import { cn } from "@/lib/utils"

// Signed-in visitors are sent to /today by the proxy.
export default function LandingPage() {
  return (
    <div className="grid flex-1 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)]">
      <BrandPanel className="order-last min-h-112 lg:order-first" />
      <main className="flex flex-col items-center justify-center gap-8 px-6 py-16 text-center lg:items-start lg:px-16 lg:text-left">
        <Logo className="lg:hidden" />
        <div className="grid max-w-md gap-3">
          <h1 className="text-4xl font-semibold tracking-tight md:text-5xl">
            Welcome to <span className="text-primary">DayBloom</span>
          </h1>
          <p className="text-lg text-muted-foreground">
            One calm place for your tasks, habits, focus, money and goals. No
            pressure, just steady progress, one day at a time.
          </p>
        </div>
        <div className="flex w-full max-w-xs flex-col gap-3 sm:max-w-none sm:flex-row sm:justify-center lg:justify-start">
          <Link
            href="/signup"
            className={cn(
              buttonVariants({ size: "lg" }),
              "h-11 px-5 text-base",
            )}
          >
            Create a free account
            <ArrowRight aria-hidden="true" />
          </Link>
          <Link
            href="/login"
            className={cn(
              buttonVariants({ size: "lg", variant: "outline" }),
              "h-11 px-5 text-base",
            )}
          >
            Log in
          </Link>
        </div>
        <PrivacyLink />
      </main>
    </div>
  )
}
