import type { SupabaseClient } from "@supabase/supabase-js"
import { afterAll, beforeAll, describe, expect, it } from "vitest"

import { reviewIntervalDays } from "@/features/languages/logic"
import { addDays, todayIn, type LocalDate } from "@/lib/dates/local-date"
import type { Database } from "@/types/database"

import {
  adminClient,
  anonClient,
  createTestUser,
  deleteTestUser,
  signedInClient,
  type TestUser,
} from "../support/supabase"

type Client = SupabaseClient<Database>
const TZ = "Asia/Colombo"

describe("languages, practice and words", () => {
  let alice: TestUser
  let bob: TestUser
  let asAlice: Client
  let asBob: Client
  let today: LocalDate

  beforeAll(async () => {
    alice = await createTestUser({ timezone: TZ })
    bob = await createTestUser({ timezone: TZ })
    ;[asAlice, asBob] = await Promise.all([
      signedInClient(alice),
      signedInClient(bob),
    ])
    today = todayIn(TZ, new Date())
  })

  afterAll(async () => {
    await Promise.all([deleteTestUser(alice), deleteTestUser(bob)])
  })

  async function language(client: Client, name: string) {
    const { data, error } = await client
      .from("languages")
      .insert({ name })
      .select()
      .single()
    if (error) throw error
    return data
  }

  it("adds languages once per name, ignoring case", async () => {
    const l = await language(asAlice, "  Spanish ")
    expect(l.name).toBe("Spanish")
    const dup = await asAlice.from("languages").insert({ name: "spanish" })
    expect(dup.error?.code).toBe("23505")
    // Bob can have his own Spanish.
    await language(asBob, "Spanish")

    const badLevel = await asAlice
      .from("languages")
      .insert({ name: "French", level: "D1" })
    expect(badLevel.error).not.toBeNull()

    // Never deleted (archived instead).
    await asAlice.from("languages").delete().eq("id", l.id)
    const { data } = await asAlice.from("languages").select("id").eq("id", l.id)
    expect(data).toHaveLength(1)
  })

  it("schedules flashcard reviews with growing intervals", async () => {
    const l = await language(asAlice, "Portuguese")
    const { data: word, error } = await asAlice
      .from("language_words")
      .insert({ language_id: l.id, term: "ciao", meaning: "hello" })
      .select("id, box, due_on, learned")
      .single()
    if (error) throw error
    expect(word).toMatchObject({ box: 0, due_on: null, learned: false })

    const review = async (remembered: boolean) => {
      const { data, error } = await asAlice
        .rpc("review_word", { word_id: word.id, remembered })
        .single()
      if (error) throw error
      return data
    }

    // Remembered: up a box each time, due later each time.
    for (const box of [1, 2, 3, 4, 5]) {
      expect(await review(true)).toEqual({
        box,
        due_on: addDays(today, reviewIntervalDays(box)),
        learned: false,
      })
    }
    // Forgotten: back to box 1, due tomorrow.
    expect(await review(false)).toEqual({
      box: 1,
      due_on: addDays(today, 1),
      learned: false,
    })
    // Remembered in the top box: learned, out of the review.
    for (let i = 0; i < 4; i++) await review(true)
    expect(await review(true)).toEqual({ box: 5, due_on: null, learned: true })
    const again = await asAlice.rpc("review_word", {
      word_id: word.id,
      remembered: true,
    })
    expect(again.error).not.toBeNull()

    // The SQL intervals match the app's.
    for (const box of [1, 2, 3, 4, 5]) {
      const { data } = await asAlice.rpc("word_review_interval", { box })
      expect(data).toBe(reviewIntervalDays(box))
    }

    // Nobody else can review (or see) Alice's word.
    const bobs = await asBob.rpc("review_word", {
      word_id: word.id,
      remembered: true,
    })
    expect(bobs.error).not.toBeNull()
  })

  it("logs practice on past days only, not future ones", async () => {
    const l = await language(asAlice, "German")
    const practise = (local_date: string, minutes = 20) =>
      asAlice.from("language_practice").insert({
        language_id: l.id,
        local_date,
        minutes,
        activity: "reading",
      })
    expect((await practise(today)).error).toBeNull()
    expect((await practise(addDays(today, -100))).error).toBeNull()
    expect((await practise(addDays(today, 1))).error).not.toBeNull()
    expect((await practise(today, 0)).error).not.toBeNull()
  })

  it("stamps learned_at for words and trims text", async () => {
    const l = await language(asAlice, "Italian")
    const { data: w } = await asAlice
      .from("language_words")
      .insert({
        language_id: l.id,
        term: " ciao ",
        meaning: " hi ",
        example: " ",
      })
      .select()
      .single()
    expect(w).toMatchObject({
      term: "ciao",
      meaning: "hi",
      example: null,
      learned: false,
      learned_at: null,
    })

    const { data: learned } = await asAlice
      .from("language_words")
      .update({ learned: true })
      .eq("id", w!.id)
      .select()
      .single()
    expect(learned!.learned_at).not.toBeNull()

    const forged = await asAlice
      .from("language_words")
      .update({ learned_at: "2020-01-01T00:00:00Z" } as never)
      .eq("id", w!.id)
    expect(forged.error).not.toBeNull()
  })

  it("keeps everything private, including from other users' languages", async () => {
    const l = await language(asAlice, "Japanese")
    await asAlice.from("language_words").insert({
      language_id: l.id,
      term: "neko",
      meaning: "cat",
    })
    await asAlice.from("language_practice").insert({
      language_id: l.id,
      local_date: today,
      minutes: 15,
      activity: "lesson",
    })

    for (const table of [
      "languages",
      "language_words",
      "language_practice",
    ] as const) {
      // Bob sees none of Alice's rows.
      const { data } = await asBob
        .from(table)
        .select("id")
        .eq("user_id", alice.id)
      expect(data).toEqual([])
      const anon = await anonClient().from(table).select("*")
      expect(anon.error !== null || anon.data?.length === 0).toBe(true)
    }

    // Composite foreign keys: Bob can't attach rows to Alice's language.
    const word = await asBob
      .from("language_words")
      .insert({ language_id: l.id, term: "x", meaning: "y" })
    expect(word.error).not.toBeNull()
    const practice = await asBob.from("language_practice").insert({
      language_id: l.id,
      local_date: today,
      minutes: 5,
      activity: "other",
    })
    expect(practice.error).not.toBeNull()
  })

  it("is removed completely when the account is deleted", async () => {
    const carol = await createTestUser({ timezone: TZ })
    try {
      const asCarol = await signedInClient(carol)
      const l = await language(asCarol, "Korean")
      await asCarol
        .from("language_words")
        .insert({ language_id: l.id, term: "a", meaning: "b" })
      await asCarol.from("language_practice").insert({
        language_id: l.id,
        local_date: today,
        minutes: 5,
        activity: "lesson",
      })
      expect((await asCarol.rpc("delete_my_account")).error).toBeNull()
      for (const table of [
        "languages",
        "language_words",
        "language_practice",
      ] as const) {
        const { count } = await adminClient()
          .from(table)
          .select("*", { count: "exact", head: true })
          .eq("user_id", carol.id)
        expect(count).toBe(0)
      }
    } finally {
      await deleteTestUser(carol)
    }
  })
})
