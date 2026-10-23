import { describe, expect, it } from "vitest"

import {
  dayMinutes,
  dayStreak,
  isDue,
  nextReviewDay,
  nextReviewLabel,
  reviewDeck,
  reviewIntervalDays,
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
    { id: "a", learned: false, due_on: null },
    { id: "b", learned: true, due_on: null },
    { id: "c", learned: false, due_on: d("2026-10-20") },
    { id: "d", learned: false, due_on: THU },
    { id: "e", learned: false, due_on: d("2026-10-23") },
  ]

  it("holds unlearned words that are new or due by today", () => {
    const deck = reviewDeck(words, THU)
    expect(deck.map((w) => w.id).sort()).toEqual(["a", "c", "d"])
  })

  it("shuffles with the given random source, without changing the input", () => {
    // random() = 0 always swaps each card with the first one.
    expect(reviewDeck(words, THU, () => 0).map((w) => w.id)).toEqual([
      "c",
      "d",
      "a",
    ])
    expect(words.map((w) => w.id)).toEqual(["a", "b", "c", "d", "e"])
  })
})

describe("spaced repetition", () => {
  it("waits longer in each box", () => {
    expect([1, 2, 3, 4, 5].map(reviewIntervalDays)).toEqual([1, 3, 7, 14, 30])
  })

  it("knows what's due and says when the next review is", () => {
    const word = (due_on: string | null, learned = false) => ({
      learned,
      due_on: due_on === null ? null : d(due_on),
    })
    expect(isDue(word(null), THU)).toBe(true)
    expect(isDue(word("2026-10-22"), THU)).toBe(true)
    expect(isDue(word("2026-10-23"), THU)).toBe(false)
    expect(isDue(word(null, true), THU)).toBe(false)

    expect(nextReviewLabel(word("2026-10-01"), THU)).toBe("Due now")
    expect(nextReviewLabel(word("2026-10-23"), THU)).toBe("Review tomorrow")
    expect(nextReviewLabel(word("2026-10-29"), THU)).toBe("Review in 7 days")
    expect(nextReviewLabel(word(null, true), THU)).toBeNull()

    expect(
      nextReviewDay(
        [
          word("2026-11-01"),
          word("2026-10-25"),
          word(null),
          word("2026-10-24", true),
        ],
        THU,
      ),
    ).toBe("2026-10-25")
    expect(nextReviewDay([word(null)], THU)).toBeNull()
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
