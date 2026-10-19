"use client"

import { Archive, ArchiveRestore } from "lucide-react"
import { useActionState, useOptimistic, useState, useTransition } from "react"

import { FormField, SelectField } from "@/components/form/form-field"
import { FormMessage } from "@/components/form/form-message"
import { Button } from "@/components/ui/button"
import { NativeSelectOption } from "@/components/ui/native-select"
import { idleState } from "@/lib/action-state"

import { addCategory, setCategoryArchived } from "../actions"
import type { Category } from "../logic"
import { TRANSACTION_KINDS, type TransactionKind } from "../schema"

const KIND_TITLES: Record<TransactionKind, string> = {
  expense: "Expense categories",
  income: "Income categories",
}

/** Add categories, and archive the ones you no longer use. */
export function CategoryManager({ categories }: { categories: Category[] }) {
  const [state, formAction, pending] = useActionState(addCategory, idleState)
  const [optimistic, applyOptimistic] = useOptimistic(
    categories,
    (current, change: { id: string; archived: boolean }) =>
      current.map((c) =>
        c.id === change.id
          ? { ...c, archived_at: change.archived ? "now" : null }
          : c,
      ),
  )
  const [saving, startTransition] = useTransition()
  const [error, setError] = useState<string>()

  function toggle(category: Category) {
    const archived = !category.archived_at
    startTransition(async () => {
      applyOptimistic({ id: category.id, archived })
      const result = await setCategoryArchived(category.id, archived)
      setError(result.error)
    })
  }

  return (
    <div className="grid gap-8">
      <form
        action={formAction}
        className="grid gap-4 sm:grid-cols-[10rem_minmax(0,1fr)_auto] sm:items-end"
        noValidate
      >
        <div className="sm:col-span-3">
          <FormMessage state={state} />
        </div>
        <SelectField
          name="kind"
          label="Type"
          defaultValue={state.values?.kind ?? "expense"}
        >
          <NativeSelectOption value="expense">Expense</NativeSelectOption>
          <NativeSelectOption value="income">Income</NativeSelectOption>
        </SelectField>
        <FormField
          name="name"
          label="New category"
          maxLength={40}
          autoComplete="off"
          defaultValue={state.values?.name}
          errors={state.fieldErrors?.name}
        />
        <Button type="submit" className="h-10 px-4" disabled={pending}>
          Add
        </Button>
      </form>

      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}

      {TRANSACTION_KINDS.map((kind) => {
        const list = optimistic.filter((c) => c.kind === kind)
        return (
          <section
            key={kind}
            className="grid gap-3"
            aria-label={KIND_TITLES[kind]}
          >
            <h2 className="font-medium">{KIND_TITLES[kind]}</h2>
            <ul className="divide-y overflow-hidden surface">
              {list.map((category) => (
                <li
                  key={category.id}
                  className="flex items-center justify-between gap-3 px-4 py-2.5"
                >
                  <span
                    className={
                      category.archived_at ? "text-muted-foreground" : undefined
                    }
                  >
                    {category.name}
                    {category.archived_at && (
                      <span className="ml-2 text-xs">(archived)</span>
                    )}
                  </span>
                  <Button
                    variant="ghost"
                    className="h-9 px-3"
                    disabled={saving}
                    onClick={() => toggle(category)}
                  >
                    {category.archived_at ? (
                      <>
                        <ArchiveRestore aria-hidden="true" />
                        Restore
                        <span className="sr-only">{category.name}</span>
                      </>
                    ) : (
                      <>
                        <Archive aria-hidden="true" />
                        Archive
                        <span className="sr-only">{category.name}</span>
                      </>
                    )}
                  </Button>
                </li>
              ))}
            </ul>
          </section>
        )
      })}
    </div>
  )
}
