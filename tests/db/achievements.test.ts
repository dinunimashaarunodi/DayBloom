import type { SupabaseClient } from "@supabase/supabase-js"
import { afterAll, beforeAll, describe, expect, it } from "vitest"

import { ACHIEVEMENTS } from "@/features/achievements/definitions"
import { todayIn } from "@/lib/dates/local-date"
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

describe("achievements", () => {
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

  async function progress(client: Client) {
    const { data, error } = await client.rpc("my_achievements")
    if (error) throw error
    return Object.fromEntries(data.map((r) => [r.code, r]))
  }

  it("returns every achievement the app has copy for, and nothing else", async () => {
    const rows = await progress(asAlice)
    expect(Object.keys(rows).sort()).toEqual(Object.keys(ACHIEVEMENTS).sort())
    expect(rows.first_task).toEqual({
      code: "first_task",
      progress: 0,
      target: 1,
    })
  })

  it("counts only the caller's own data, capped at the target", async () => {
    const admin = adminClient()
    const today = todayIn(TZ, new Date())
    // Alice: 2 finished tasks (one deleted, which doesn't count), 1 workout.
    // Every row needs the same keys: a bulk insert sends missing ones as null.
    const deleted = new Date().toISOString()
    const tasks = await admin.from("tasks").insert([
      { user_id: alice.id, title: "A", status: "done", deleted_at: null },
      { user_id: alice.id, title: "B", status: "done", deleted_at: null },
      { user_id: alice.id, title: "C", status: "done", deleted_at: deleted },
      { user_id: alice.id, title: "D", status: "todo", deleted_at: null },
    ])
    expect(tasks.error).toBeNull()
    const workout = await admin.from("workouts").insert({
      user_id: alice.id,
      local_date: today,
      kind: "walk",
      duration_minutes: 30,
    })
    expect(workout.error).toBeNull()
    // Bob's data never shows up for Alice.
    const entry = await admin
      .from("journal_entries")
      .insert({ user_id: bob.id, local_date: today, body: "Bob's" })
    expect(entry.error).toBeNull()

    const rows = await progress(asAlice)
    expect(rows.first_task!.progress).toBe(1) // capped at the target
    expect(rows.tasks_25!.progress).toBe(2)
    expect(rows.first_workout!.progress).toBe(1)
    expect(rows.first_entry!.progress).toBe(0)
    expect((await progress(asBob)).first_entry!.progress).toBe(1)
  })

  it("remembers seen achievements privately, once per code", async () => {
    const seen = await asAlice
      .from("achievement_seen")
      .upsert([{ code: "first_task" }], {
        onConflict: "user_id,code",
        ignoreDuplicates: true,
      })
    expect(seen.error).toBeNull()
    // Again is a no-op.
    const again = await asAlice
      .from("achievement_seen")
      .upsert([{ code: "first_task" }], {
        onConflict: "user_id,code",
        ignoreDuplicates: true,
      })
    expect(again.error).toBeNull()

    const bad = await asAlice
      .from("achievement_seen")
      .insert({ code: "Not A Code!" })
    expect(bad.error).not.toBeNull()

    const { data: bobSees } = await asBob
      .from("achievement_seen")
      .select("code")
      .eq("user_id", alice.id)
    expect(bobSees).toEqual([])

    const anon = await anonClient().from("achievement_seen").select("*")
    expect(anon.error !== null || anon.data?.length === 0).toBe(true)
    const anonRpc = await anonClient().rpc("my_achievements")
    expect(anonRpc.error !== null || anonRpc.data?.length === 0).toBe(true)
  })

  it("is removed when the account is deleted", async () => {
    const carol = await createTestUser({ timezone: TZ })
    try {
      const asCarol = await signedInClient(carol)
      await asCarol.from("achievement_seen").insert({ code: "first_task" })
      expect((await asCarol.rpc("delete_my_account")).error).toBeNull()
      const { count } = await adminClient()
        .from("achievement_seen")
        .select("*", { count: "exact", head: true })
        .eq("user_id", carol.id)
      expect(count).toBe(0)
    } finally {
      await deleteTestUser(carol)
    }
  })
})
