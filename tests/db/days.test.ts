import type { SupabaseClient } from "@supabase/supabase-js"
import { afterEach, beforeEach, describe, expect, it } from "vitest"

import { addDays, todayIn, type LocalDate } from "@/lib/dates/local-date"
import type { Database } from "@/types/database"

import {
  adminClient,
  createTestUser,
  deleteTestUser,
  signedInClient,
  type TestUser,
} from "../support/supabase"

type Client = SupabaseClient<Database>
const TZ = "Asia/Colombo"

type Summary = {
  planned: { id: string; title: string; status: string }[]
  completed: { id: string; title: string }[]
  events: { title: string }[]
}

describe("days: closing, snapshots and reviews", () => {
  let alice: TestUser
  let bob: TestUser
  let asAlice: Client
  let asBob: Client
  let today: LocalDate

  beforeEach(async () => {
    alice = await createTestUser({ timezone: TZ })
    bob = await createTestUser({ timezone: TZ })
    ;[asAlice, asBob] = await Promise.all([
      signedInClient(alice),
      signedInClient(bob),
    ])
    today = todayIn(TZ, new Date())
  })

  afterEach(async () => {
    await Promise.all([deleteTestUser(alice), deleteTestUser(bob)])
  })

  async function closePastDays(client: Client) {
    const { data, error } = await client.rpc("close_past_days")
    if (error) throw error
    return data
  }

  async function getDay(client: Client, date: string) {
    const { data } = await client
      .from("days")
      .select("*")
      .eq("local_date", date)
      .maybeSingle()
    return data
  }

  it("closes past days with a frozen snapshot, never touching the tasks", async () => {
    const yesterday = addDays(today, -1)
    const { data: tasks } = await asAlice
      .from("tasks")
      .insert([
        { title: "Unfinished", due_date: yesterday },
        { title: "Let go", due_date: yesterday },
        { title: "Finished late", due_date: yesterday },
        { title: "Today's task", due_date: today },
      ])
      .select()
    const byTitle = Object.fromEntries(tasks!.map((t) => [t.title, t]))
    await asAlice
      .from("tasks")
      .update({ status: "dropped" })
      .eq("id", byTitle["Let go"].id)
    // Completed now (today), after its day had ended.
    await asAlice
      .from("tasks")
      .update({ status: "done" })
      .eq("id", byTitle["Finished late"].id)
    await asAlice.from("events").insert({
      title: "All-day yesterday",
      all_day: true,
      start_date: yesterday,
      end_date: yesterday,
    })

    expect(await closePastDays(asAlice)).toBe(1)

    const day = await getDay(asAlice, yesterday)
    expect(day?.status).toBe("closed")
    const summary = day!.summary as unknown as Summary
    expect(summary.planned.map((t) => [t.title, t.status])).toEqual([
      ["Unfinished", "unfinished"],
      ["Let go", "dropped"],
      ["Finished late", "unfinished"], // it wasn't done by the end of that day
    ])
    expect(summary.events.map((e) => e.title)).toEqual(["All-day yesterday"])
    // Finished today, so it is not counted as completed on the closed day.
    expect(summary.completed).toEqual([])

    // Today is not closed, and unfinished tasks were not moved.
    expect(await getDay(asAlice, today)).toBeNull()
    const { data: still } = await asAlice
      .from("tasks")
      .select("due_date, status, times_moved")
      .eq("id", byTitle["Unfinished"].id)
      .single()
    expect(still).toEqual({
      due_date: yesterday,
      status: "todo",
      times_moved: 0,
    })
  })

  it("is idempotent and the snapshot doesn't change when tasks are edited later", async () => {
    const day = addDays(today, -3)
    const { data: task } = await asAlice
      .from("tasks")
      .insert({ title: "Original title", due_date: day })
      .select()
      .single()

    expect(await closePastDays(asAlice)).toBe(1)
    const before = await getDay(asAlice, day)

    await asAlice
      .from("tasks")
      .update({ title: "Renamed", status: "done" })
      .eq("id", task!.id)
    expect(await closePastDays(asAlice)).toBe(0)

    const after = await getDay(asAlice, day)
    expect(after?.summary).toEqual(before?.summary)
    expect(after?.closed_at).toBe(before?.closed_at)
    expect((after!.summary as unknown as Summary).planned[0]).toMatchObject({
      title: "Original title",
      status: "unfinished",
    })
  })

  it("only closes the caller's own days and keeps them private", async () => {
    await asAlice
      .from("tasks")
      .insert({ title: "Alice's", due_date: addDays(today, -1) })
    expect(await closePastDays(asBob)).toBe(0)
    expect(await closePastDays(asAlice)).toBe(1)

    const { data } = await asBob.from("days").select("id")
    expect(data).toEqual([])
  })

  describe("reviews", () => {
    const review = (date: string, mood = 4) => ({
      p_date: date,
      p_mood: mood,
      p_energy: 3,
      p_wins: "  Went for a walk  ",
      p_reflection: "",
    })

    it("saves and updates today's review, trimming text", async () => {
      expect(
        (await asAlice.rpc("save_day_review", review(today))).error,
      ).toBeNull()
      expect(
        (await asAlice.rpc("save_day_review", review(today, 5))).error,
      ).toBeNull()
      const day = await getDay(asAlice, today)
      expect(day).toMatchObject({
        status: "open",
        mood: 5,
        energy: 3,
        wins: "Went for a walk",
        reflection: null,
      })
      expect(day?.reviewed_at).not.toBeNull()
    })

    it("keeps the review when the day closes, and allows edits for a week", async () => {
      const yesterday = addDays(today, -1)
      await asAlice.rpc("save_day_review", review(yesterday))
      await closePastDays(asAlice)
      expect(await getDay(asAlice, yesterday)).toMatchObject({
        status: "closed",
        mood: 4,
      })

      expect(
        (await asAlice.rpc("save_day_review", review(yesterday, 2))).error,
      ).toBeNull()
      expect((await getDay(asAlice, yesterday))?.mood).toBe(2)
    })

    it("rejects reviews outside the last 7 days, invalid values, and snapshot writes", async () => {
      expect(
        (await asAlice.rpc("save_day_review", review(addDays(today, 1)))).error,
      ).not.toBeNull()
      expect(
        (await asAlice.rpc("save_day_review", review(addDays(today, -8))))
          .error,
      ).not.toBeNull()
      expect(
        (await asAlice.rpc("save_day_review", review(today, 6))).error,
      ).not.toBeNull()

      await asAlice.rpc("save_day_review", review(today))
      const forged = await asAlice
        .from("days")
        .update({ status: "closed", summary: {} } as never)
        .eq("local_date", today)
      expect(forged.error).not.toBeNull()
    })

    it("can't touch another user's day", async () => {
      await asAlice.rpc("save_day_review", review(today))
      const { data } = await asBob
        .from("days")
        .update({ mood: 1 })
        .eq("user_id", alice.id)
        .select()
      expect(data).toEqual([])
      const { data: check } = await adminClient()
        .from("days")
        .select("mood")
        .eq("user_id", alice.id)
        .single()
      expect(check?.mood).toBe(4)
    })
  })
})
