// Test-only helpers. Uses the secret key to create and delete throwaway users.
// Never import this from app code.
import { randomUUID } from "node:crypto"

import { createClient, type SupabaseClient } from "@supabase/supabase-js"

import type { Database } from "../../src/types/database"

function env(name: string): string {
  const value = process.env[name]
  if (!value) throw new Error(`Missing ${name} in .env.local`)
  return value
}

const url = () => env("NEXT_PUBLIC_SUPABASE_URL")
const options = { auth: { persistSession: false, autoRefreshToken: false } }

export function adminClient(): SupabaseClient<Database> {
  return createClient<Database>(url(), env("SUPABASE_SECRET_KEY"), options)
}

export function anonClient(): SupabaseClient<Database> {
  return createClient<Database>(
    url(),
    env("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY"),
    options,
  )
}

export type TestUser = { id: string; email: string; password: string }

/** Creates a confirmed user (no email is sent). Remember to call deleteTestUser. */
export async function createTestUser(
  metadata: Record<string, string> = {},
): Promise<TestUser> {
  const email = `daybloom-test-${randomUUID()}@example.com`
  const password = `Bloom-${randomUUID()}-9`
  const { data, error } = await adminClient().auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: metadata,
  })
  if (error || !data.user)
    throw error ?? new Error("createUser returned no user")
  return { id: data.user.id, email, password }
}

export async function deleteTestUser(
  user: TestUser | undefined,
): Promise<void> {
  if (user) await adminClient().auth.admin.deleteUser(user.id)
}

// Supabase limits password sign-ins per network address (roughly 30 per
// 5 minutes in practice), shared by every test run on this machine.
// So: reuse a user's session within a run, and wait instead of failing when
// the limit is hit.
const sessions = new Map<string, Promise<SupabaseClient<Database>>>()
const RETRY_EVERY_MS = 20_000
const MAX_WAIT_MS = 6 * 60_000

function isRateLimited(error: { status?: number; code?: string }) {
  return error.status === 429 || error.code === "over_request_rate_limit"
}

async function signIn(user: TestUser): Promise<SupabaseClient<Database>> {
  const deadline = Date.now() + MAX_WAIT_MS
  for (;;) {
    const client = anonClient()
    const { error } = await client.auth.signInWithPassword({
      email: user.email,
      password: user.password,
    })
    if (!error) return client
    if (!isRateLimited(error) || Date.now() > deadline) throw error
    await new Promise((resolve) => setTimeout(resolve, RETRY_EVERY_MS))
  }
}

/** A client signed in as `user`, so every query runs under RLS as that user. */
export function signedInClient(
  user: TestUser,
): Promise<SupabaseClient<Database>> {
  let session = sessions.get(user.id)
  if (!session) {
    session = signIn(user)
    sessions.set(user.id, session)
    session.catch(() => sessions.delete(user.id))
  }
  return session
}
