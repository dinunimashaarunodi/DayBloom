import { CalendarDays } from "lucide-react"
import type { Metadata } from "next"

import { EmptyState } from "@/components/empty-state"
import { PageHeader } from "@/components/layout/page-header"

export const metadata: Metadata = { title: "Calendar" }

export default function CalendarPage() {
  return (
    <>
      <PageHeader
        title="Calendar"
        description="See your days, weeks and months at a glance."
      />
      <EmptyState icon={CalendarDays} title="Your calendar is on its way">
        Dated tasks and events will appear here.
      </EmptyState>
    </>
  )
}
