import {
  CalendarDays,
  Dumbbell,
  Ellipsis,
  History,
  Languages,
  ListChecks,
  NotebookPen,
  Repeat,
  Settings,
  Sun,
  Target,
  Timer,
  Trophy,
  Wallet,
  type LucideIcon,
} from "lucide-react"

export type NavItem = {
  href: string
  label: string
  icon: LucideIcon
  /** Shown in the mobile tab bar; the rest are listed on the More page. */
  tab?: true
}

/** Every page in the sidebar, in order. Keep at most five `tab` items. */
export const NAV_ITEMS: NavItem[] = [
  { href: "/today", label: "Today", icon: Sun, tab: true },
  { href: "/tasks", label: "Tasks", icon: ListChecks, tab: true },
  { href: "/habits", label: "Habits", icon: Repeat, tab: true },
  { href: "/focus", label: "Focus", icon: Timer },
  { href: "/calendar", label: "Calendar", icon: CalendarDays, tab: true },
  { href: "/finance", label: "Finance", icon: Wallet, tab: true },
  { href: "/workouts", label: "Workouts", icon: Dumbbell },
  { href: "/goals", label: "Goals", icon: Target },
  { href: "/languages", label: "Languages", icon: Languages },
  { href: "/achievements", label: "Achievements", icon: Trophy },
  { href: "/journal", label: "Journal", icon: NotebookPen },
  { href: "/history", label: "History", icon: History },
  { href: "/settings", label: "Settings", icon: Settings },
]

/** The sixth mobile tab: everything that isn't a tab. */
export const MORE_ITEM: NavItem = {
  href: "/more",
  label: "More",
  icon: Ellipsis,
}

export const MORE_ITEMS = NAV_ITEMS.filter((item) => !item.tab)

export function isActive(href: string, pathname: string) {
  return pathname === href || pathname.startsWith(`${href}/`)
}
