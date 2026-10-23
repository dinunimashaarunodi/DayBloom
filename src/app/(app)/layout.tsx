import { Settings } from "lucide-react"
import Link from "next/link"
import { Suspense } from "react"

import { Logo } from "@/components/layout/logo"
import { MainNav, MainNavLinks } from "@/components/layout/main-nav"
import { OfflineBanner } from "@/components/pwa/offline-banner"

import { OutboxSyncLoader } from "./_outbox/outbox-sync-loader"
import { ThemeSwitcher } from "@/components/theme-switcher"
import { buttonVariants } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { SignOutButton } from "@/features/auth/components/sign-out-button"
import { UserSummary } from "@/features/profile/components/user-summary"
import { cn } from "@/lib/utils"

/**
 * Authenticated app shell: a dark brand sidebar on desktop (dark in both
 * themes: the `dark` class switches its tokens), a frosted top bar and a
 * floating tab bar on mobile. The shell is static; only the user summary
 * reads the session, so it streams in behind <Suspense>. Pages protect their
 * own data via getCurrentUser().
 */
export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-dvh flex-1">
      <aside className="dark sticky top-0 hidden h-dvh w-64 shrink-0 flex-col gap-4 bg-sidebar bg-[radial-gradient(120%_60%_at_0%_0%,color-mix(in_oklab,var(--bloom-via)_28%,transparent),transparent_70%)] px-3 py-5 text-sidebar-foreground md:flex">
        <div className="shrink-0 px-3 pt-1">
          <Logo href="/today" />
        </div>
        {/* Only the links scroll on short windows; the profile card stays put. */}
        <nav
          aria-label="Main"
          className="-mx-1 min-h-0 flex-1 [scrollbar-width:thin] overflow-y-auto px-1"
        >
          <Suspense
            fallback={<MainNavLinks variant="sidebar" pathname={null} />}
          >
            <MainNav variant="sidebar" />
          </Suspense>
        </nav>
        <div className="grid shrink-0 gap-2">
          {/* Profile details in their own card. */}
          <div className="rounded-2xl border border-sidebar-border bg-sidebar-accent/70 p-3">
            <Suspense fallback={<Skeleton className="h-10" />}>
              <UserSummary />
            </Suspense>
          </div>
          {/* Theme and sign-out sit separately, below the card. */}
          <div className="flex items-center justify-between gap-2 px-1">
            <ThemeSwitcher />
            <SignOutButton className="w-fit" />
          </div>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-20 flex h-14 items-center justify-between border-b glass px-4 md:hidden">
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
        <main className="mx-auto w-full max-w-6xl flex-1 px-4 pt-6 pb-32 sm:px-6 md:px-10 md:py-10">
          <OfflineBanner />
          <Suspense fallback={null}>
            <OutboxSyncLoader />
          </Suspense>
          {children}
        </main>
      </div>

      <nav
        aria-label="Main"
        className="fixed inset-x-3 bottom-[max(0.75rem,env(safe-area-inset-bottom))] z-20 rounded-2xl border glass px-1 py-1 shadow-lift md:hidden"
      >
        <Suspense fallback={<MainNavLinks variant="tabs" pathname={null} />}>
          <MainNav variant="tabs" />
        </Suspense>
      </nav>
    </div>
  )
}
