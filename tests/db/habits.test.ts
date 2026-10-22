import type { SupabaseClient } from "@supabase/supabase-js"
import { afterAll, beforeAll, describe, expect, it } from "vitest"

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

describe("habits and check-ins", () => {
  let alice: TestUser
  let bob: TestUser
  let asAlice: Client
  let asBob: Client
  let today: LocalDate

  // Shared users keep sign-ins low; each test creates its own habits.
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

  async function habit(client: Client, name: string, days_mask = 127) {
    const { data, error } = await client
      .from("habits")
      .insert({ name, days_mask })
      .select()
      .single()
    if (error) throw error
    return data
  }

  it("creates habits with trimmed names and valid schedules", async () => {
    const h = await habit(asAlice, "  Drink water  ", 0b0011111)
    expect(h).toMatchObject({
      name: "Drink water",
      days_mask: 31,
      user_id: alice.id,
    })

    for (const days_mask of [0, 128]) {
      const { error } = await asAlice
        .from("habits")
        .insert({ name: "Bad", days_mask })
      expect(error).not.toBeNull()
    }
    const blank = await asAlice.from("habits").insert({ name: "   " })
    expect(blank.error).not.toBeNull()
  })

  it("checks in once per day, within the last 7 days only", async () => {
    const h = await habit(asAlice, "Read")
    const log = (local_date: string) =>
      asAlice.from("habit_logs").insert({ habit_id: h.id, local_date })

    expect((await log(today)).error).toBeNull()
    expect((await log(today)).error).not.toBeNull() // already checked in
    expect((await log(addDays(today, -7))).error).toBeNull()
    expect((await log(addDays(today, -8))).error).not.toBeNull()
    expect((await log(addDays(today, 1))).error).not.toBeNull()

    // Unticking works for recent days.
    await asAlice
      .from("habit_logs")
      .delete()
      .eq("habit_id", h.id)
      .eq("local_date", today)
    const { count } = await asAlice
      .from("habit_logs")
      .select("*", { count: "exact", head: true })
      .eq("habit_id", h.id)
    expect(count).toBe(1)
  })

  it("refuses check-ins for archived habits but keeps their history", async () => {
    const h = await habit(asAlice, "Old habit")
    await asAlice
      .from("habit_logs")
      .insert({ habit_id: h.id, local_date: today })
    await asAlice
      .from("habits")
      .update({ archived_at: new Date().toISOString() })
      .eq("id", h.id)

    const late = await asAlice
      .from("habit_logs")
      .insert({ habit_id: h.id, local_date: addDays(today, -1) })
    expect(late.error?.message).toMatch(/archived/)

    const { count } = await asAlice
      .from("habit_logs")
      .select("*", { count: "exact", head: true })
      .eq("habit_id", h.id)
    expect(count).toBe(1)
    await asAlice.from("habits").delete().eq("id", h.id) // no hard delete
    const { data } = await asAlice.from("habits").select("id").eq("id", h.id)
    expect(data).toHaveLength(1)
  })

  it("keeps habits private and blocks check-ins on other users' habits", async () => {
    const h = await habit(asAlice, "Private habit")
    const { data: seen } = await asBob
      .from("habits")
      .select("id")
      .eq("id", h.id)
    expect(seen).toEqual([])

    const sneaky = await asBob
      .from("habit_logs")
      .insert({ habit_id: h.id, local_date: today })
    expect(sneaky.error).not.toBeNull()

    const { data: renamed } = await asBob
      .from("habits")
      .update({ name: "Hacked" })
      .eq("id", h.id)
      .select()
    expect(renamed).toEqual([])

    const anon = await anonClient().from("habits").select("*")
    expect(anon.error !== null || anon.data?.length === 0).toBe(true)
  })

  it("is removed completely when the account is deleted", async () => {
    const carol = await createTestUser({ timezone: TZ })
    try {
      const asCarol = await signedInClient(carol)
      const h = await habit(asCarol, "Stretch")
      await asCarol
        .from("habit_logs")
        .insert({ habit_id: h.id, local_date: today })
      expect((await asCarol.rpc("delete_my_account")).error).toBeNull()
      for (const table of ["habits", "habit_logs"] as const) {
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
