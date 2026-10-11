import { Suspense } from "react"

import { Logo } from "@/components/layout/logo"
import { MainNav } from "@/components/layout/main-nav"
import { Skeleton } from "@/components/ui/skeleton"
import { SignOutButton } from "@/features/auth/components/sign-out-button"
import { UserSummary } from "@/features/profile/components/user-summary"

/**
 * Authenticated app shell: sidebar on desktop, top bar + bottom tabs on mobile.
 * The shell itself is static; only the user summary reads the session, so it
 * streams in behind <Suspense>. Pages protect their own data via getCurrentUser().
 */
export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-dvh flex-1">
      <aside className="sticky top-0 hidden h-dvh w-60 shrink-0 flex-col gap-6 border-r bg-sidebar p-4 md:flex">
        <div className="px-3 pt-2">
          <Logo href="/today" />
        </div>
        <nav aria-label="Main">
          <MainNav variant="sidebar" />
        </nav>
        <div className="mt-auto grid gap-2">
          <Suspense fallback={<Skeleton className="mx-3 h-9" />}>
            <UserSummary />
          </Suspense>
          <SignOutButton />
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-10 flex h-14 items-center border-b bg-background/95 px-4 backdrop-blur md:hidden">
          <Logo href="/today" />
        </header>
        <main className="mx-auto w-full max-w-3xl flex-1 px-4 pt-6 pb-24 md:px-8 md:py-10">
          {children}
        </main>
      </div>

      <nav
        aria-label="Main"
        className="fixed inset-x-0 bottom-0 z-10 border-t bg-background/95 pb-[env(safe-area-inset-bottom)] backdrop-blur md:hidden"
      >
        <MainNav variant="tabs" />
      </nav>
    </div>
  )
}
