import "server-only"

import { cache } from "react"

import { getProfile } from "@/features/profile/queries"
import { getCurrentUser } from "@/lib/auth/session"
import { todayIn, type LocalDate } from "@/lib/dates/local-date"
import { createClient } from "@/lib/supabase/server"

import {
  CATEGORY_COLUMNS,
  monthRange,
  TRANSACTION_COLUMNS,
  type Category,
  type Transaction,
} from "./logic"

function failed(): never {
  throw new Error("We couldn't load your finances.")
}

/** The user's currency (null until finance is set up) and today's date. */
export const getFinanceSettings = cache(async () => {
  const profile = await getProfile()
  return {
    currency: profile.currency,
    timezone: profile.timezone,
    // Safe at request time: createClient() already called connection().
    today: todayIn(profile.timezone, new Date()),
  }
})

/** All categories, including archived ones (past transactions still use them). */
export const getCategories = cache(async (): Promise<Category[]> => {
  const user = await getCurrentUser()
  const supabase = await createClient()
  const { data, error } = await supabase
    .from("finance_categories")
    .select(CATEGORY_COLUMNS)
    .eq("user_id", user.id)
    .order("name")
  if (error) failed()
  return data as Category[]
})

/** Transactions on the local days from..to, in the user's current currency. */
async function getTransactionsBetween(
  from: LocalDate,
  to: LocalDate,
  currency: string,
): Promise<Transaction[]> {
  const user = await getCurrentUser()
  const supabase = await createClient()
  const { data, error } = await supabase
    .from("transactions")
    .select(TRANSACTION_COLUMNS)
    .eq("user_id", user.id)
    .eq("currency", currency)
    .is("deleted_at", null)
    .gte("occurred_on", from)
    .lte("occurred_on", to)
    .order("occurred_on", { ascending: false })
    .order("created_at", { ascending: false })
  if (error) failed()
  return data as Transaction[]
}

export async function getMonthTransactions(
  monthStart: LocalDate,
  currency: string,
) {
  const { from, to } = monthRange(monthStart)
  return getTransactionsBetween(from, to, currency)
}

export async function getTransaction(id: string): Promise<Transaction | null> {
  const user = await getCurrentUser()
  const supabase = await createClient()
  const { data, error } = await supabase
    .from("transactions")
    .select(TRANSACTION_COLUMNS)
    .eq("user_id", user.id)
    .eq("id", id)
    .is("deleted_at", null)
    .maybeSingle()
  if (error) failed()
  return data as Transaction | null
}
