import { describe, expect, it } from "vitest"

import {
  containsFilter,
  entryHeading,
  excerpt,
  groupByDate,
  wordCount,
  writingPrompt,
} from "@/features/journal/logic"
import {
  journalEntrySchema,
  searchQuerySchema,
} from "@/features/journal/schema"
import type { LocalDate } from "@/lib/dates/local-date"

const d = (value: string) => value as LocalDate

describe("excerpt and headings", () => {
  it("flattens whitespace and cuts at a word boundary", () => {
    expect(excerpt("Hello\n\n  world")).toBe("Hello world")
    expect(excerpt("one two three four five", 16)).toBe("one two three…")
    // A single long word is cut mid-word rather than becoming empty.
    expect(excerpt("a".repeat(20), 10)).toBe(`${"a".repeat(10)}…`)
  })

  it("uses the title, or the start of the first line", () => {
    expect(entryHeading({ title: "Sunday", body: "Long walk" })).toBe("Sunday")
    expect(entryHeading({ title: null, body: "  Long walk\nThen tea" })).toBe(
      "Long walk",
    )
  })

  it("counts words", () => {
    expect(wordCount("")).toBe(0)
    expect(wordCount("  one\ttwo\nthree  ")).toBe(3)
  })
})

describe("groupByDate", () => {
  it("groups consecutive entries of the same day, keeping order", () => {
    const entries = [
      { id: "a", local_date: d("2026-10-22") },
      { id: "b", local_date: d("2026-10-22") },
      { id: "c", local_date: d("2026-10-20") },
    ]
    expect(groupByDate(entries)).toEqual([
      { date: "2026-10-22", entries: [entries[0], entries[1]] },
      { date: "2026-10-20", entries: [entries[2]] },
    ])
    expect(groupByDate([])).toEqual([])
  })
})

describe("writingPrompt", () => {
  it("is stable for a day and changes the next day", () => {
    expect(writingPrompt(d("2026-10-22"))).toBe(writingPrompt(d("2026-10-22")))
    expect(writingPrompt(d("2026-10-22"))).not.toBe(
      writingPrompt(d("2026-10-23")),
    )
    // Dates before the reference day still get a prompt.
    expect(writingPrompt(d("2025-03-01"))).toMatch(/\?$/)
  })
})

describe("containsFilter", () => {
  it("builds a quoted ilike filter for each column", () => {
    expect(containsFilter(["title", "body"], "tea")).toBe(
      'title.ilike."%tea%",body.ilike."%tea%"',
    )
  })

  it("escapes wildcards, quotes and backslashes", () => {
    // LIKE escapes (\% \_ \\) are then escaped again for PostgREST quoting.
    expect(containsFilter(["body"], "50%_")).toBe('body.ilike."%50\\\\%\\\\_%"')
    expect(containsFilter(["body"], 'say "hi", (ok)')).toBe(
      'body.ilike."%say \\"hi\\", (ok)%"',
    )
  })
})

describe("journalEntrySchema", () => {
  it("trims, and turns a blank title into null", () => {
    expect(
      journalEntrySchema.parse({
        date: "2026-10-22",
        title: "   ",
        body: "  Hello  ",
      }),
    ).toEqual({ date: "2026-10-22", title: null, body: "Hello" })
  })

  it("rejects empty bodies, long titles and bad dates", () => {
    const base = { date: "2026-10-22", title: "", body: "x" }
    expect(journalEntrySchema.safeParse({ ...base, body: " " }).success).toBe(
      false,
    )
    expect(
      journalEntrySchema.safeParse({ ...base, title: "t".repeat(121) }).success,
    ).toBe(false)
    expect(
      journalEntrySchema.safeParse({ ...base, date: "2026-02-30" }).success,
    ).toBe(false)
  })

  it("treats a blank or invalid search as no search", () => {
    expect(searchQuerySchema.parse("  walk ")).toBe("walk")
    expect(searchQuerySchema.parse("  ")).toBeNull()
    expect(searchQuerySchema.parse(undefined)).toBeNull()
  })
})
