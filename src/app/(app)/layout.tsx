import { Settings } from "lucide-react"
import Link from "next/link"
import { Suspense } from "react"

import { Logo } from "@/components/layout/logo"
import { MainNav, MainNavLinks } from "@/components/layout/main-nav"
import { OfflineBanner } from "@/components/pwa/offline-banner"
import { ThemeSwitcher } from "@/components/theme-switcher"
import { buttonVariants } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { SignOutButton } from "@/features/auth/components/sign-out-button"
import { UserSummary } from "@/features/profile/components/user-summary"
import { cn } from "@/lib/utils"

/**
 * Authenticated app shell: sidebar on desktop, top bar + bottom tabs on mobile.
 * The shell itself is static; only the user summary reads the session, so it
 * streams in behind <Suspense>. Pages protect their own data via getCurrentUser().
 */
export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-dvh flex-1">
      <aside className="sticky top-0 hidden h-dvh w-64 shrink-0 flex-col gap-8 border-r border-sidebar-border bg-sidebar px-4 py-6 md:flex">
        <div className="px-3 pt-2">
          <Logo href="/today" />
        </div>
        <nav aria-label="Main">
          <Suspense
            fallback={<MainNavLinks variant="sidebar" pathname={null} />}
          >
            <MainNav variant="sidebar" />
          </Suspense>
        </nav>
        <div className="mt-auto grid gap-2 border-t border-sidebar-border pt-4">
          <Suspense fallback={<Skeleton className="mx-3 h-9" />}>
            <UserSummary />
          </Suspense>
          <div className="flex items-center justify-between gap-2 px-1">
            <SignOutButton />
            <ThemeSwitcher />
          </div>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-10 flex h-14 items-center justify-between border-b bg-background/90 px-4 backdrop-blur-md md:hidden">
          <Logo href="/today" />
          <div className="flex items-center gap-1">
            <ThemeSwitcher />
            <Link
              href="/settings"
              aria-label="Settings"
              className={cn(
                buttonVariants({ variant: "ghost", size: "icon" }),
                "size-9",
              )}
            >
              <Settings />
            </Link>
          </div>
        </header>
        <main className="mx-auto w-full max-w-5xl flex-1 px-4 pt-6 pb-28 md:px-10 md:py-10">
          <OfflineBanner />
          {children}
        </main>
      </div>

      <nav
        aria-label="Main"
        className="fixed inset-x-0 bottom-0 z-10 border-t bg-card/95 pb-[env(safe-area-inset-bottom)] backdrop-blur-md md:hidden"
      >
        <Suspense fallback={<MainNavLinks variant="tabs" pathname={null} />}>
          <MainNav variant="tabs" />
        </Suspense>
      </nav>
    </div>
  )
}
