// Light/dark theme preference, stored per device in localStorage.
// "system" follows the operating system and keeps following it live.

export const THEMES = ["system", "light", "dark"] as const
export type Theme = (typeof THEMES)[number]

export const THEME_STORAGE_KEY = "daybloom-theme"
const CHANGE_EVENT = "daybloom-theme-change"

/**
 * Runs in <head> before the page paints, so there's no flash of the wrong
 * theme. Also re-applies "system" when the OS theme changes. Keep it tiny
 * and dependency-free: it's inlined as a string.
 */
export const THEME_SCRIPT = `(function(){var k=${JSON.stringify(THEME_STORAGE_KEY)};var m=window.matchMedia("(prefers-color-scheme: dark)");function a(){var p="system";try{p=localStorage.getItem(k)||"system"}catch(e){}var d=p==="dark"||(p==="system"&&m.matches);var r=document.documentElement;r.classList.toggle("dark",d);r.style.colorScheme=d?"dark":"light"}a();m.addEventListener("change",a);window.addEventListener(${JSON.stringify(CHANGE_EVENT)},a)})()`

function isTheme(value: unknown): value is Theme {
  return THEMES.includes(value as Theme)
}

export function getTheme(): Theme {
  try {
    const stored = localStorage.getItem(THEME_STORAGE_KEY)
    return isTheme(stored) ? stored : "system"
  } catch {
    return "system"
  }
}

export function setTheme(theme: Theme): void {
  try {
    localStorage.setItem(THEME_STORAGE_KEY, theme)
  } catch {
    // Storage blocked (private mode): the choice still applies until reload.
  }
  window.dispatchEvent(new Event(CHANGE_EVENT))
}

/** For useSyncExternalStore: notifies when the choice changes in this or another tab. */
export function subscribeToTheme(onChange: () => void): () => void {
  const onStorage = (event: StorageEvent) => {
    if (event.key === THEME_STORAGE_KEY) {
      window.dispatchEvent(new Event(CHANGE_EVENT))
    }
  }
  window.addEventListener(CHANGE_EVENT, onChange)
  window.addEventListener("storage", onStorage)
  return () => {
    window.removeEventListener(CHANGE_EVENT, onChange)
    window.removeEventListener("storage", onStorage)
  }
}
