"use client"

import {
  CalendarDays,
  History,
  ListChecks,
  Settings,
  Sun,
  Wallet,
  type LucideIcon,
} from "lucide-react"
import Link from "next/link"
import { usePathname } from "next/navigation"

import { cn } from "@/lib/utils"

const NAV_ITEMS: { href: string; label: string; icon: LucideIcon }[] = [
  { href: "/today", label: "Today", icon: Sun },
  { href: "/tasks", label: "Tasks", icon: ListChecks },
  { href: "/calendar", label: "Calendar", icon: CalendarDays },
  { href: "/finance", label: "Finance", icon: Wallet },
  { href: "/history", label: "History", icon: History },
  { href: "/settings", label: "Settings", icon: Settings },
]

type Variant = "sidebar" | "tabs"

/**
 * Vertical list in the desktop sidebar, bottom tab bar on mobile.
 * Reads the URL, so render it inside <Suspense> with MainNavLinks as the fallback.
 */
export function MainNav({ variant }: { variant: Variant }) {
  return <MainNavLinks variant={variant} pathname={usePathname()} />
}

/** The nav itself. With pathname null (while the URL streams in) nothing is highlighted. */
export function MainNavLinks({
  variant,
  pathname,
}: {
  variant: Variant
  pathname: string | null
}) {
  return (
    <ul
      className={cn(variant === "sidebar" ? "grid gap-1" : "grid grid-cols-6")}
    >
      {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
        const active =
          pathname !== null &&
          (pathname === href || pathname.startsWith(`${href}/`))
        return (
          <li key={href}>
            <Link
              href={href}
              aria-current={active ? "page" : undefined}
              className={cn(
                "flex items-center rounded-lg transition-colors duration-200 outline-none focus-visible:ring-3 focus-visible:ring-ring/50",
                variant === "sidebar"
                  ? cn(
                      "gap-3 px-3 py-2.5 text-sm",
                      active
                        ? "bg-sidebar-primary font-medium text-sidebar-primary-foreground shadow-soft"
                        : "text-muted-foreground hover:bg-sidebar-accent hover:text-foreground",
                    )
                  : cn(
                      "flex-col gap-1 py-2 text-[11px]",
                      active
                        ? "font-medium text-primary"
                        : "text-muted-foreground hover:text-foreground",
                    ),
              )}
            >
              <span
                className={cn(
                  "grid place-items-center",
                  variant === "tabs" &&
                    cn(
                      "h-7 w-12 rounded-full transition-colors duration-200",
                      active && "bg-sage",
                    ),
                )}
              >
                <Icon className="size-5" aria-hidden="true" />
              </span>
              {label}
            </Link>
          </li>
        )
      })}
    </ul>
  )
}
