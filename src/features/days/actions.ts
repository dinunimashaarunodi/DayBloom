"use server"

import { revalidatePath } from "next/cache"

import {
  type ActionState,
  formValues,
  validationError,
} from "@/lib/action-state"
import { getCurrentUser } from "@/lib/auth/session"
import { createClient } from "@/lib/supabase/server"
import type { Database } from "@/types/database"

import { reviewSchema } from "./schema"

// Generated types mark SQL function arguments as non-null, but each review
// field is optional and is stored as null when left empty.
type ReviewArgs = Database["public"]["Functions"]["save_day_review"]["Args"]

export async function saveReview(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  await getCurrentUser()
  const values = formValues(formData, [
    "date",
    "mood",
    "energy",
    "wins",
    "reflection",
  ])
  const parsed = reviewSchema.safeParse(values)
  if (!parsed.success) return validationError(parsed.error, values)

  const supabase = await createClient()
  // The database only accepts reviews for today and the previous 7 days.
  const { error } = await supabase.rpc("save_day_review", {
    p_date: parsed.data.date,
    p_mood: parsed.data.mood,
    p_energy: parsed.data.energy,
    p_wins: parsed.data.wins,
    p_reflection: parsed.data.reflection,
  } as unknown as ReviewArgs)
  if (error) {
    return {
      status: "error",
      message:
        "We couldn't save your reflection. Reviews can be written for the last 7 days.",
      values,
    }
  }

  revalidatePath("/today")
  revalidatePath("/history", "layout")
  return {
    status: "success",
    message: "Saved. Thanks for taking a moment to reflect. 🌱",
    values,
  }
}
