import type { Metadata } from "next"
import { redirect } from "next/navigation"
import { Suspense } from "react"

import { BackLink } from "@/components/layout/back-link"
import { PageHeader } from "@/components/layout/page-header"
import { Skeleton } from "@/components/ui/skeleton"
import { CategoryManager } from "@/features/finance/components/category-manager"
import { getCategories, getFinanceSettings } from "@/features/finance/queries"

export const metadata: Metadata = { title: "Categories" }

export default function CategoriesPage() {
  return (
    <>
      <BackLink href="/finance" label="Finance" />
      <PageHeader
        title="Categories"
        description="Archived categories are hidden from new entries but keep your past transactions intact."
      />
      <Suspense fallback={<Skeleton className="h-96" />}>
        <Categories />
      </Suspense>
    </>
  )
}

async function Categories() {
  const [{ currency }, categories] = await Promise.all([
    getFinanceSettings(),
    getCategories(),
  ])
  if (!currency) redirect("/finance")
  return (
    <div className="max-w-2xl">
      <CategoryManager categories={categories} />
    </div>
  )
}
