"use client"

import { Trash2 } from "lucide-react"

import { Button } from "@/components/ui/button"

import { deleteTransaction } from "../actions"

export function DeleteTransactionButton({
  transactionId,
}: {
  transactionId: string
}) {
  return (
    <form
      action={deleteTransaction.bind(null, transactionId)}
      onSubmit={(event) => {
        if (!window.confirm("Delete this transaction? You can't undo this."))
          event.preventDefault()
      }}
    >
      <Button type="submit" variant="destructive" className="h-10 px-4">
        <Trash2 aria-hidden="true" />
        Delete transaction
      </Button>
    </form>
  )
}
