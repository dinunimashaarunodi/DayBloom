import { Download, FileJson, FileSpreadsheet } from "lucide-react"

import { buttonVariants } from "@/components/ui/button"
import { cn } from "@/lib/utils"

import { CSV_DATASETS } from "../datasets"

/**
 * Download links for the user's data. Plain links with `download`, so the
 * browser saves the file without leaving the page and no JavaScript is needed.
 */
export function ExportData() {
  return (
    <div className="grid gap-5">
      <div className="grid gap-2">
        <a
          href="/export"
          download
          className={cn(
            buttonVariants(),
            "h-10 w-full justify-center px-4 sm:w-fit",
          )}
        >
          <FileJson aria-hidden="true" />
          Download everything (JSON)
        </a>
        <p className="text-xs text-muted-foreground">
          One file with all your data, to keep as a backup or move elsewhere.
        </p>
      </div>

      <div className="grid gap-2">
        <h3 className="text-sm font-semibold">For spreadsheets (CSV)</h3>
        <ul
          aria-label="CSV downloads"
          className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3"
        >
          {CSV_DATASETS.map((dataset) => (
            <li key={dataset.key}>
              <a
                href={`/export?dataset=${dataset.key}`}
                download
                className={cn(
                  buttonVariants({ variant: "outline" }),
                  "h-10 w-full justify-start gap-2 px-3",
                )}
              >
                <FileSpreadsheet
                  className="text-muted-foreground"
                  aria-hidden="true"
                />
                <span className="flex-1 truncate text-left">
                  {dataset.label}
                </span>
                <Download
                  className="text-muted-foreground"
                  aria-hidden="true"
                />
              </a>
            </li>
          ))}
        </ul>
        <p className="text-xs text-muted-foreground">
          Opens in Excel, Google Sheets or Numbers.
        </p>
      </div>
    </div>
  )
}
