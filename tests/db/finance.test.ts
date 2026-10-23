import type { SupabaseClient } from "@supabase/supabase-js"
import { afterAll, beforeAll, describe, expect, it } from "vitest"

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

describe("finance: categories, transactions and RLS", () => {
  let alice: TestUser
  let bob: TestUser
  let asAlice: Client
  let asBob: Client

  // Shared users keep sign-ins under Supabase's rate limit. The tests run
  // in order: the first one needs a profile with no currency yet.
  beforeAll(async () => {
    alice = await createTestUser({ timezone: "Asia/Colombo" })
    bob = await createTestUser({ timezone: "Asia/Colombo" })
    ;[asAlice, asBob] = await Promise.all([
      signedInClient(alice),
      signedInClient(bob),
    ])
  })

  afterAll(async () => {
    await Promise.all([deleteTestUser(alice), deleteTestUser(bob)])
  })

  async function setUp(client: Client, user: TestUser, currency = "LKR") {
    await client.from("profiles").update({ currency }).eq("user_id", user.id)
    const { error } = await client.rpc("ensure_default_finance_categories")
    if (error) throw error
    const { data } = await client
      .from("finance_categories")
      .select("id, kind, name")
    return data!
  }

  const find = (
    cats: { id: string; kind: string; name: string }[],
    name: string,
  ) => cats.find((c) => c.name === name)!.id

  it("requires a currency before adding transactions, then stamps it", async () => {
    const early = await asAlice.from("transactions").insert({
      kind: "expense",
      amount_minor: 1000,
      occurred_on: "2026-10-19",
    })
    expect(early.error?.message).toMatch(/Choose your currency/)

    const cats = await setUp(asAlice, alice)
    const { data, error } = await asAlice
      .from("transactions")
      .insert({
        kind: "expense",
        amount_minor: 125050,
        occurred_on: "2026-10-19",
        category_id: find(cats, "Food & groceries"),
        note: "  Weekly shop  ",
      })
      .select()
      .single()
    expect(error).toBeNull()
    expect(data).toMatchObject({
      currency: "LKR",
      amount_minor: 125050,
      note: "Weekly shop",
    })
  })

  it("creates starter categories once, and validates the currency code", async () => {
    const cats = await setUp(asAlice, alice)
    expect(cats.filter((c) => c.kind === "expense").length).toBeGreaterThan(5)
    expect(cats.filter((c) => c.kind === "income").length).toBeGreaterThan(1)

    await asAlice.rpc("ensure_default_finance_categories")
    const { count } = await asAlice
      .from("finance_categories")
      .select("*", { count: "exact", head: true })
    expect(count).toBe(cats.length)

    const bad = await asAlice
      .from("profiles")
      .update({ currency: "rupees" })
      .eq("user_id", alice.id)
    expect(bad.error).not.toBeNull()
  })

  it("rejects a category of the wrong kind, archived categories, and bad amounts", async () => {
    const cats = await setUp(asAlice, alice)
    const salary = find(cats, "Salary")
    const wrongKind = await asAlice.from("transactions").insert({
      kind: "expense",
      amount_minor: 500,
      occurred_on: "2026-10-19",
      category_id: salary,
    })
    expect(wrongKind.error?.message).toMatch(/does not match/)

    const shopping = find(cats, "Shopping")
    await asAlice
      .from("finance_categories")
      .update({ archived_at: new Date().toISOString() })
      .eq("id", shopping)
    const archived = await asAlice.from("transactions").insert({
      kind: "expense",
      amount_minor: 500,
      occurred_on: "2026-10-19",
      category_id: shopping,
    })
    expect(archived.error?.message).toMatch(/archived/)

    for (const amount_minor of [0, -100, 1_000_000_000_001]) {
      const { error } = await asAlice
        .from("transactions")
        .insert({ kind: "expense", amount_minor, occurred_on: "2026-10-19" })
      expect(error).not.toBeNull()
    }
  })

  it("keeps each user's money private and blocks cross-user categories", async () => {
    const aliceCats = await setUp(asAlice, alice)
    await setUp(asBob, bob)
    const { data: tx } = await asAlice
      .from("transactions")
      .insert({
        kind: "income",
        amount_minor: 5_000_000,
        occurred_on: "2026-10-01",
      })
      .select()
      .single()

    const { data: seen } = await asBob
      .from("transactions")
      .select("id")
      .eq("id", tx!.id)
    expect(seen).toEqual([])
    const { data: changed } = await asBob
      .from("transactions")
      .update({ amount_minor: 1 })
      .eq("id", tx!.id)
      .select()
    expect(changed).toEqual([])

    // Bob can't file a transaction under Alice's category.
    const stolen = await asBob.from("transactions").insert({
      kind: "expense",
      amount_minor: 100,
      occurred_on: "2026-10-19",
      category_id: find(aliceCats, "Transport"),
    })
    expect(stolen.error).not.toBeNull()

    const { data, error } = await anonClient().from("transactions").select("*")
    expect(error !== null || data?.length === 0).toBe(true)
  })

  it("defaults to the main currency, allows others, and has no hard delete", async () => {
    await setUp(asAlice, alice)
    const insert = (fields: { currency?: string }) =>
      asAlice
        .from("transactions")
        .insert({
          kind: "expense",
          amount_minor: 900,
          occurred_on: "2026-10-19",
          ...fields,
        })
        .select()
        .single()

    // No currency (or the old placeholder) means the main one.
    const { data: tx } = await insert({})
    expect(tx!.currency).toBe("LKR")
    expect((await insert({ currency: "XXX" })).data!.currency).toBe("LKR")

    // Another currency can be chosen, on insert and later.
    expect((await insert({ currency: "USD" })).data!.currency).toBe("USD")
    const { data: changed } = await asAlice
      .from("transactions")
      .update({ currency: "EUR" })
      .eq("id", tx!.id)
      .select("currency")
      .single()
    expect(changed!.currency).toBe("EUR")
    expect((await insert({ currency: "dollars" })).error).not.toBeNull()

    await asAlice.from("transactions").delete().eq("id", tx!.id)
    const { count } = await adminClient()
      .from("transactions")
      .select("*", { count: "exact", head: true })
      .eq("id", tx!.id)
    expect(count).toBe(1)
  })

  it("is removed completely when the account is deleted", async () => {
    // A fresh user, so the shared ones survive for the other tests.
    const carol = await createTestUser({ timezone: "Asia/Colombo" })
    try {
      const asCarol = await signedInClient(carol)
      await setUp(asCarol, carol)
      await asCarol.from("transactions").insert({
        kind: "expense",
        amount_minor: 900,
        occurred_on: "2026-10-19",
      })
      const { error } = await asCarol.rpc("delete_my_account")
      expect(error).toBeNull()

      for (const table of ["transactions", "finance_categories"] as const) {
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
