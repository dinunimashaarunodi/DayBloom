import type { SupabaseClient } from "@supabase/supabase-js"
import { afterAll, beforeAll, describe, expect, it } from "vitest"

import { occursOn, type RepeatRule } from "@/features/tasks/repeat"
import {
  addDays,
  dayOfWeek,
  todayIn,
  type LocalDate,
} from "@/lib/dates/local-date"
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

describe("repeating tasks", () => {
  let alice: TestUser
  let bob: TestUser
  let asAlice: Client
  let asBob: Client
  let today: LocalDate
  let todayBit: number

  beforeAll(async () => {
    alice = await createTestUser({ timezone: TZ })
    bob = await createTestUser({ timezone: TZ })
    ;[asAlice, asBob] = await Promise.all([
      signedInClient(alice),
      signedInClient(bob),
    ])
    today = todayIn(TZ, new Date())
    todayBit = 1 << dayOfWeek(today)
  })

  afterAll(async () => {
    await Promise.all([deleteTestUser(alice), deleteTestUser(bob)])
  })

  async function series(
    client: Client,
    title: string,
    fields: Partial<Database["public"]["Tables"]["task_series"]["Insert"]> = {},
  ) {
    const { data, error } = await client
      .from("task_series")
      .insert({ title, days_mask: 127, starts_on: today, ...fields })
      .select()
      .single()
    if (error) throw error
    return data
  }

  const occurrences = (client: Client, seriesId: string) =>
    client
      .from("tasks")
      .select("id, title, due_date, occurs_on, deleted_at")
      .eq("series_id", seriesId)

  it("creates today's task once, however often it runs", async () => {
    const s = await series(asAlice, "  Water the plants  ")
    expect(s.title).toBe("Water the plants")
    expect((await asAlice.rpc("ensure_repeating_tasks")).data).toBeGreaterThan(
      0,
    )
    await asAlice.rpc("ensure_repeating_tasks")
    const { data } = await occurrences(asAlice, s.id)
    expect(data).toEqual([
      expect.objectContaining({
        title: "Water the plants",
        due_date: today,
        occurs_on: today,
      }),
    ])
  })

  it("skips days off, stopped, ended and not-yet-started series", async () => {
    const skipped = await Promise.all([
      series(asAlice, "Not today", { days_mask: 127 & ~todayBit }),
      series(asAlice, "Stopped"),
      series(asAlice, "Starts later", { starts_on: addDays(today, 1) }),
      series(asAlice, "Ended", {
        starts_on: addDays(today, -10),
        ends_on: addDays(today, -1),
      }),
    ])
    await asAlice
      .from("task_series")
      .update({ archived_at: new Date().toISOString() })
      .eq("id", skipped[1].id)
    await asAlice.rpc("ensure_repeating_tasks")
    for (const s of skipped) {
      expect((await occurrences(asAlice, s.id)).data).toEqual([])
    }
  })

  it("doesn't recreate today's task after it's moved or deleted", async () => {
    const moved = await series(asAlice, "Moved")
    const removed = await series(asAlice, "Removed")
    await asAlice.rpc("ensure_repeating_tasks")
    const [m, r] = await Promise.all([
      occurrences(asAlice, moved.id),
      occurrences(asAlice, removed.id),
    ])
    await asAlice
      .from("tasks")
      .update({ due_date: addDays(today, 2) })
      .eq("id", m.data![0]!.id)
    await asAlice
      .from("tasks")
      .update({ deleted_at: new Date().toISOString() })
      .eq("id", r.data![0]!.id)

    await asAlice.rpc("ensure_repeating_tasks")
    const after = await occurrences(asAlice, moved.id)
    expect(after.data).toEqual([
      expect.objectContaining({
        due_date: addDays(today, 2),
        occurs_on: today,
      }),
    ])
    expect((await occurrences(asAlice, removed.id)).data).toHaveLength(1)

    // A task's series and scheduled day can't be changed afterwards.
    const { error } = await asAlice
      .from("tasks")
      .update({ occurs_on: addDays(today, 1) } as never)
      .eq("id", m.data![0]!.id)
    expect(error).not.toBeNull()
  })

  it("validates schedules", async () => {
    for (const fields of [
      { days_mask: null, month_day: null },
      { days_mask: 127, month_day: 3 },
      { days_mask: 0 },
      { days_mask: null, month_day: 32 },
      { ends_on: addDays(today, -1) },
    ]) {
      const { error } = await asAlice
        .from("task_series")
        .insert({ title: "Bad", days_mask: 127, starts_on: today, ...fields })
      expect(error).not.toBeNull()
    }
  })

  it("schedules days exactly like the app does", async () => {
    const rules: RepeatRule[] = [
      { days_mask: 0b0010101, month_day: null },
      { days_mask: 0b1100000, month_day: null },
      { days_mask: null, month_day: 31 },
      { days_mask: null, month_day: 29 },
      { days_mask: null, month_day: 1 },
    ]
    // 90 days across month ends, including a leap-year February.
    const days = Array.from({ length: 90 }, (_, i) =>
      addDays("2028-01-15" as LocalDate, i),
    )
    for (const rule of rules) {
      const results = await Promise.all(
        days.map((day) =>
          asAlice.rpc("task_series_occurs_on", {
            days_mask: rule.days_mask as number,
            month_day: rule.month_day as number,
            day,
          }),
        ),
      )
      expect(results.map((r) => r.data)).toEqual(
        days.map((day) => occursOn(rule, day)),
      )
    }
  })

  it("keeps series private", async () => {
    const s = await series(asAlice, "Private routine")
    const { data: seen } = await asBob
      .from("task_series")
      .select("id")
      .eq("id", s.id)
    expect(seen).toEqual([])

    const { data: renamed } = await asBob
      .from("task_series")
      .update({ title: "Hacked" })
      .eq("id", s.id)
      .select()
    expect(renamed).toEqual([])

    // Bob can't attach a task to Alice's series.
    const sneaky = await asBob.from("tasks").insert({
      title: "Sneaky",
      due_date: today,
      series_id: s.id,
      occurs_on: addDays(today, 5),
    })
    expect(sneaky.error).not.toBeNull()

    // Running the job as Bob doesn't touch Alice's series.
    await asBob.rpc("ensure_repeating_tasks")
    const { count } = await adminClient()
      .from("tasks")
      .select("*", { count: "exact", head: true })
      .eq("series_id", s.id)
      .eq("user_id", bob.id)
    expect(count).toBe(0)

    // No hard delete: series are stopped instead.
    await asAlice.from("task_series").delete().eq("id", s.id)
    const { data: still } = await asAlice
      .from("task_series")
      .select("id")
      .eq("id", s.id)
    expect(still).toHaveLength(1)

    const anon = await anonClient().from("task_series").select("*")
    expect(anon.error !== null || anon.data?.length === 0).toBe(true)
  })

  it("is removed completely when the account is deleted", async () => {
    const carol = await createTestUser({ timezone: TZ })
    try {
      const asCarol = await signedInClient(carol)
      await series(asCarol, "Stretch")
      await asCarol.rpc("ensure_repeating_tasks")
      expect((await asCarol.rpc("delete_my_account")).error).toBeNull()
      for (const table of ["task_series", "tasks"] as const) {
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
