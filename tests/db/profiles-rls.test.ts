import { afterAll, beforeAll, describe, expect, it } from "vitest"

import {
  adminClient,
  anonClient,
  createTestUser,
  deleteTestUser,
  signedInClient,
  type TestUser,
} from "../support/supabase"

describe("profiles: signup trigger and RLS", () => {
  let alice: TestUser
  let bob: TestUser

  beforeAll(async () => {
    alice = await createTestUser({
      display_name: "Alice",
      timezone: "Asia/Colombo",
    })
    bob = await createTestUser({ timezone: "Mars/Olympus" })
  })

  afterAll(async () => {
    await Promise.all([deleteTestUser(alice), deleteTestUser(bob)])
  })

  it("creates exactly one profile per new user from signup metadata", async () => {
    const { data } = await adminClient()
      .from("profiles")
      .select("*")
      .in("user_id", [alice.id, bob.id])
    expect(data).toHaveLength(2)
    const a = data!.find((p) => p.user_id === alice.id)!
    const b = data!.find((p) => p.user_id === bob.id)!
    expect(a).toMatchObject({ display_name: "Alice", timezone: "Asia/Colombo" })
    // Invalid timezone from the browser falls back to UTC instead of failing signup.
    expect(b).toMatchObject({ display_name: null, timezone: "UTC" })
  })

  it("lets a user read only their own profile", async () => {
    const client = await signedInClient(alice)
    const { data, error } = await client.from("profiles").select("user_id")
    expect(error).toBeNull()
    expect(data).toEqual([{ user_id: alice.id }])
  })

  it("hides other users' profiles", async () => {
    const client = await signedInClient(bob)
    const { data } = await client
      .from("profiles")
      .select("*")
      .eq("user_id", alice.id)
    expect(data).toEqual([])
  })

  it("prevents updating another user's profile", async () => {
    const client = await signedInClient(bob)
    const { data } = await client
      .from("profiles")
      .update({ display_name: "Hacked" })
      .eq("user_id", alice.id)
      .select()
    expect(data).toEqual([])

    const { data: check } = await adminClient()
      .from("profiles")
      .select("display_name")
      .eq("user_id", alice.id)
      .single()
    expect(check?.display_name).toBe("Alice")
  })

  it("allows updating own editable columns and rejects unknown timezones", async () => {
    const client = await signedInClient(alice)
    const ok = await client
      .from("profiles")
      .update({ display_name: "Alice B", timezone: "Europe/London" })
      .eq("user_id", alice.id)
      .select("display_name, timezone")
      .single()
    expect(ok.error).toBeNull()
    expect(ok.data).toEqual({
      display_name: "Alice B",
      timezone: "Europe/London",
    })

    const bad = await client
      .from("profiles")
      .update({ timezone: "Nowhere/City" })
      .eq("user_id", alice.id)
    expect(bad.error?.message).toMatch(/Unknown timezone/)
  })

  it("blocks changing user_id or inserting/deleting profiles directly", async () => {
    const client = await signedInClient(alice)

    const move = await client
      .from("profiles")
      .update({ user_id: bob.id })
      .eq("user_id", alice.id)
    expect(move.error).not.toBeNull()

    const insert = await client.from("profiles").insert({ user_id: alice.id })
    expect(insert.error).not.toBeNull()

    await client.from("profiles").delete().eq("user_id", alice.id)
    const { count } = await adminClient()
      .from("profiles")
      .select("*", { count: "exact", head: true })
      .eq("user_id", alice.id)
    expect(count).toBe(1)
  })

  it("gives signed-out visitors no access", async () => {
    const { data, error } = await anonClient().from("profiles").select("*")
    // anon has no table privileges at all: either an error or nothing visible.
    expect(error !== null || data?.length === 0).toBe(true)
  })

  it("removes the profile when the auth user is deleted", async () => {
    const temp = await createTestUser()
    await deleteTestUser(temp)
    const { count } = await adminClient()
      .from("profiles")
      .select("*", { count: "exact", head: true })
      .eq("user_id", temp.id)
    expect(count).toBe(0)
  })
})
