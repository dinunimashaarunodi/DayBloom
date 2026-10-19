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
type BudgetArgs = Database["public"]["Functions"]["set_budget"]["Args"]

/** Generated types mark SQL args non-null; null category = overall, null amount = removed. */
const args = (category: string | null, month: string, amount: number | null) =>
  ({
    p_category_id: category,
    p_starts_on: month,
    p_amount_minor: amount,
  }) as unknown as BudgetArgs

describe("budgets: effective-dated limits and RLS", () => {
  let alice: TestUser
  let bob: TestUser
  let asAlice: Client
  let asBob: Client
  let food: string
  let salary: string

  // Shared users keep sign-ins low. Tests use different months/scopes.
  beforeAll(async () => {
    alice = await createTestUser({ timezone: "Asia/Colombo" })
    bob = await createTestUser({ timezone: "Asia/Colombo" })
    ;[asAlice, asBob] = await Promise.all([
      signedInClient(alice),
      signedInClient(bob),
    ])
    // Bob has no currency yet: the first test relies on that.
    await asAlice
      .from("profiles")
      .update({ currency: "LKR" })
      .eq("user_id", alice.id)
    await asAlice.rpc("ensure_default_finance_categories")
    const { data } = await asAlice.from("finance_categories").select("id, name")
    food = data!.find((c) => c.name === "Food & groceries")!.id
    salary = data!.find((c) => c.name === "Salary")!.id
  })

  afterAll(async () => {
    await Promise.all([deleteTestUser(alice), deleteTestUser(bob)])
  })

  async function rows(client: Client) {
    const { data } = await client
      .from("budgets")
      .select("category_id, starts_on, amount_minor, currency")
      .order("starts_on")
    return data!
  }

  it("requires a currency first", async () => {
    const { error } = await asBob.rpc(
      "set_budget",
      args(null, "2026-10-01", 5000000),
    )
    expect(error?.message).toMatch(/Choose your currency/)
  })

  it("sets an overall and a category budget, normalising to the month start", async () => {
    expect(
      (await asAlice.rpc("set_budget", args(null, "2026-10-19", 10000000)))
        .error,
    ).toBeNull()
    expect(
      (await asAlice.rpc("set_budget", args(food, "2026-10-01", 3000000)))
        .error,
    ).toBeNull()
    expect(await rows(asAlice)).toEqual(
      expect.arrayContaining([
        {
          category_id: null,
          starts_on: "2026-10-01",
          amount_minor: 10000000,
          currency: "LKR",
        },
        {
          category_id: food,
          starts_on: "2026-10-01",
          amount_minor: 3000000,
          currency: "LKR",
        },
      ]),
    )
  })

  it("updates the same month in place, and a new month adds a row (history kept)", async () => {
    await asAlice.rpc("set_budget", args(food, "2026-10-01", 3500000))
    await asAlice.rpc("set_budget", args(food, "2026-11-05", null)) // removed from November
    const foodRows = (await rows(asAlice)).filter((r) => r.category_id === food)
    expect(foodRows).toEqual([
      {
        category_id: food,
        starts_on: "2026-10-01",
        amount_minor: 3500000,
        currency: "LKR",
      },
      {
        category_id: food,
        starts_on: "2026-11-01",
        amount_minor: null,
        currency: "LKR",
      },
    ])
  })

  it("only allows expense categories, sensible amounts and month starts", async () => {
    const income = await asAlice.rpc(
      "set_budget",
      args(salary, "2026-10-01", 100),
    )
    expect(income.error?.message).toMatch(/expense categories only/)
    for (const amount of [0, -5, 1_000_000_000_001]) {
      const { error } = await asAlice.rpc(
        "set_budget",
        args(null, "2026-12-01", amount),
      )
      expect(error).not.toBeNull()
    }
    const midMonth = await asAlice
      .from("budgets")
      .insert({ starts_on: "2026-12-15", amount_minor: 100 })
    expect(midMonth.error).not.toBeNull()
  })

  it("keeps budgets private and blocks other users' categories", async () => {
    expect(await rows(asBob)).toEqual([])
    const { data } = await asBob
      .from("budgets")
      .update({ amount_minor: 1 })
      .eq("user_id", alice.id)
      .select()
    expect(data).toEqual([])

    await asBob
      .from("profiles")
      .update({ currency: "LKR" })
      .eq("user_id", bob.id)
    const stolen = await asBob.rpc("set_budget", args(food, "2026-10-01", 100))
    expect(stolen.error).not.toBeNull()

    const anon = await anonClient().from("budgets").select("*")
    expect(anon.error !== null || anon.data?.length === 0).toBe(true)
  })

  it("can't be hard-deleted and is removed with the account", async () => {
    await asAlice.from("budgets").delete().eq("user_id", alice.id)
    const before = await adminClient()
      .from("budgets")
      .select("*", { count: "exact", head: true })
      .eq("user_id", alice.id)
    expect(before.count).toBeGreaterThan(0)

    await asAlice.rpc("delete_my_account")
    const after = await adminClient()
      .from("budgets")
      .select("*", { count: "exact", head: true })
      .eq("user_id", alice.id)
    expect(after.count).toBe(0)
  })
})
