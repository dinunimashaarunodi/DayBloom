import { describe, expect, it } from "vitest"

import {
  currencyDigits,
  currencyName,
  formatMoney,
  isCurrencyCode,
  minorToInput,
  parseAmount,
  suggestCurrency,
} from "@/lib/money"

describe("parseAmount", () => {
  it.each([
    ["1250.50", "LKR", 125050],
    ["1,250.50", "LKR", 125050],
    [" 1 250.5 ", "LKR", 125050],
    ["0.01", "USD", 1],
    ["10", "USD", 1000],
    ["10.", "USD", 1000],
    ["1500", "JPY", 1500],
    ["10000000000", "LKR", 1_000_000_000_000],
  ])("parses %j %s as %d minor units", (input, currency, minor) => {
    expect(parseAmount(input, currency)).toEqual({ ok: true, minor })
  })

  it("never suffers floating-point drift", () => {
    // 0.29 * 100 is 28.999999999999996 in floating point.
    expect(parseAmount("0.29", "USD")).toEqual({ ok: true, minor: 29 })
    expect(parseAmount("1.005", "USD").ok).toBe(false)
  })

  it.each([
    ["", "Enter an amount."],
    ["abc", "Use numbers only"],
    ["-5", "Use numbers only"],
    ["1.2.3", "Use numbers only"],
    ["0", "above zero"],
    ["0.00", "above zero"],
    ["12.345", "at most 2 decimal places"],
    ["10000000000.01", "too large"],
  ])("rejects %j", (input, message) => {
    const result = parseAmount(input, "LKR")
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.error).toContain(message)
  })

  it("explains currencies without decimals", () => {
    expect(parseAmount("10.5", "JPY")).toEqual({
      ok: false,
      error: "JPY amounts have no decimals.",
    })
  })
})

describe("currencies", () => {
  it("knows decimal places", () => {
    expect(currencyDigits("LKR")).toBe(2)
    expect(currencyDigits("JPY")).toBe(0)
  })

  it("validates codes against what the runtime supports", () => {
    expect(isCurrencyCode("LKR")).toBe(true)
    expect(isCurrencyCode("lkr")).toBe(false)
    expect(isCurrencyCode("ZZZ")).toBe(false)
    expect(isCurrencyCode(undefined)).toBe(false)
  })

  it("suggests a currency from the timezone", () => {
    expect(suggestCurrency("Asia/Colombo")).toBe("LKR")
    expect(suggestCurrency("Europe/Berlin")).toBe("EUR")
    expect(suggestCurrency("America/Chicago")).toBe("USD")
  })

  it("names currencies", () => {
    expect(currencyName("LKR")).toBe("Sri Lankan Rupee")
  })
})

describe("formatting", () => {
  it("formats minor units with the currency's own decimals", () => {
    // Intl joins the symbol and number with a non-breaking space.
    expect(formatMoney(125050, "LKR")).toBe("Rs 1,250.50")
    expect(formatMoney(1500, "JPY")).toBe("¥1,500")
    expect(formatMoney(5, "USD")).toBe("$0.05")
  })

  it("compacts large values for chart axes", () => {
    expect(formatMoney(1_250_000, "LKR", { compact: true })).toBe("Rs 12.5K")
  })

  it("round-trips through the edit form", () => {
    for (const [minor, currency] of [
      [125050, "LKR"],
      [5, "USD"],
      [1500, "JPY"],
      [100, "USD"],
    ] as const) {
      const input = minorToInput(minor, currency)
      expect(parseAmount(input, currency)).toEqual({ ok: true, minor })
    }
    expect(minorToInput(5, "USD")).toBe("0.05")
  })
})
