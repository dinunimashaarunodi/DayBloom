import { afterEach, describe, expect, it } from "vitest"

import {
  adminClient,
  anonClient,
  createTestUser,
  deleteTestUser,
  signedInClient,
  type TestUser,
} from "../support/supabase"

describe("delete_my_account", () => {
  const users: TestUser[] = []

  afterEach(async () => {
    // Already-deleted users are fine to delete again.
    await Promise.all(users.splice(0).map((u) => deleteTestUser(u)))
  })

  async function countRows(
    table: "profiles" | "tasks" | "events" | "days",
    userId: string,
  ) {
    const { count } = await adminClient()
      .from(table)
      .select("*", { count: "exact", head: true })
      .eq("user_id", userId)
    return count
  }

  it("deletes the caller's account and all of their data, and nobody else's", async () => {
    const alice = await createTestUser({ timezone: "Asia/Colombo" })
    const bob = await createTestUser({ timezone: "Asia/Colombo" })
    users.push(alice, bob)
    const [asAlice, asBob] = await Promise.all([
      signedInClient(alice),
      signedInClient(bob),
    ])

    await asAlice.from("tasks").insert({ title: "Alice's task" })
    await asAlice.from("events").insert({
      title: "Alice's event",
      all_day: true,
      start_date: "2026-10-20",
      end_date: "2026-10-20",
    })
    await asAlice.rpc("save_day_review", {
      p_date: await today(asAlice),
      p_mood: 4,
      p_energy: 3,
      p_wins: "x",
      p_reflection: "y",
    })
    await asBob.from("tasks").insert({ title: "Bob's task" })

    const { error } = await asAlice.rpc("delete_my_account")
    expect(error).toBeNull()

    const { data: gone } = await adminClient().auth.admin.getUserById(alice.id)
    expect(gone.user).toBeNull()
    for (const table of ["profiles", "tasks", "events", "days"] as const) {
      expect(await countRows(table, alice.id)).toBe(0)
    }

    // Bob is untouched.
    expect(await countRows("tasks", bob.id)).toBe(1)
    const { data: stillThere } = await adminClient().auth.admin.getUserById(
      bob.id,
    )
    expect(stillThere.user?.id).toBe(bob.id)
  })

  it("refuses signed-out callers", async () => {
    const { error } = await anonClient().rpc("delete_my_account")
    expect(error).not.toBeNull()
  })
})

/** The user's current local date, from the database (same as the app). */
async function today(client: Awaited<ReturnType<typeof signedInClient>>) {
  const { data } = await client.rpc("current_local_date")
  return data as string
}
