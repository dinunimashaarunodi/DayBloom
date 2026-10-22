import type { SupabaseClient } from "@supabase/supabase-js"
import { afterAll, beforeAll, describe, expect, it } from "vitest"

import { containsFilter } from "@/features/journal/logic"
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

describe("journal entries", () => {
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

  async function entry(
    client: Client,
    body: string,
    extra: { title?: string; local_date?: string } = {},
  ) {
    const { data, error } = await client
      .from("journal_entries")
      .insert({ local_date: today, body, ...extra })
      .select()
      .single()
    if (error) throw error
    return data
  }

  it("trims text and treats a blank title as none", async () => {
    const e = await entry(asAlice, "\n  A quiet morning.  \n", {
      title: "   ",
    })
    expect(e).toMatchObject({
      body: "A quiet morning.",
      title: null,
      user_id: alice.id,
    })

    const blank = await asAlice
      .from("journal_entries")
      .insert({ local_date: today, body: "  \n " })
    expect(blank.error).not.toBeNull()
  })

  it("allows past days but never future ones", async () => {
    await entry(asAlice, "Last year", { local_date: addDays(today, -400) })
    const future = await asAlice
      .from("journal_entries")
      .insert({ local_date: addDays(today, 1), body: "Tomorrow" })
    expect(future.error).not.toBeNull()

    const e = await entry(asAlice, "Movable")
    const moved = await asAlice
      .from("journal_entries")
      .update({ local_date: addDays(today, 1) })
      .eq("id", e.id)
    expect(moved.error).not.toBeNull()
  })

  it("searches title and body, with wildcards matched literally", async () => {
    await entry(asAlice, "Saved 50% of my budget", { title: "Money" })
    await entry(asAlice, "Saved 500 rupees")
    await entry(asAlice, "Notes", { title: 'Quotes "and", (commas)' })

    const search = (q: string) =>
      asAlice
        .from("journal_entries")
        .select("body")
        .or(containsFilter(["title", "body"], q))

    const percent = await search("50%")
    expect(percent.error).toBeNull()
    expect(percent.data?.map((r) => r.body)).toEqual(["Saved 50% of my budget"])

    const tricky = await search('"and", (comm')
    expect(tricky.error).toBeNull()
    expect(tricky.data).toHaveLength(1)

    const caseless = await search("MONEY")
    expect(caseless.data).toHaveLength(1)
  })

  it("keeps entries private", async () => {
    const e = await entry(asAlice, "Only for me")
    const { data: seen } = await asBob
      .from("journal_entries")
      .select("id")
      .eq("id", e.id)
    expect(seen).toEqual([])

    const { data: edited } = await asBob
      .from("journal_entries")
      .update({ body: "Hacked" })
      .eq("id", e.id)
      .select()
    expect(edited).toEqual([])

    await asBob.from("journal_entries").delete().eq("id", e.id)
    const { data: still } = await asAlice
      .from("journal_entries")
      .select("body")
      .eq("id", e.id)
      .single()
    expect(still?.body).toBe("Only for me")

    // Bob can't write into Alice's journal either.
    const planted = await asBob
      .from("journal_entries")
      .insert({ local_date: today, body: "Hi", user_id: alice.id } as never)
    expect(planted.error).not.toBeNull()

    const anon = await anonClient().from("journal_entries").select("*")
    expect(anon.error !== null || anon.data?.length === 0).toBe(true)
  })

  it("deletes entries for real", async () => {
    const e = await entry(asAlice, "Delete me")
    expect(
      (await asAlice.from("journal_entries").delete().eq("id", e.id)).error,
    ).toBeNull()
    const { count } = await adminClient()
      .from("journal_entries")
      .select("*", { count: "exact", head: true })
      .eq("id", e.id)
    expect(count).toBe(0)
  })

  it("is removed when the account is deleted", async () => {
    const carol = await createTestUser({ timezone: TZ })
    try {
      const asCarol = await signedInClient(carol)
      await entry(asCarol, "Dear diary")
      expect((await asCarol.rpc("delete_my_account")).error).toBeNull()
      const { count } = await adminClient()
        .from("journal_entries")
        .select("*", { count: "exact", head: true })
        .eq("user_id", carol.id)
      expect(count).toBe(0)
    } finally {
      await deleteTestUser(carol)
    }
  })
})
