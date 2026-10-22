"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"

import {
  isActive,
  MORE_ITEM,
  MORE_ITEMS,
  NAV_GROUPS,
  NAV_ITEMS,
  type NavItem,
} from "@/components/layout/nav-items"
import { cn } from "@/lib/utils"

const TAB_ITEMS = [
  // Tabs keep a thumb-friendly order: Today, Tasks, Habits, Calendar, Finance.
  ...["/today", "/tasks", "/habits", "/calendar", "/finance"].map((href) =>
    NAV_ITEMS.find((item) => item.href === href)!,
  ),
  MORE_ITEM,
]

type Variant = "sidebar" | "tabs"

/**
 * Grouped list in the desktop sidebar, floating tab bar on mobile.
 * Reads the URL, so render it inside <Suspense> with MainNavLinks as the fallback.
 */
export function MainNav({ variant }: { variant: Variant }) {
  return <MainNavLinks variant={variant} pathname={usePathname()} />
}

function activeFor(item: NavItem, pathname: string | null) {
  if (pathname === null) return false
  // "More" stays highlighted on the pages it lists.
  return (
    isActive(item.href, pathname) ||
    (item.href === MORE_ITEM.href &&
      MORE_ITEMS.some((more) => isActive(more.href, pathname)))
  )
}

/** The nav itself. With pathname null (while the URL streams in) nothing is highlighted. */
export function MainNavLinks({
  variant,
  pathname,
}: {
  variant: Variant
  pathname: string | null
}) {
  if (variant === "tabs") {
    return (
      <ul className="grid grid-cols-6">
        {TAB_ITEMS.map((item) => {
          const active = activeFor(item, pathname)
          const Icon = item.icon
          return (
            <li key={item.href}>
              <Link
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex flex-col items-center gap-0.5 rounded-xl py-1.5 text-[11px] transition-colors duration-200 outline-none focus-visible:ring-3 focus-visible:ring-ring/50",
                  active
                    ? "font-semibold text-primary"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                <span
                  className={cn(
                    "grid h-7 w-12 place-items-center rounded-full transition-all duration-200",
                    active && "scale-105 bg-primary/15",
                  )}
                >
                  <Icon className="size-5" aria-hidden="true" />
                </span>
                {item.label}
              </Link>
            </li>
          )
        })}
      </ul>
    )
  }

  return (
    <div className="grid gap-4">
      {NAV_GROUPS.map((group) => {
        const items = NAV_ITEMS.filter((item) => item.group === group.id)
        return (
          <div key={group.id} className="grid gap-1">
            <p
              id={`nav-${group.id}`}
              className="px-3 text-[11px] font-semibold tracking-wider text-sidebar-foreground/55 uppercase"
            >
              {group.label}
            </p>
            <ul aria-labelledby={`nav-${group.id}`} className="grid gap-0.5">
              {items.map((item) => {
                const active = activeFor(item, pathname)
                const Icon = item.icon
                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      aria-current={active ? "page" : undefined}
                      className={cn(
                        "group/nav flex items-center gap-3 rounded-xl px-3 py-1.5 text-sm transition-all duration-200 outline-none focus-visible:ring-3 focus-visible:ring-ring/60",
                        active
                          ? "bg-bloom font-medium shadow-lg shadow-bloom-via/30"
                          : "text-sidebar-foreground/75 hover:bg-sidebar-accent hover:text-sidebar-foreground",
                      )}
                    >
                      <Icon
                        className={cn(
                          "size-[18px] transition-transform duration-200",
                          !active && "group-hover/nav:scale-110",
                        )}
                        aria-hidden="true"
                      />
                      {item.label}
                    </Link>
                  </li>
                )
              })}
            </ul>
          </div>
        )
      })}
    </div>
  )
}
