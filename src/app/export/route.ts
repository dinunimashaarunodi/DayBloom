import type { NextRequest } from "next/server"

import { toCsv } from "@/features/export/csv"
import { findDataset } from "@/features/export/datasets"
import { getDatasetRows, getFullExport } from "@/features/export/queries"
import { getUserToday } from "@/features/tasks/queries"

/**
 * Downloads the signed-in user's data:
 * - `/export` — everything, as one JSON file
 * - `/export?dataset=tasks` — one CSV (see CSV_DATASETS)
 * The proxy sends signed-out visitors to the login page, and every query is
 * limited to the caller's own rows (RLS and an explicit user filter).
 */
export async function GET(request: NextRequest) {
  const key = request.nextUrl.searchParams.get("dataset")
  const { today } = await getUserToday()

  if (key === null) {
    const data = await getFullExport()
    return download(
      JSON.stringify(data, null, 2),
      `daybloom-export-${today}.json`,
      "application/json; charset=utf-8",
    )
  }

  const dataset = findDataset(key)
  if (!dataset) {
    return new Response("Unknown export.", { status: 404 })
  }
  const rows = await getDatasetRows(dataset)
  return download(
    toCsv(rows, dataset.columns),
    `daybloom-${dataset.key}-${today}.csv`,
    "text/csv; charset=utf-8",
  )
}

function download(body: string, filename: string, type: string) {
  return new Response(body, {
    headers: {
      "Content-Type": type,
      "Content-Disposition": `attachment; filename="${filename}"`,
      // Personal data: never store it in any cache.
      "Cache-Control": "no-store",
    },
  })
}
