"use client"

import { useActionState, useState } from "react"

import { FormField, SelectField } from "@/components/form/form-field"
import { FormMessage } from "@/components/form/form-message"
import { Button } from "@/components/ui/button"
import { NativeSelectOption } from "@/components/ui/native-select"
import { type ActionState, idleState } from "@/lib/action-state"
import { cn } from "@/lib/utils"

import type { Category } from "../logic"
import { TRANSACTION_KINDS, type TransactionKind } from "../schema"

type TransactionAction = (
  prev: ActionState,
  formData: FormData,
) => Promise<ActionState>

const KIND_LABELS: Record<TransactionKind, string> = {
  expense: "Expense",
  income: "Income",
}

/** Add or edit a transaction. Amounts are typed in the user's currency. */
export function TransactionForm({
  action,
  categories,
  currency,
  defaults,
  submitLabel,
}: {
  action: TransactionAction
  /** Categories to offer (active ones, plus the current one when editing). */
  categories: Category[]
  currency: string
  defaults: Record<string, string>
  submitLabel: string
}) {
  const [state, formAction, pending] = useActionState(action, idleState)
  const values = state.values ?? defaults
  const [kind, setKind] = useState<TransactionKind>(
    values.kind === "income" ? "income" : "expense",
  )
  const errors = state.fieldErrors ?? {}
  const options = categories.filter((c) => c.kind === kind)

  return (
    <form action={formAction} className="grid gap-4" noValidate>
      <FormMessage state={state} />

      <fieldset className="grid gap-1.5">
        <legend className="mb-1.5 text-sm font-medium">Type</legend>
        <div className="grid grid-cols-2 gap-1 rounded-lg bg-muted p-1">
          {TRANSACTION_KINDS.map((option) => (
            <label
              key={option}
              className={cn(
                "flex h-9 cursor-pointer items-center justify-center rounded-md text-sm transition-colors duration-200",
                "has-[:focus-visible]:ring-3 has-[:focus-visible]:ring-ring/50",
                kind === option
                  ? "bg-card font-medium shadow-soft"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              <input
                type="radio"
                name="kind"
                value={option}
                checked={kind === option}
                onChange={() => setKind(option)}
                className="sr-only"
              />
              {KIND_LABELS[option]}
            </label>
          ))}
        </div>
      </fieldset>

      <FormField
        name="amount"
        label={`Amount (${currency})`}
        inputMode="decimal"
        autoComplete="off"
        placeholder="0.00"
        required
        defaultValue={values.amount}
        errors={errors.amount}
      />

      <SelectField
        // Re-mount when the type changes so the selection resets cleanly.
        key={kind}
        name="categoryId"
        label="Category"
        defaultValue={
          options.some((c) => c.id === values.categoryId)
            ? values.categoryId
            : ""
        }
        errors={errors.categoryId}
      >
        <NativeSelectOption value="">No category</NativeSelectOption>
        {options.map((c) => (
          <NativeSelectOption key={c.id} value={c.id}>
            {c.name}
            {c.archived_at ? " (archived)" : ""}
          </NativeSelectOption>
        ))}
      </SelectField>

      <FormField
        name="date"
        label="Date"
        type="date"
        required
        defaultValue={values.date}
        errors={errors.date}
      />

      <FormField
        name="note"
        label="Note (optional)"
        maxLength={500}
        autoComplete="off"
        defaultValue={values.note}
        errors={errors.note}
      />

      <Button
        type="submit"
        className="h-10 justify-self-start px-4"
        disabled={pending}
      >
        {pending ? "Saving…" : submitLabel}
      </Button>
    </form>
  )
}
