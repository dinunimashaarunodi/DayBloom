"use server"

import { z } from "zod"

import { getCurrentUser } from "@/lib/auth/session"
import { createClient } from "@/lib/supabase/server"

import { ACHIEVEMENTS } from "./definitions"

const codesSchema = z
  .array(z.string().refine((code) => code in ACHIEVEMENTS))
  .max(Object.keys(ACHIEVEMENTS).length)

/**
 * Remembers that new achievements were seen, so they're celebrated once.
 * Deliberately revalidates nothing: that would re-render the open page and
 * remove the "New" labels while they're being celebrated. They (and Today's
 * card) update on the next visit.
 */
export async function markAchievementsSeen(codes: string[]): Promise<void> {
  await getCurrentUser()
  const parsed = codesSchema.safeParse(codes)
  if (!parsed.success || parsed.data.length === 0) return
  const supabase = await createClient()
  await supabase.from("achievement_seen").upsert(
    parsed.data.map((code) => ({ code })),
    { onConflict: "user_id,code", ignoreDuplicates: true },
  )
}
