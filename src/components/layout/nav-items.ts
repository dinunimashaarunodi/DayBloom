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

export type NavGroup = "day" | "grow" | "life" | "you"

/** Sidebar group headings, in order. */
export const NAV_GROUPS: { id: NavGroup; label: string }[] = [
  { id: "day", label: "Your day" },
  { id: "grow", label: "Grow" },
  { id: "life", label: "Life" },
  { id: "you", label: "You" },
]

export type NavItem = {
  href: string
  label: string
  icon: LucideIcon
  group: NavGroup
  /** Shown in the mobile tab bar; the rest are listed on the More page. */
  tab?: true
}

/** Every page, in sidebar order. Keep at most five `tab` items. */
export const NAV_ITEMS: NavItem[] = [
  { href: "/today", label: "Today", icon: Sun, group: "day", tab: true },
  { href: "/tasks", label: "Tasks", icon: ListChecks, group: "day", tab: true },
  {
    href: "/calendar",
    label: "Calendar",
    icon: CalendarDays,
    group: "day",
    tab: true,
  },
  { href: "/habits", label: "Habits", icon: Repeat, group: "day", tab: true },
  { href: "/focus", label: "Focus", icon: Timer, group: "grow" },
  { href: "/workouts", label: "Workouts", icon: Dumbbell, group: "grow" },
  { href: "/goals", label: "Goals", icon: Target, group: "grow" },
  { href: "/languages", label: "Languages", icon: Languages, group: "grow" },
  { href: "/achievements", label: "Achievements", icon: Trophy, group: "grow" },
  {
    href: "/finance",
    label: "Finance",
    icon: Wallet,
    group: "life",
    tab: true,
  },
  { href: "/journal", label: "Journal", icon: NotebookPen, group: "life" },
  { href: "/history", label: "History", icon: History, group: "life" },
  { href: "/settings", label: "Settings", icon: Settings, group: "you" },
]

/** The sixth mobile tab: everything that isn't a tab. */
export const MORE_ITEM: NavItem = {
  href: "/more",
  label: "More",
  icon: Ellipsis,
  group: "you",
}

export const MORE_ITEMS = NAV_ITEMS.filter((item) => !item.tab)

export function isActive(href: string, pathname: string) {
  return pathname === href || pathname.startsWith(`${href}/`)
}
