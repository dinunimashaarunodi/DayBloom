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
type EventInsert = Database["public"]["Tables"]["events"]["Insert"]

const timed = {
  title: "Dentist",
  all_day: false,
  starts_at: "2026-10-14T04:30:00Z",
  ends_at: "2026-10-14T05:00:00Z",
}
const allDay = {
  title: "Trip",
  all_day: true,
  start_date: "2026-10-14",
  end_date: "2026-10-16",
}

describe("events: RLS and shape rules", () => {
  let alice: TestUser
  let bob: TestUser
  let asAlice: Client
  let asBob: Client

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

  async function create(client: Client, fields: EventInsert) {
    const { data, error } = await client
      .from("events")
      .insert(fields)
      .select()
      .single()
    if (error) throw error
    return data
  }

  it("keeps each user's events private", async () => {
    const event = await create(asAlice, timed)
    expect(event.user_id).toBe(alice.id)

    const { data: visible } = await asBob
      .from("events")
      .select("id")
      .eq("id", event.id)
    expect(visible).toEqual([])

    const { data: updated } = await asBob
      .from("events")
      .update({ title: "Hacked" })
      .eq("id", event.id)
      .select()
    expect(updated).toEqual([])

    const planted = await asBob
      .from("events")
      .insert({ ...timed, user_id: alice.id } as never)
    expect(planted.error).not.toBeNull()

    const { data, error } = await anonClient().from("events").select("*")
    expect(error !== null || data?.length === 0).toBe(true)
  })

  it("accepts the two valid shapes and trims titles", async () => {
    const a = await create(asAlice, { ...timed, title: "  Standup  " })
    expect(a.title).toBe("Standup")
    const b = await create(asAlice, allDay)
    expect(b).toMatchObject({
      start_date: "2026-10-14",
      end_date: "2026-10-16",
      starts_at: null,
    })
  })

  it.each([
    ["timed event without an end", { ...timed, ends_at: null }],
    [
      "timed event ending before it starts",
      { ...timed, ends_at: "2026-10-14T04:00:00Z" },
    ],
    [
      "timed event longer than a week",
      { ...timed, ends_at: "2026-10-22T04:30:00Z" },
    ],
    ["timed event that also has dates", { ...timed, start_date: "2026-10-14" }],
    ["all-day event without dates", { title: "X", all_day: true }],
    [
      "all-day event ending before it starts",
      { ...allDay, end_date: "2026-10-13" },
    ],
    [
      "all-day event that also has times",
      { ...allDay, starts_at: timed.starts_at },
    ],
    ["all-day event longer than a year", { ...allDay, end_date: "2027-10-15" }],
    ["blank title", { ...timed, title: "   " }],
  ])("rejects a %s", async (_label, fields) => {
    const { error } = await asAlice.from("events").insert(fields as EventInsert)
    expect(error).not.toBeNull()
  })

  it("soft-deletes only (no hard delete)", async () => {
    const event = await create(asAlice, timed)
    await asAlice.from("events").delete().eq("id", event.id)
    const { count } = await adminClient()
      .from("events")
      .select("*", { count: "exact", head: true })
      .eq("id", event.id)
    expect(count).toBe(1)

    const { error } = await asAlice
      .from("events")
      .update({ deleted_at: new Date().toISOString() })
      .eq("id", event.id)
    expect(error).toBeNull()
  })

  it("does not let clients change ownership", async () => {
    const event = await create(asAlice, timed)
    const { error } = await asAlice
      .from("events")
      .update({ user_id: bob.id } as never)
      .eq("id", event.id)
    expect(error).not.toBeNull()
  })
})
