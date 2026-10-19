"use server"

import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"

import {
  type ActionState,
  formValues,
  validationError,
} from "@/lib/action-state"
import { getCurrentUser } from "@/lib/auth/session"
import { startOfMonth } from "@/lib/dates/local-date"
import { parseAmount } from "@/lib/money"
import { createClient } from "@/lib/supabase/server"
import type { Database } from "@/types/database"

import { getFinanceSettings } from "./queries"
import {
  budgetFormSchema,
  categoryFormSchema,
  currencySchema,
  financeIdSchema,
  transactionFormSchema,
} from "./schema"

const SAVE_ERROR = "We couldn't save that. Please try again."
const FIELDS = ["kind", "amount", "categoryId", "date", "note"]

function revalidateFinance() {
  revalidatePath("/finance", "layout")
  revalidatePath("/today")
}

/** One-time setup: choose a currency and get starter categories. */
export async function setUpFinance(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const user = await getCurrentUser()
  const values = formValues(formData, ["currency"])
  const parsed = currencySchema.safeParse(values)
  if (!parsed.success) return validationError(parsed.error, values)

  const supabase = await createClient()
  const { error } = await supabase
    .from("profiles")
    .update({ currency: parsed.data.currency })
    .eq("user_id", user.id)
    .is("currency", null) // set once; changing currencies isn't supported yet
  if (error) return { status: "error", message: SAVE_ERROR, values }

  const seeded = await supabase.rpc("ensure_default_finance_categories")
  if (seeded.error) return { status: "error", message: SAVE_ERROR, values }

  revalidateFinance()
  revalidatePath("/settings")
  return { status: "success" }
}

/** Validates the transaction form, converting the amount in the user's currency. */
async function parseTransactionForm(formData: FormData) {
  const values = formValues(formData, FIELDS)
  const parsed = transactionFormSchema.safeParse(values)
  if (!parsed.success) {
    return { ok: false as const, state: validationError(parsed.error, values) }
  }
  const { currency } = await getFinanceSettings()
  if (!currency) {
    const state: ActionState = {
      status: "error",
      message: "Choose your currency first.",
      values,
    }
    return { ok: false as const, state }
  }
  const amount = parseAmount(parsed.data.amount, currency)
  if (!amount.ok) {
    const state: ActionState = {
      status: "error",
      message: "Please fix the highlighted fields.",
      fieldErrors: { amount: [amount.error] },
      values,
    }
    return { ok: false as const, state }
  }
  return {
    ok: true as const,
    values,
    row: {
      kind: parsed.data.kind,
      amount_minor: amount.minor,
      category_id: parsed.data.categoryId,
      occurred_on: parsed.data.date,
      note: parsed.data.note,
    },
  }
}

export async function createTransaction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  await getCurrentUser()
  const result = await parseTransactionForm(formData)
  if (!result.ok) return result.state

  const supabase = await createClient()
  const { error } = await supabase.from("transactions").insert(result.row)
  if (error)
    return { status: "error", message: SAVE_ERROR, values: result.values }

  revalidateFinance()
  // Keep kind, category and date for quick repeated entry; clear the rest.
  return {
    status: "success",
    message: "Added.",
    values: { ...result.values, amount: "", note: "" },
  }
}

export async function updateTransaction(
  id: string,
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  await getCurrentUser()
  if (!financeIdSchema.safeParse(id).success) {
    return { status: "error", message: SAVE_ERROR }
  }
  const result = await parseTransactionForm(formData)
  if (!result.ok) return result.state

  const supabase = await createClient()
  const { data, error } = await supabase
    .from("transactions")
    .update(result.row)
    .eq("id", id)
    .select("id")
  if (error || data.length === 0) {
    return { status: "error", message: SAVE_ERROR, values: result.values }
  }

  revalidateFinance()
  return { status: "success", message: "Saved.", values: result.values }
}

/** Soft delete: the transaction leaves totals and lists but stays in history. */
export async function deleteTransaction(id: string): Promise<void> {
  await getCurrentUser()
  if (!financeIdSchema.safeParse(id).success) return
  const supabase = await createClient()
  await supabase
    .from("transactions")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", id)
  revalidateFinance()
  redirect("/finance")
}

export async function addCategory(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  await getCurrentUser()
  const values = formValues(formData, ["kind", "name"])
  const parsed = categoryFormSchema.safeParse(values)
  if (!parsed.success) return validationError(parsed.error, values)

  const supabase = await createClient()
  const { error } = await supabase
    .from("finance_categories")
    .insert(parsed.data)
  if (error) {
    const duplicate = error.code === "23505"
    return {
      status: "error",
      message: duplicate
        ? "You already have a category with that name."
        : SAVE_ERROR,
      fieldErrors: duplicate
        ? { name: ["That name is already used."] }
        : undefined,
      values,
    }
  }

  revalidateFinance()
  return {
    status: "success",
    message: "Category added.",
    values: { kind: values.kind ?? "expense", name: "" },
  }
}

/** Archive hides a category from new entries; past transactions keep it. */
export async function setCategoryArchived(
  id: string,
  archived: boolean,
): Promise<{ error?: string }> {
  await getCurrentUser()
  if (!financeIdSchema.safeParse(id).success) return { error: SAVE_ERROR }
  const supabase = await createClient()
  const { error } = await supabase
    .from("finance_categories")
    .update({ archived_at: archived ? new Date().toISOString() : null })
    .eq("id", id)
  if (error) {
    return {
      error:
        error.code === "23505"
          ? "An active category already has that name."
          : SAVE_ERROR,
    }
  }
  revalidateFinance()
  return {}
}

// Generated types mark SQL args non-null; null category = overall budget and
// null amount = remove the budget.
type SetBudgetArgs = Database["public"]["Functions"]["set_budget"]["Args"]

/**
 * Sets a budget from the current month onwards (past months keep theirs).
 * An empty amount removes the budget from this month on.
 */
export async function setBudget(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  await getCurrentUser()
  const values = formValues(formData, ["categoryId", "amount"])
  const parsed = budgetFormSchema.safeParse(values)
  if (!parsed.success) return validationError(parsed.error, values)

  const { currency, today } = await getFinanceSettings()
  if (!currency) {
    return { status: "error", message: "Choose your currency first.", values }
  }

  let amountMinor: number | null = null
  if (parsed.data.amount.trim() !== "") {
    const amount = parseAmount(parsed.data.amount, currency)
    if (!amount.ok) {
      return {
        status: "error",
        fieldErrors: { amount: [amount.error] },
        values,
      }
    }
    amountMinor = amount.minor
  }

  const supabase = await createClient()
  const { error } = await supabase.rpc("set_budget", {
    p_category_id: parsed.data.categoryId,
    p_starts_on: startOfMonth(today),
    p_amount_minor: amountMinor,
  } as unknown as SetBudgetArgs)
  if (error) return { status: "error", message: SAVE_ERROR, values }

  revalidateFinance()
  return {
    status: "success",
    message: amountMinor === null ? "Removed." : "Saved.",
    values,
  }
}
