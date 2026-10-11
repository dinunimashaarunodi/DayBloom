import { ListChecks } from "lucide-react"
import type { Metadata } from "next"

import { EmptyState } from "@/components/empty-state"
import { PageHeader } from "@/components/layout/page-header"

export const metadata: Metadata = { title: "Tasks" }

export default function TasksPage() {
  return (
    <>
      <PageHeader title="Tasks" description="Everything you plan to do, in one place." />
      <EmptyState icon={ListChecks} title="No tasks yet">
        Task planning is coming next. You&apos;ll add, organise and complete tasks here.
      </EmptyState>
    </>
  )
}
