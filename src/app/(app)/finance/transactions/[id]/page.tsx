import type { Metadata } from "next"
import { notFound, redirect } from "next/navigation"
import { Suspense } from "react"

import { BackLink } from "@/components/layout/back-link"
import { PageHeader } from "@/components/layout/page-header"
import { Separator } from "@/components/ui/separator"
import { Skeleton } from "@/components/ui/skeleton"
import { updateTransaction } from "@/features/finance/actions"
import { DeleteTransactionButton } from "@/features/finance/components/delete-transaction-button"
import { TransactionForm } from "@/features/finance/components/transaction-form"
import {
  getCategories,
  getFinanceSettings,
  getTransaction,
} from "@/features/finance/queries"
import { financeIdSchema } from "@/features/finance/schema"
import { currencyOptions } from "@/features/finance/logic"
import { minorToInput } from "@/lib/money"

export const metadata: Metadata = { title: "Edit transaction" }

export default function TransactionPage({
  params,
}: PageProps<"/finance/transactions/[id]">) {
  return (
    <>
      <BackLink href="/finance" label="Finance" />
      <PageHeader title="Edit transaction" />
      <Suspense fallback={<Skeleton className="h-96" />}>
        <TransactionEditor params={params} />
      </Suspense>
    </>
  )
}

async function TransactionEditor({
  params,
}: Pick<PageProps<"/finance/transactions/[id]">, "params">) {
  const { id } = await params
  if (!financeIdSchema.safeParse(id).success) notFound()
  const [{ currency }, transaction, categories] = await Promise.all([
    getFinanceSettings(),
    getTransaction(id),
    getCategories(),
  ])
  if (!currency) redirect("/finance")
  if (!transaction) notFound()

  return (
    <div className="grid max-w-xl gap-6">
      <TransactionForm
        action={updateTransaction.bind(null, transaction.id)}
        // Active categories, plus this transaction's own even if archived.
        categories={categories.filter(
          (c) => !c.archived_at || c.id === transaction.category_id,
        )}
        currency={transaction.currency}
        currencies={currencyOptions(currency)}
        submitLabel="Save changes"
        defaults={{
          kind: transaction.kind,
          amount: minorToInput(transaction.amount_minor, transaction.currency),
          categoryId: transaction.category_id ?? "",
          date: transaction.occurred_on,
          note: transaction.note ?? "",
        }}
      />
      <Separator />
      <DeleteTransactionButton transactionId={transaction.id} />
    </div>
  )
}
