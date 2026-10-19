import { ChevronLeft, ChevronRight } from "lucide-react"
import Link from "next/link"

import { buttonVariants } from "@/components/ui/button"
import { addMonths, type LocalDate } from "@/lib/dates/local-date"
import { cn } from "@/lib/utils"

import { monthKey } from "../logic"

/** Previous / this month / next links for the finance page. */
export function MonthNav({
  month,
  thisMonth,
}: {
  month: LocalDate
  thisMonth: LocalDate
}) {
  const icon = cn(
    buttonVariants({ variant: "outline", size: "icon" }),
    "size-9",
  )
  return (
    <div className="flex items-center gap-1">
      <Link
        href={`/finance?month=${monthKey(addMonths(month, -1))}`}
        aria-label="Previous month"
        className={icon}
      >
        <ChevronLeft />
      </Link>
      <Link
        href="/finance"
        aria-current={month === thisMonth ? "page" : undefined}
        className={cn(buttonVariants({ variant: "outline" }), "h-9 px-3")}
      >
        This month
      </Link>
      <Link
        href={`/finance?month=${monthKey(addMonths(month, 1))}`}
        aria-label="Next month"
        className={icon}
      >
        <ChevronRight />
      </Link>
    </div>
  )
}
