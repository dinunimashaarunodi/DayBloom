import { describe, expect, it } from "vitest"

import {
  dayMinutes,
  dayStreak,
  reviewDeck,
  weekMinutes,
} from "@/features/languages/logic"
import {
  languageFormSchema,
  practiceFormSchema,
  wordFormSchema,
} from "@/features/languages/schema"
import type { LocalDate } from "@/lib/dates/local-date"

const d = (value: string) => value as LocalDate
// Thursday; its week starts Monday 19 October.
const THU = d("2026-10-22")

const log = (local_date: string, minutes: number) => ({
  local_date: d(local_date),
  minutes,
})

describe("practice totals", () => {
  const practice = [
    log("2026-10-22", 15),
    log("2026-10-22", 10),
    log("2026-10-19", 30),
    log("2026-10-18", 60), // last week
  ]

  it("adds up this week's minutes from Monday", () => {
    expect(weekMinutes(practice, THU)).toBe(55)
  })

  it("adds up one day's minutes", () => {
    expect(dayMinutes(practice, THU)).toBe(25)
    expect(dayMinutes(practice, d("2026-10-20"))).toBe(0)
  })
})

describe("dayStreak", () => {
  it("counts consecutive days ending today", () => {
    expect(
      dayStreak([d("2026-10-22"), d("2026-10-21"), d("2026-10-20")], THU),
    ).toBe(3)
  })

  it("doesn't break before today is over", () => {
    expect(dayStreak([d("2026-10-21"), d("2026-10-20")], THU)).toBe(2)
  })

  it("stops at a gap and ignores duplicates", () => {
    expect(
      dayStreak([d("2026-10-22"), d("2026-10-22"), d("2026-10-20")], THU),
    ).toBe(1)
    expect(dayStreak([d("2026-10-19")], THU)).toBe(0)
  })
})

describe("reviewDeck", () => {
  const words = [
    { id: "a", learned: false },
    { id: "b", learned: true },
    { id: "c", learned: false },
    { id: "d", learned: false },
  ]

  it("holds only words still being learned", () => {
    const deck = reviewDeck(words)
    expect(deck.map((w) => w.id).sort()).toEqual(["a", "c", "d"])
  })

  it("shuffles with the given random source, without changing the input", () => {
    // random() = 0 always swaps each card with the first one.
    expect(reviewDeck(words, () => 0).map((w) => w.id)).toEqual(["c", "d", "a"])
    expect(words.map((w) => w.id)).toEqual(["a", "b", "c", "d"])
  })
})

describe("schemas", () => {
  it("parses a language with an optional level", () => {
    expect(languageFormSchema.parse({ name: " Spanish ", level: "" })).toEqual({
      name: "Spanish",
      level: null,
    })
    expect(languageFormSchema.parse({ name: "x", level: "B1" }).level).toBe(
      "B1",
    )
    expect(
      languageFormSchema.safeParse({ name: "x", level: "D1" }).success,
    ).toBe(false)
  })

  it("parses practice", () => {
    expect(
      practiceFormSchema.parse({
        date: "2026-10-22",
        minutes: "20",
        activity: "listening",
        notes: " ",
      }),
    ).toEqual({
      date: "2026-10-22",
      minutes: 20,
      activity: "listening",
      notes: null,
    })
    for (const bad of [
      { minutes: "0" },
      { activity: "" },
      { activity: "dancing" },
    ]) {
      expect(
        practiceFormSchema.safeParse({
          date: "2026-10-22",
          minutes: "20",
          activity: "reading",
          notes: "",
          ...bad,
        }).success,
      ).toBe(false)
    }
  })

  it("requires a term and a meaning", () => {
    expect(
      wordFormSchema.parse({ term: " hola ", meaning: " hello ", example: "" }),
    ).toEqual({ term: "hola", meaning: "hello", example: null })
    expect(
      wordFormSchema.safeParse({ term: "hola", meaning: " ", example: "" })
        .success,
    ).toBe(false)
  })
})
