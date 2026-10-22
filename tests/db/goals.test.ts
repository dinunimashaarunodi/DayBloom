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
const TZ = "Asia/Colombo"
/** Allowed gap between this machine's clock and the database's. */
const SKEW_MS = 60_000

describe("goals and milestones", () => {
  let alice: TestUser
  let bob: TestUser
  let asAlice: Client
  let asBob: Client

  beforeAll(async () => {
    alice = await createTestUser({ timezone: TZ })
    bob = await createTestUser({ timezone: TZ })
    ;[asAlice, asBob] = await Promise.all([
      signedInClient(alice),
      signedInClient(bob),
    ])
  })

  afterAll(async () => {
    await Promise.all([deleteTestUser(alice), deleteTestUser(bob)])
  })

  async function goal(client: Client, title = "Run a 10K") {
    const { data, error } = await client
      .from("goals")
      .insert({ title })
      .select()
      .single()
    if (error) throw error
    return data
  }

  async function milestone(client: Client, goal_id: string, title = "Step") {
    const { data, error } = await client
      .from("goal_milestones")
      .insert({ goal_id, title })
      .select()
      .single()
    if (error) throw error
    return data
  }

  it("creates goals with trimmed text, active by default", async () => {
    const { data, error } = await asAlice
      .from("goals")
      .insert({ title: "  Learn to swim ", why: "\n  " })
      .select()
      .single()
    expect(error).toBeNull()
    expect(data).toMatchObject({
      title: "Learn to swim",
      why: null,
      status: "active",
      achieved_at: null,
    })
    const blank = await asAlice.from("goals").insert({ title: "  " })
    expect(blank.error).not.toBeNull()
  })

  it("stamps achieved_at itself and keeps the first moment", async () => {
    const g = await goal(asAlice)
    const { data: achieved } = await asAlice
      .from("goals")
      .update({ status: "achieved" })
      .eq("id", g.id)
      .select()
      .single()
    expect(
      Math.abs(Date.parse(achieved!.achieved_at!) - Date.now()),
    ).toBeLessThan(SKEW_MS)

    // Editing an achieved goal keeps when it was achieved.
    const { data: renamed } = await asAlice
      .from("goals")
      .update({ title: "Run a 10K in under an hour" })
      .eq("id", g.id)
      .select()
      .single()
    expect(renamed!.achieved_at).toBe(achieved!.achieved_at)

    // Clients can't set it themselves.
    const forged = await asAlice
      .from("goals")
      .update({ achieved_at: "2020-01-01T00:00:00Z" } as never)
      .eq("id", g.id)
    expect(forged.error).not.toBeNull()

    const { data: reopened } = await asAlice
      .from("goals")
      .update({ status: "active" })
      .eq("id", g.id)
      .select()
      .single()
    expect(reopened!.achieved_at).toBeNull()
  })

  it("never deletes goals (archive instead)", async () => {
    const g = await goal(asAlice, "Keep me")
    await asAlice.from("goals").delete().eq("id", g.id)
    const { data } = await asAlice.from("goals").select("id").eq("id", g.id)
    expect(data).toHaveLength(1)
  })

  it("tracks milestones with database timestamps", async () => {
    const g = await goal(asAlice)
    const m = await milestone(asAlice, g.id, "  Run 5K  ")
    expect(m).toMatchObject({ title: "Run 5K", done: false, done_at: null })

    const { data: ticked } = await asAlice
      .from("goal_milestones")
      .update({ done: true })
      .eq("id", m.id)
      .select()
      .single()
    expect(ticked!.done_at).not.toBeNull()

    const { data: unticked } = await asAlice
      .from("goal_milestones")
      .update({ done: false })
      .eq("id", m.id)
      .select()
      .single()
    expect(unticked!.done_at).toBeNull()

    expect(
      (await asAlice.from("goal_milestones").delete().eq("id", m.id)).error,
    ).toBeNull()
  })

  it("keeps goals and milestones private", async () => {
    const g = await goal(asAlice, "Private goal")
    const m = await milestone(asAlice, g.id)

    const { data: seen } = await asBob.from("goals").select("id").eq("id", g.id)
    expect(seen).toEqual([])
    const { data: seenSteps } = await asBob
      .from("goal_milestones")
      .select("id")
      .eq("goal_id", g.id)
    expect(seenSteps).toEqual([])

    // Bob can't add milestones to Alice's goal (composite foreign key + RLS).
    const sneaky = await asBob
      .from("goal_milestones")
      .insert({ goal_id: g.id, title: "Hacked" })
    expect(sneaky.error).not.toBeNull()

    const { data: changed } = await asBob
      .from("goal_milestones")
      .update({ done: true })
      .eq("id", m.id)
      .select()
    expect(changed).toEqual([])
    await asBob.from("goal_milestones").delete().eq("id", m.id)
    const { count } = await adminClient()
      .from("goal_milestones")
      .select("*", { count: "exact", head: true })
      .eq("id", m.id)
    expect(count).toBe(1)

    const { data: archived } = await asBob
      .from("goals")
      .update({ status: "archived" })
      .eq("id", g.id)
      .select()
    expect(archived).toEqual([])

    for (const table of ["goals", "goal_milestones"] as const) {
      const anon = await anonClient().from(table).select("*")
      expect(anon.error !== null || anon.data?.length === 0).toBe(true)
    }
  })

  it("is removed completely when the account is deleted", async () => {
    const carol = await createTestUser({ timezone: TZ })
    try {
      const asCarol = await signedInClient(carol)
      const g = await goal(asCarol)
      await milestone(asCarol, g.id)
      expect((await asCarol.rpc("delete_my_account")).error).toBeNull()
      for (const table of ["goals", "goal_milestones"] as const) {
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
