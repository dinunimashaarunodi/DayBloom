// The only place for money logic (see CLAUDE.md). Amounts are integers of
// minor units (cents, etc.), never floats. Parsing uses string arithmetic so
// "0.1 + 0.2" style errors can't happen. Built on the Intl API only.

/** Highest amount accepted (matches the transactions CHECK constraint). */
export const MAX_MINOR = 1_000_000_000_000

const CODE = /^[A-Z]{3}$/

/** True for an ISO 4217 code the runtime knows, e.g. "LKR". */
export function isCurrencyCode(value: unknown): value is string {
  return (
    typeof value === "string" &&
    CODE.test(value) &&
    Intl.supportedValuesOf("currency").includes(value)
  )
}

export function listCurrencies(): string[] {
  return Intl.supportedValuesOf("currency")
}

/** e.g. "Sri Lankan Rupee". Falls back to the code. */
export function currencyName(code: string, locale = "en"): string {
  try {
    return (
      new Intl.DisplayNames([locale], { type: "currency" }).of(code) ?? code
    )
  } catch {
    return code
  }
}

/** Decimal places used by a currency: 2 for LKR/USD, 0 for JPY. */
export function currencyDigits(currency: string): number {
  return (
    new Intl.NumberFormat("en", {
      style: "currency",
      currency,
    }).resolvedOptions().maximumFractionDigits ?? 2
  )
}

/** A sensible first suggestion from the user's timezone; they can change it. */
const ZONE_CURRENCY: Record<string, string> = {
  "Asia/Colombo": "LKR",
  "Asia/Kolkata": "INR",
  "Asia/Calcutta": "INR",
  "Asia/Karachi": "PKR",
  "Asia/Dhaka": "BDT",
  "Asia/Kathmandu": "NPR",
  "Asia/Singapore": "SGD",
  "Asia/Dubai": "AED",
  "Asia/Tokyo": "JPY",
  "Australia/Sydney": "AUD",
  "Australia/Melbourne": "AUD",
  "Europe/London": "GBP",
  "Pacific/Auckland": "NZD",
  "America/Toronto": "CAD",
}

export function suggestCurrency(timezone: string): string {
  if (ZONE_CURRENCY[timezone]) return ZONE_CURRENCY[timezone]
  if (timezone.startsWith("Europe/")) return "EUR"
  return "USD"
}

export type ParsedAmount =
  { ok: true; minor: number } | { ok: false; error: string }

/**
 * Parses what a person typed ("1,250.50", " 1250 ") into minor units.
 * Commas are thousands separators; a dot is the decimal separator.
 */
export function parseAmount(input: string, currency: string): ParsedAmount {
  const digits = currencyDigits(currency)
  const cleaned = input.trim().replace(/[\s,]/g, "")
  if (cleaned === "") return { ok: false, error: "Enter an amount." }

  const match = /^(\d+)(?:\.(\d*))?$/.exec(cleaned)
  if (!match) return { ok: false, error: "Use numbers only, like 1250.50." }

  const [, whole, fraction = ""] = match
  if (fraction.length > digits) {
    return {
      ok: false,
      error:
        digits === 0
          ? `${currency} amounts have no decimals.`
          : `Use at most ${digits} decimal places.`,
    }
  }

  const minor = Number(`${whole}${fraction.padEnd(digits, "0")}`)
  if (!Number.isSafeInteger(minor) || minor > MAX_MINOR) {
    return { ok: false, error: "That amount is too large." }
  }
  if (minor <= 0) return { ok: false, error: "Enter an amount above zero." }
  return { ok: true, minor }
}

/** Minor units back to a plain input value: 125050 LKR → "1250.50". */
export function minorToInput(minor: number, currency: string): string {
  const digits = currencyDigits(currency)
  if (digits === 0) return String(minor)
  const text = String(minor).padStart(digits + 1, "0")
  return `${text.slice(0, -digits)}.${text.slice(-digits)}`
}

/** For display: "LKR 1,250.50". `compact` gives "LKR 12.5K" for chart axes. */
export function formatMoney(
  minor: number,
  currency: string,
  {
    locale = "en-GB",
    compact = false,
  }: { locale?: string; compact?: boolean } = {},
): string {
  const digits = currencyDigits(currency)
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency,
    currencyDisplay: "narrowSymbol",
    ...(compact
      ? { notation: "compact", maximumFractionDigits: 1 }
      : { minimumFractionDigits: digits, maximumFractionDigits: digits }),
  }).format(minor / 10 ** digits)
}
