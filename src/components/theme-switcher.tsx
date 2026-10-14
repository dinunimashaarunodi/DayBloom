"use client"

import { Monitor, Moon, Sun, type LucideIcon } from "lucide-react"
import { useId, useSyncExternalStore } from "react"

import {
  getTheme,
  setTheme,
  subscribeToTheme,
  THEMES,
  type Theme,
} from "@/lib/theme"
import { cn } from "@/lib/utils"

const OPTIONS: Record<Theme, { label: string; icon: LucideIcon }> = {
  system: { label: "System", icon: Monitor },
  light: { label: "Light", icon: Sun },
  dark: { label: "Dark", icon: Moon },
}

/**
 * System / Light / Dark switch. "compact" shows icons only (sidebar, top bar);
 * "full" adds labels (Settings). A radio group, so arrow keys work as expected.
 */
export function ThemeSwitcher({
  variant = "compact",
  className,
}: {
  variant?: "compact" | "full"
  className?: string
}) {
  // Each switcher needs its own radio group name: several can be on one page.
  const name = useId()
  // The server can't know the choice, so it renders "system" and the
  // client updates right after hydration.
  const current = useSyncExternalStore(
    subscribeToTheme,
    getTheme,
    () => "system" as Theme,
  )

  return (
    <div
      role="radiogroup"
      aria-label="Theme"
      className={cn(
        "inline-flex gap-1 rounded-lg bg-muted p-1",
        variant === "full" && "w-full sm:w-auto",
        className,
      )}
    >
      {THEMES.map((theme) => {
        const { label, icon: Icon } = OPTIONS[theme]
        const selected = theme === current
        return (
          <label
            key={theme}
            title={label}
            className={cn(
              "flex cursor-pointer items-center justify-center gap-1.5 rounded-md text-sm transition-colors duration-200",
              "has-[:focus-visible]:ring-3 has-[:focus-visible]:ring-ring/50",
              variant === "compact" ? "size-8" : "h-9 flex-1 px-3 sm:flex-none",
              selected
                ? "bg-card font-medium text-foreground shadow-soft"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            <input
              type="radio"
              name={name}
              value={theme}
              checked={selected}
              onChange={() => setTheme(theme)}
              className="sr-only"
              aria-label={variant === "compact" ? `${label} theme` : undefined}
            />
            <Icon className="size-4" aria-hidden="true" />
            {variant === "full" && label}
          </label>
        )
      })}
    </div>
  )
}
