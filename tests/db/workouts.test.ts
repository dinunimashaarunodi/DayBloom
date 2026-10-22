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
type NewWorkout = Database["public"]["Tables"]["workouts"]["Insert"]
const TZ = "Asia/Colombo"

describe("workouts", () => {
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

  function log(client: Client, extra: Partial<NewWorkout> = {}) {
    return client
      .from("workouts")
      .insert({
        local_date: today,
        kind: "cardio",
        duration_minutes: 30,
        ...extra,
      })
      .select()
      .single()
  }

  it("logs workouts, treating blank text as none", async () => {
    const { data, error } = await log(asAlice, {
      title: "  ",
      notes: "\n Felt strong \n",
      effort: 2,
    })
    expect(error).toBeNull()
    expect(data).toMatchObject({
      title: null,
      notes: "Felt strong",
      effort: 2,
      user_id: alice.id,
    })
  })

  it("validates kind, duration and effort", async () => {
    for (const bad of [
      { kind: "swimming" },
      { duration_minutes: 0 },
      { duration_minutes: 601 },
      { effort: 4 },
    ]) {
      const { error } = await log(asAlice, bad)
      expect(error).not.toBeNull()
    }
  })

  it("allows past days but never future ones", async () => {
    expect(
      (await log(asAlice, { local_date: addDays(today, -30) })).error,
    ).toBeNull()
    expect(
      (await log(asAlice, { local_date: addDays(today, 1) })).error,
    ).not.toBeNull()

    const { data: w } = await log(asAlice)
    const moved = await asAlice
      .from("workouts")
      .update({ local_date: addDays(today, 1) })
      .eq("id", w!.id)
    expect(moved.error).not.toBeNull()
  })

  it("keeps workouts private", async () => {
    const { data: w } = await log(asAlice, { title: "Private run" })
    const { data: seen } = await asBob
      .from("workouts")
      .select("id")
      .eq("id", w!.id)
    expect(seen).toEqual([])

    const { data: edited } = await asBob
      .from("workouts")
      .update({ duration_minutes: 1 })
      .eq("id", w!.id)
      .select()
    expect(edited).toEqual([])

    await asBob.from("workouts").delete().eq("id", w!.id)
    const { count } = await adminClient()
      .from("workouts")
      .select("*", { count: "exact", head: true })
      .eq("id", w!.id)
    expect(count).toBe(1)

    const planted = await log(asBob, { user_id: alice.id } as never)
    expect(planted.error).not.toBeNull()

    const anon = await anonClient().from("workouts").select("*")
    expect(anon.error !== null || anon.data?.length === 0).toBe(true)
  })

  it("deletes for real, and everything goes with the account", async () => {
    const { data: w } = await log(asAlice)
    await asAlice.from("workouts").delete().eq("id", w!.id)
    const { count } = await adminClient()
      .from("workouts")
      .select("*", { count: "exact", head: true })
      .eq("id", w!.id)
    expect(count).toBe(0)

    const carol = await createTestUser({ timezone: TZ })
    try {
      const asCarol = await signedInClient(carol)
      expect((await log(asCarol)).error).toBeNull()
      expect((await asCarol.rpc("delete_my_account")).error).toBeNull()
      const { count: left } = await adminClient()
        .from("workouts")
        .select("*", { count: "exact", head: true })
        .eq("user_id", carol.id)
      expect(left).toBe(0)
    } finally {
      await deleteTestUser(carol)
    }
  })
})
