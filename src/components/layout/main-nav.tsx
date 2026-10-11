"use client"

import { CalendarDays, History, ListChecks, Settings, Sun, type LucideIcon } from "lucide-react"
import Link from "next/link"
import { usePathname } from "next/navigation"

import { cn } from "@/lib/utils"

const NAV_ITEMS: { href: string; label: string; icon: LucideIcon }[] = [
  { href: "/today", label: "Today", icon: Sun },
  { href: "/tasks", label: "Tasks", icon: ListChecks },
  { href: "/calendar", label: "Calendar", icon: CalendarDays },
  { href: "/history", label: "History", icon: History },
  { href: "/settings", label: "Settings", icon: Settings },
]

/** Vertical list in the desktop sidebar, bottom tab bar on mobile. */
export function MainNav({ variant }: { variant: "sidebar" | "tabs" }) {
  const pathname = usePathname()

  return (
    <ul className={cn(variant === "sidebar" ? "grid gap-1" : "grid grid-cols-5")}>
      {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
        const active = pathname === href || pathname.startsWith(`${href}/`)
        return (
          <li key={href}>
            <Link
              href={href}
              aria-current={active ? "page" : undefined}
              className={cn(
                "flex items-center rounded-lg outline-none transition-colors focus-visible:ring-3 focus-visible:ring-ring/50",
                variant === "sidebar"
                  ? "gap-3 px-3 py-2 text-sm hover:bg-sidebar-accent"
                  : "flex-col gap-1 py-2 text-xs",
                active
                  ? "font-medium text-foreground"
                  : "text-muted-foreground hover:text-foreground",
                active && variant === "sidebar" && "bg-sidebar-accent",
              )}
            >
              <Icon
                className={cn("size-5", active && variant === "tabs" && "text-primary")}
                aria-hidden="true"
              />
              {label}
            </Link>
          </li>
        )
      })}
    </ul>
  )
}
