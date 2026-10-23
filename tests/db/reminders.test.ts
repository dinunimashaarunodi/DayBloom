import type { SupabaseClient } from "@supabase/supabase-js"
import { afterAll, beforeAll, describe, expect, it } from "vitest"

import { toLocalTime, todayIn, type LocalDate } from "@/lib/dates/local-date"
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

/**
 * A timezone where it's currently between 03:00 and 21:00, so "a few minutes
 * ago" and "three hours ago" are both on today's local date.
 */
function daytimeZone(): string {
  const zones = [
    "Asia/Colombo",
    "Europe/London",
    "America/New_York",
    "Pacific/Auckland",
    "Asia/Tokyo",
  ]
  return zones.find((tz) => {
    const hour = Number(toLocalTime(new Date(), tz).slice(0, 2))
    return hour >= 3 && hour < 21
  })!
}

/** Local "HH:MM" for `minutes` ago in `tz`. */
function minutesAgo(minutes: number, tz: string): string {
  return toLocalTime(new Date(Date.now() - minutes * 60_000), tz)
}

const endpoint = (name: string) =>
  `https://push.example.com/${name}-${Date.now()}`

describe("reminders", () => {
  const TZ = daytimeZone()
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

  /** Claims due reminders (as the Edge Function does) for these users only. */
  async function claim(...users: TestUser[]) {
    const { data, error } = await adminClient().rpc("claim_due_reminders")
    if (error) throw error
    const ids = users.map((u) => u.id)
    return data.filter((row) => ids.includes(row.user_id))
  }

  async function subscribe(client: Client, url: string) {
    const { error } = await client
      .from("push_subscriptions")
      .insert({ endpoint: url, p256dh: "key", auth: "secret" })
    if (error) throw error
  }

  it("sends a due morning reminder once, with today's task count", async () => {
    await subscribe(asAlice, endpoint("alice"))
    const { error } = await asAlice.from("reminder_settings").insert({
      morning_enabled: true,
      morning_time: minutesAgo(10, TZ),
    })
    expect(error).toBeNull()
    await adminClient()
      .from("tasks")
      .insert([
        { user_id: alice.id, title: "A", due_date: today, status: "todo" },
        { user_id: alice.id, title: "B", due_date: today, status: "todo" },
        { user_id: alice.id, title: "C", due_date: today, status: "done" },
      ])

    const first = await claim(alice)
    expect(first).toEqual([
      expect.objectContaining({
        kind: "morning",
        title: "Good morning",
        body: "You have 2 tasks planned today.",
        url: "/today",
      }),
    ])
    // Claimed: the next run (5 minutes later) doesn't send it again.
    expect(await claim(alice)).toEqual([])
  })

  it("skips reminders more than two hours late, and disabled ones", async () => {
    const carol = await createTestUser({ timezone: TZ })
    try {
      const asCarol = await signedInClient(carol)
      await subscribe(asCarol, endpoint("carol"))
      await asCarol.from("reminder_settings").insert({
        morning_enabled: true,
        morning_time: minutesAgo(150, TZ),
        evening_enabled: false,
        evening_time: minutesAgo(5, TZ),
      })
      expect(await claim(carol)).toEqual([])
    } finally {
      await deleteTestUser(carol)
    }
  })

  it("only invites a reflection when the day isn't reflected on yet", async () => {
    await subscribe(asBob, endpoint("bob"))
    await asBob.from("reminder_settings").insert({
      evening_enabled: true,
      evening_time: minutesAgo(5, TZ),
    })
    await asBob.rpc("save_day_review", {
      p_date: today,
      p_mood: 4,
      p_energy: 3,
      p_wins: "A good walk",
      p_reflection: "",
    })
    expect(await claim(bob)).toEqual([])
  })

  it("sends a shared device's reminders to whoever subscribed it last", async () => {
    const dave = await createTestUser({ timezone: TZ })
    const erin = await createTestUser({ timezone: TZ })
    try {
      const [asDave, asErin] = await Promise.all([
        signedInClient(dave),
        signedInClient(erin),
      ])
      const shared = endpoint("shared")
      for (const client of [asDave, asErin]) {
        await subscribe(client, shared)
        await client.from("reminder_settings").insert({
          morning_enabled: true,
          morning_time: minutesAgo(3, TZ),
        })
      }
      const rows = await claim(dave, erin)
      expect(rows.map((r) => r.user_id)).toEqual([erin.id])
    } finally {
      await Promise.all([deleteTestUser(dave), deleteTestUser(erin)])
    }
  })

  it("keeps settings and devices private and server-controlled", async () => {
    const { data: settings } = await asBob
      .from("reminder_settings")
      .select("*")
      .eq("user_id", alice.id)
    expect(settings).toEqual([])
    const { data: devices } = await asBob
      .from("push_subscriptions")
      .select("*")
      .eq("user_id", alice.id)
    expect(devices).toEqual([])

    // Only the server marks reminders as sent.
    const forged = await asAlice
      .from("reminder_settings")
      .update({ last_morning_on: null } as never)
      .eq("user_id", alice.id)
    expect(forged.error).not.toBeNull()

    // Signed-in users and visitors can't claim (or read) anyone's reminders.
    expect((await asAlice.rpc("claim_due_reminders")).error).not.toBeNull()
    expect((await anonClient().rpc("claim_due_reminders")).error).not.toBeNull()
    for (const table of ["reminder_settings", "push_subscriptions"] as const) {
      const anon = await anonClient().from(table).select("*")
      expect(anon.error !== null || anon.data?.length === 0).toBe(true)
    }

    // Only https endpoints.
    const bad = await asAlice
      .from("push_subscriptions")
      .insert({ endpoint: "http://insecure.example", p256dh: "k", auth: "a" })
    expect(bad.error).not.toBeNull()
  })

  it("is removed completely when the account is deleted", async () => {
    const frank = await createTestUser({ timezone: TZ })
    try {
      const asFrank = await signedInClient(frank)
      await subscribe(asFrank, endpoint("frank"))
      await asFrank.from("reminder_settings").insert({ morning_enabled: true })
      expect((await asFrank.rpc("delete_my_account")).error).toBeNull()
      for (const table of [
        "reminder_settings",
        "push_subscriptions",
      ] as const) {
        const { count } = await adminClient()
          .from(table)
          .select("*", { count: "exact", head: true })
          .eq("user_id", frank.id)
        expect(count).toBe(0)
      }
    } finally {
      await deleteTestUser(frank)
    }
  })
})
