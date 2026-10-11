import { History } from "lucide-react"
import type { Metadata } from "next"

import { EmptyState } from "@/components/empty-state"
import { PageHeader } from "@/components/layout/page-header"

export const metadata: Metadata = { title: "History" }

export default function HistoryPage() {
  return (
    <>
      <PageHeader
        title="History"
        description="Look back on the days you've lived and what you achieved."
      />
      <EmptyState icon={History} title="No past days yet">
        Each day you close will be saved here with your review.
      </EmptyState>
    </>
  )
}
