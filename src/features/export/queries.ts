import "server-only"

import type { SupabaseClient } from "@supabase/supabase-js"

import { getCurrentUser } from "@/lib/auth/session"
import { createClient } from "@/lib/supabase/server"

import { ALL_TABLES, type CsvDataset, withoutUserId } from "./datasets"

/** PostgREST returns at most 1000 rows per request, so read in pages. */
const PAGE = 1000

type Row = Record<string, unknown>

function failed(): never {
  throw new Error("We couldn't prepare your export. Please try again.")
}

/**
 * Every row of one table that belongs to the signed-in user (RLS also limits
 * it to them), oldest first by `orderBy`, then by id for a stable order.
 */
async function fetchAll(
  supabase: SupabaseClient,
  userId: string,
  table: string,
  options: {
    select?: string
    orderBy?: string
    skipDeleted?: boolean
    onlyWith?: string
  } = {},
): Promise<Row[]> {
  const rows: Row[] = []
  for (let from = 0; ; from += PAGE) {
    let query = supabase
      .from(table)
      .select(options.select ?? "*")
      .eq("user_id", userId)
    if (options.skipDeleted) query = query.is("deleted_at", null)
    if (options.onlyWith) query = query.not(options.onlyWith, "is", null)
    if (options.orderBy) query = query.order(options.orderBy)
    // A stable order for paging (two tables have no id column).
    query =
      table === "profiles" || table === "achievement_seen"
        ? query.order(table === "profiles" ? "user_id" : "code")
        : query.order("id")
    const { data, error } = await query.range(from, from + PAGE - 1)
    if (error) failed()
    rows.push(...(data as unknown as Row[]))
    if (data.length < PAGE) return rows
  }
}

/** Everything the user has stored, table by table (for the JSON export). */
export async function getFullExport() {
  const user = await getCurrentUser()
  // Table names vary at run time, so the generated per-table types don't apply.
  const supabase = (await createClient()) as unknown as SupabaseClient
  const tables = await Promise.all(
    ALL_TABLES.map(async (table) => [
      table,
      withoutUserId(await fetchAll(supabase, user.id, table)),
    ]),
  )
  return {
    app: "DayBloom",
    format_version: 1,
    exported_at: new Date().toISOString(),
    account: { email: user.email },
    tables: Object.fromEntries(tables) as Record<string, Row[]>,
  }
}

/** One CSV dataset's rows. */
export async function getDatasetRows(dataset: CsvDataset): Promise<Row[]> {
  const user = await getCurrentUser()
  const supabase = (await createClient()) as unknown as SupabaseClient
  return fetchAll(supabase, user.id, dataset.table, dataset)
}
