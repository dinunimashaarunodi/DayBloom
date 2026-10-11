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

describe("tasks: RLS, trigger rules and helpers", () => {
  let alice: TestUser
  let bob: TestUser
  let asAlice: Client
  let asBob: Client

  beforeAll(async () => {
    alice = await createTestUser({ timezone: "Asia/Colombo" })
    bob = await createTestUser({ timezone: "America/New_York" })
    ;[asAlice, asBob] = await Promise.all([
      signedInClient(alice),
      signedInClient(bob),
    ])
  })

  afterAll(async () => {
    await Promise.all([deleteTestUser(alice), deleteTestUser(bob)])
  })

  async function createTask(
    client: Client,
    fields: { title: string; due_date?: string | null },
  ) {
    const { data, error } = await client
      .from("tasks")
      .insert(fields)
      .select()
      .single()
    if (error) throw error
    return data
  }

  describe("isolation between users", () => {
    it("keeps each user's tasks private", async () => {
      const task = await createTask(asAlice, { title: "Alice's secret" })

      const { data: visible } = await asBob
        .from("tasks")
        .select("id")
        .eq("id", task.id)
      expect(visible).toEqual([])

      const { data: updated } = await asBob
        .from("tasks")
        .update({ title: "Hacked" })
        .eq("id", task.id)
        .select()
      expect(updated).toEqual([])

      const { data: check } = await adminClient()
        .from("tasks")
        .select("title")
        .eq("id", task.id)
        .single()
      expect(check?.title).toBe("Alice's secret")
    })

    it("stamps new tasks with the caller's id and rejects someone else's", async () => {
      const task = await createTask(asBob, { title: "Mine" })
      expect(task.user_id).toBe(bob.id)

      const { error } = await asBob
        .from("tasks")
        .insert({ title: "Planted", user_id: alice.id } as never)
      expect(error).not.toBeNull()
    })

    it("gives signed-out visitors nothing", async () => {
      const { data, error } = await anonClient().from("tasks").select("*")
      expect(error !== null || data?.length === 0).toBe(true)
    })

    it("does not allow hard deletes (soft delete only)", async () => {
      const task = await createTask(asAlice, { title: "Keep me" })
      await asAlice.from("tasks").delete().eq("id", task.id)
      const { count } = await adminClient()
        .from("tasks")
        .select("*", { count: "exact", head: true })
        .eq("id", task.id)
      expect(count).toBe(1)
    })
  })

  describe("server-maintained fields", () => {
    it("trims titles and rejects blank or very long ones", async () => {
      const task = await createTask(asAlice, { title: "  Water plants  " })
      expect(task.title).toBe("Water plants")

      const blank = await asAlice.from("tasks").insert({ title: "   " })
      expect(blank.error).not.toBeNull()
      const long = await asAlice
        .from("tasks")
        .insert({ title: "x".repeat(201) })
      expect(long.error).not.toBeNull()
    })

    it("sets completed_at when done and clears it when reopened", async () => {
      const task = await createTask(asAlice, { title: "Finish report" })
      expect(task.completed_at).toBeNull()

      const done = await asAlice
        .from("tasks")
        .update({ status: "done" })
        .eq("id", task.id)
        .select()
        .single()
      expect(done.data?.completed_at).not.toBeNull()

      // Editing a done task keeps the original completion time.
      const edited = await asAlice
        .from("tasks")
        .update({ title: "Finish the report" })
        .eq("id", task.id)
        .select()
        .single()
      expect(edited.data?.completed_at).toBe(done.data?.completed_at)

      const reopened = await asAlice
        .from("tasks")
        .update({ status: "todo" })
        .eq("id", task.id)
        .select()
        .single()
      expect(reopened.data?.completed_at).toBeNull()
    })

    it("does not let clients write completed_at or times_moved directly", async () => {
      const task = await createTask(asAlice, { title: "No tampering" })
      const a = await asAlice
        .from("tasks")
        .update({ times_moved: 0 } as never)
        .eq("id", task.id)
      expect(a.error).not.toBeNull()
      const b = await asAlice
        .from("tasks")
        .update({ completed_at: new Date().toISOString() } as never)
        .eq("id", task.id)
      expect(b.error).not.toBeNull()
    })

    it("counts postponements, not other date changes", async () => {
      const task = await createTask(asAlice, {
        title: "Call the bank",
        due_date: "2026-10-12",
      })
      const move = async (due_date: string | null) => {
        const { data, error } = await asAlice
          .from("tasks")
          .update({ due_date })
          .eq("id", task.id)
          .select("times_moved")
          .single()
        if (error) throw error
        return data.times_moved
      }

      expect(await move("2026-10-13")).toBe(1) // later: postponed
      expect(await move("2026-10-11")).toBe(1) // earlier: not a postponement
      expect(await move(null)).toBe(2) // date removed: postponed indefinitely
      expect(await move("2026-10-20")).toBe(2) // undated -> dated: planning, not postponing
    })

    it("doesn't count date changes on finished tasks", async () => {
      const task = await createTask(asAlice, {
        title: "Already done",
        due_date: "2026-10-12",
      })
      await asAlice.from("tasks").update({ status: "done" }).eq("id", task.id)
      const { data } = await asAlice
        .from("tasks")
        .update({ due_date: "2026-10-30" })
        .eq("id", task.id)
        .select("times_moved")
        .single()
      expect(data?.times_moved).toBe(0)
    })
  })

  describe("reorder_tasks", () => {
    it("orders the caller's tasks and ignores other users' ids", async () => {
      const [a, b, c] = await Promise.all(
        ["A", "B", "C"].map((title) =>
          createTask(asBob, { title, due_date: "2030-01-01" }),
        ),
      )
      const intruder = await createTask(asAlice, {
        title: "Alice's",
        due_date: "2030-01-01",
      })

      const { error } = await asBob.rpc("reorder_tasks", {
        task_ids: [c.id, intruder.id, a.id, b.id],
      })
      expect(error).toBeNull()

      const { data } = await asBob
        .from("tasks")
        .select("title")
        .in("id", [a.id, b.id, c.id])
        .order("position")
      expect(data?.map((t) => t.title)).toEqual(["C", "A", "B"])

      const { data: untouched } = await adminClient()
        .from("tasks")
        .select("position")
        .eq("id", intruder.id)
        .single()
      expect(untouched?.position).toBe(intruder.position)
    })
  })

  describe("current_local_date", () => {
    // Postgres and the app must agree on "today" for every timezone.
    it.each([
      "Asia/Colombo",
      "America/New_York",
      "Pacific/Kiritimati",
      "Pacific/Pago_Pago",
      "UTC",
    ])("matches todayIn() for %s", async (tz) => {
      await asAlice
        .from("profiles")
        .update({ timezone: tz })
        .eq("user_id", alice.id)
      const before = todayIn(tz, new Date())
      const { data, error } = await asAlice.rpc("current_local_date")
      const after = todayIn(tz, new Date())
      expect(error).toBeNull()
      // Allows for the clock ticking past midnight during the request.
      expect([before, after]).toContain(data)
    })

    it("returns null for signed-out callers", async () => {
      const { data } = await anonClient().rpc("current_local_date")
      expect(data ?? null).toBeNull()
    })

    it("differs between users on opposite sides of the date line", async () => {
      await asAlice
        .from("profiles")
        .update({ timezone: "Pacific/Kiritimati" })
        .eq("user_id", alice.id) // UTC+14
      await asBob
        .from("profiles")
        .update({ timezone: "Pacific/Pago_Pago" })
        .eq("user_id", bob.id) // UTC-11
      const [{ data: a }, { data: b }] = await Promise.all([
        asAlice.rpc("current_local_date"),
        asBob.rpc("current_local_date"),
      ])
      // 25 hours apart: always one or two calendar days apart, never the same day.
      expect(a).not.toBe(b)
      expect([
        addDays(b as LocalDate, 1),
        addDays(b as LocalDate, 2),
      ]).toContain(a)
    })
  })
})
