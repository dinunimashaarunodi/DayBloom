import "server-only"

import { cache } from "react"

import { getCurrentUser } from "@/lib/auth/session"
import { createClient } from "@/lib/supabase/server"

import { buildAchievements } from "./logic"

/** Every achievement with its progress, new ones first. */
export const getAchievements = cache(async () => {
  const user = await getCurrentUser()
  const supabase = await createClient()
  const [progress, seen] = await Promise.all([
    supabase.rpc("my_achievements"),
    supabase.from("achievement_seen").select("code").eq("user_id", user.id),
  ])
  if (progress.error || seen.error) {
    throw new Error("We couldn't load your achievements.")
  }
  return buildAchievements(progress.data, new Set(seen.data.map((s) => s.code)))
})
