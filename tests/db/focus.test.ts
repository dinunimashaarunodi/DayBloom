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

describe("focus sessions", () => {
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

  async function start(client: Client, planned_minutes = 25, label?: string) {
    const { data, error } = await client
      .from("focus_sessions")
      .insert({ planned_minutes, label })
      .select()
      .single()
    if (error) throw error
    return data
  }

  it("uses the database clock for the start time", async () => {
    const s = await start(asAlice, 25, "  Essay  ")
    expect(s.label).toBe("Essay")
    expect(s.ended_at).toBeNull()
    expect(Math.abs(Date.parse(s.started_at) - Date.now())).toBeLessThan(
      SKEW_MS,
    )

    // Clients can't choose or change the start time.
    const backdated = await asAlice
      .from("focus_sessions")
      .update({ started_at: "2020-01-01T00:00:00Z" } as never)
      .eq("id", s.id)
    expect(backdated.error).not.toBeNull()
  })

  it("stamps the end time itself, and an ended session stays ended", async () => {
    const s = await start(asAlice, 25)
    const { data: ended } = await asAlice
      .from("focus_sessions")
      .update({ ended_at: "2099-01-01T00:00:00Z" })
      .eq("id", s.id)
      .select()
      .single()
    // Not the client's value: now (capped at the planned end).
    expect(Date.parse(ended!.ended_at!)).toBeLessThan(
      Date.parse(s.started_at) + 25 * 60_000 + 1,
    )
    expect(Math.abs(Date.parse(ended!.ended_at!) - Date.now())).toBeLessThan(
      SKEW_MS,
    )

    const { data: reopened } = await asAlice
      .from("focus_sessions")
      .update({ ended_at: null })
      .eq("id", s.id)
      .select()
      .single()
    expect(reopened!.ended_at).toBe(ended!.ended_at)
  })

  it("caps a late end at the planned end", async () => {
    // Start times can't be backdated (even by the admin, the trigger stamps
    // now()), so let a 1-minute session run out.
    const short = await start(asAlice, 1)
    await new Promise((resolve) => setTimeout(resolve, 62_000))
    const { data: ended } = await asAlice
      .from("focus_sessions")
      .update({ ended_at: new Date().toISOString() })
      .eq("id", short.id)
      .select()
      .single()
    expect(Date.parse(ended!.ended_at!)).toBe(
      Date.parse(short.started_at) + 60_000,
    )
  }, 90_000)

  it("keeps one open session: starting another closes the previous one", async () => {
    const first = await start(asAlice, 45)
    const second = await start(asAlice, 15)
    const { data } = await asAlice
      .from("focus_sessions")
      .select("id, ended_at")
      .in("id", [first.id, second.id])
    const byId = Object.fromEntries(data!.map((r) => [r.id, r.ended_at]))
    expect(byId[first.id]).not.toBeNull()
    expect(byId[second.id]).toBeNull()
  })

  it("validates lengths", async () => {
    for (const planned_minutes of [0, 241]) {
      const { error } = await asAlice
        .from("focus_sessions")
        .insert({ planned_minutes })
      expect(error).not.toBeNull()
    }
  })

  it("keeps sessions private", async () => {
    const s = await start(asAlice, 25, "Private")
    const { data: seen } = await asBob
      .from("focus_sessions")
      .select("id")
      .eq("id", s.id)
    expect(seen).toEqual([])

    const { data: ended } = await asBob
      .from("focus_sessions")
      .update({ ended_at: new Date().toISOString() })
      .eq("id", s.id)
      .select()
    expect(ended).toEqual([])

    await asBob.from("focus_sessions").delete().eq("id", s.id)
    const { count } = await adminClient()
      .from("focus_sessions")
      .select("*", { count: "exact", head: true })
      .eq("id", s.id)
    expect(count).toBe(1)

    // Bob starting a session doesn't close Alice's.
    await start(asBob, 25)
    const { data: still } = await adminClient()
      .from("focus_sessions")
      .select("ended_at")
      .eq("id", s.id)
      .single()
    expect(still!.ended_at).toBeNull()

    const anon = await anonClient().from("focus_sessions").select("*")
    expect(anon.error !== null || anon.data?.length === 0).toBe(true)
  })

  it("can delete a session, and all are removed with the account", async () => {
    const s = await start(asAlice, 25)
    await asAlice.from("focus_sessions").delete().eq("id", s.id)
    const { count } = await adminClient()
      .from("focus_sessions")
      .select("*", { count: "exact", head: true })
      .eq("id", s.id)
    expect(count).toBe(0)

    const carol = await createTestUser({ timezone: TZ })
    try {
      const asCarol = await signedInClient(carol)
      await start(asCarol, 25)
      expect((await asCarol.rpc("delete_my_account")).error).toBeNull()
      const { count: left } = await adminClient()
        .from("focus_sessions")
        .select("*", { count: "exact", head: true })
        .eq("user_id", carol.id)
      expect(left).toBe(0)
    } finally {
      await deleteTestUser(carol)
    }
  })
})
