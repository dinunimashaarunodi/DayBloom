// Sends due reminders by Web Push. Called every 5 minutes by pg_cron
// (private.send_reminders() in the reminders migration) with a shared secret.
//
// Secrets (npx supabase secrets set ...): REMINDERS_SECRET, VAPID_PUBLIC_KEY,
// VAPID_PRIVATE_KEY, VAPID_SUBJECT, SERVICE_KEY (the project's secret key).
// Deployed with --no-verify-jwt: it checks REMINDERS_SECRET itself.

import { createClient } from "npm:@supabase/supabase-js@2.58.0"
import webpush from "npm:web-push@3.6.7"

type Due = {
  kind: string
  user_id: string
  endpoint: string
  p256dh: string
  auth: string
  title: string
  body: string
  url: string
}

function env(name: string): string {
  const value = Deno.env.get(name)
  if (!value) throw new Error(`Missing secret ${name}`)
  return value
}

/** Compares secrets without leaking how much of them matched. */
function sameSecret(a: string, b: string): boolean {
  const x = new TextEncoder().encode(a)
  const y = new TextEncoder().encode(b)
  let diff = x.length ^ y.length
  for (let i = 0; i < Math.max(x.length, y.length); i++) {
    diff |= (x[i] ?? 0) ^ (y[i] ?? 0)
  }
  return diff === 0
}

Deno.serve(async (request) => {
  const given = request.headers.get("Authorization") ?? ""
  if (!sameSecret(given, `Bearer ${env("REMINDERS_SECRET")}`)) {
    return new Response("Unauthorized", { status: 401 })
  }

  webpush.setVapidDetails(
    env("VAPID_SUBJECT"),
    env("VAPID_PUBLIC_KEY"),
    env("VAPID_PRIVATE_KEY"),
  )
  const supabase = createClient(
    env("SUPABASE_URL"),
    Deno.env.get("SERVICE_KEY") ?? env("SUPABASE_SERVICE_ROLE_KEY"),
    { auth: { persistSession: false, autoRefreshToken: false } },
  )

  const { data, error } = await supabase.rpc("claim_due_reminders")
  if (error) {
    console.error("claim_due_reminders failed", error.message)
    return Response.json({ error: "claim failed" }, { status: 500 })
  }

  const due = (data ?? []) as Due[]
  let sent = 0
  let removed = 0
  let failed = 0
  await Promise.all(
    due.map(async (reminder) => {
      try {
        await webpush.sendNotification(
          {
            endpoint: reminder.endpoint,
            keys: { p256dh: reminder.p256dh, auth: reminder.auth },
          },
          JSON.stringify({
            title: reminder.title,
            body: reminder.body,
            url: reminder.url,
            tag: `daybloom-${reminder.kind}`,
          }),
          // Stale after an hour: a late reminder isn't worth showing.
          { TTL: 3600, urgency: "normal" },
        )
        sent++
      } catch (err) {
        const status = (err as { statusCode?: number }).statusCode
        if (status === 404 || status === 410) {
          // The browser unsubscribed or expired the endpoint: forget it.
          await supabase
            .from("push_subscriptions")
            .delete()
            .eq("endpoint", reminder.endpoint)
          removed++
        } else {
          failed++
          console.error("push failed", status ?? String(err))
        }
      }
    }),
  )

  return Response.json({ due: due.length, sent, removed, failed })
})
