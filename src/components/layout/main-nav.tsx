"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"

import {
  isActive,
  MORE_ITEM,
  MORE_ITEMS,
  NAV_ITEMS,
} from "@/components/layout/nav-items"
import { cn } from "@/lib/utils"

const TAB_ITEMS = [...NAV_ITEMS.filter((item) => item.tab), MORE_ITEM]

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
      {(variant === "sidebar" ? NAV_ITEMS : TAB_ITEMS).map(
        ({ href, label, icon: Icon }) => {
          // "More" stays highlighted on the pages it lists.
          const active =
            pathname !== null &&
            (isActive(href, pathname) ||
              (href === MORE_ITEM.href &&
                MORE_ITEMS.some((item) => isActive(item.href, pathname))))
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
        },
      )}
    </ul>
  )
}
