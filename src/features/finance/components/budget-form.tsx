"use client"

import { useActionState } from "react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { idleState } from "@/lib/action-state"
import { cn } from "@/lib/utils"

import { setBudget } from "../actions"

/** One budget row: a name and an amount. Empty + Save removes the budget. */
export function BudgetForm({
  categoryId,
  label,
  currency,
  amount,
}: {
  /** Null for the overall monthly budget. */
  categoryId: string | null
  label: string
  currency: string
  /** Current amount as typed input ("" when there's no budget). */
  amount: string
}) {
  const [state, formAction, pending] = useActionState(setBudget, idleState)
  const id = `budget-${categoryId ?? "overall"}`
  const error = state.fieldErrors?.amount?.[0]
  const message =
    error ??
    (state.status === "error" ? state.message : undefined) ??
    (state.status === "success" ? state.message : undefined)

  return (
    <form
      action={formAction}
      className="grid gap-1.5 px-4 py-3 sm:grid-cols-[minmax(0,1fr)_12rem_auto] sm:items-center sm:gap-3"
      noValidate
    >
      <input type="hidden" name="categoryId" value={categoryId ?? ""} />
      <label htmlFor={id} className="truncate text-sm font-medium">
        {label}
      </label>
      <div className="flex gap-2">
        <Input
          id={id}
          name="amount"
          inputMode="decimal"
          autoComplete="off"
          placeholder={`No budget (${currency})`}
          defaultValue={state.values?.amount ?? amount}
          aria-invalid={error ? true : undefined}
          aria-describedby={message ? `${id}-message` : undefined}
          className="h-9"
        />
      </div>
      <Button
        type="submit"
        variant="outline"
        className="h-9 justify-self-start px-3"
        disabled={pending}
      >
        {pending ? "Saving…" : "Save"}
        <span className="sr-only"> {label} budget</span>
      </Button>
      {message && (
        <p
          id={`${id}-message`}
          role={error || state.status === "error" ? "alert" : "status"}
          className={cn(
            "text-xs sm:col-span-3",
            error || state.status === "error"
              ? "text-destructive"
              : "text-muted-foreground",
          )}
        >
          {message}
        </p>
      )}
    </form>
  )
}
