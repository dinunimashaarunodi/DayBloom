// Timezone validation, listing and clock-time helpers. Calendar-day logic lives
// in local-date.ts. Together they are the only place for timezone logic
// (see CLAUDE.md). Keep them free of React and Next.js imports.
import { formatLocalDate, toLocalDate } from "./local-date"

export const DEFAULT_TIMEZONE = "UTC"

/** True when the runtime recognises `tz` as an IANA timezone (aliases included). */
export function isValidTimeZone(tz: unknown): tz is string {
  if (typeof tz !== "string" || tz.length === 0) return false
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: tz })
    return true
  } catch {
    return false
  }
}

/** All canonical IANA timezones, plus `include` if it is a valid alias missing from the list. */
export function listTimeZones(include?: string): string[] {
  const zones = Intl.supportedValuesOf("timeZone")
  if (include && isValidTimeZone(include) && !zones.includes(include)) {
    return [...zones, include].sort()
  }
  return zones
}

/** e.g. "Saturday 11 October" for the calendar day `now` falls on in `tz`. */
export function formatLongDate(
  now: Date,
  tz: string,
  locale = "en-GB",
): string {
  return formatLocalDate(toLocalDate(now, tz), "long", locale)
}

/** Hour of day (0–23) at `now` in `tz`, used for the greeting. */
export function localHour(now: Date, tz: string): number {
  const hour = new Intl.DateTimeFormat("en-GB", {
    timeZone: tz,
    hour: "numeric",
    hourCycle: "h23",
  }).format(now)
  return Number(hour)
}
