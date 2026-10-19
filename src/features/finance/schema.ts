import { z } from "zod"

import {
  isLocalDate,
  localDateSchema,
  type LocalDate,
} from "@/lib/dates/local-date"
import { isCurrencyCode } from "@/lib/money"

export const TRANSACTION_KINDS = ["expense", "income"] as const
export type TransactionKind = (typeof TRANSACTION_KINDS)[number]

export const currencySchema = z.object({
  currency: z
    .string()
    .refine(isCurrencyCode, "Choose a currency from the list."),
})

/**
 * Transaction form. The amount stays a string here: turning it into minor
 * units needs the user's currency, so the action does that with parseAmount().
 * Mirrors the CHECK constraints on public.transactions.
 */
export const transactionFormSchema = z.object({
  kind: z.enum(TRANSACTION_KINDS, "Choose expense or income."),
  amount: z.string(),
  categoryId: z
    .union([z.literal(""), z.uuid()])
    .optional()
    .transform((value) => value || null),
  date: localDateSchema,
  note: z
    .string()
    .trim()
    .max(500, "Keep notes under 500 characters.")
    .optional()
    .transform((value) => value || null),
})

export const categoryFormSchema = z.object({
  kind: z.enum(TRANSACTION_KINDS),
  name: z
    .string()
    .trim()
    .min(1, "Give the category a name.")
    .max(40, "Keep it under 40 characters."),
})

export const financeIdSchema = z.uuid()

/** "2026-10" from the URL → the first day of that month, or null. */
export function parseMonth(value: unknown): LocalDate | null {
  if (typeof value !== "string" || !/^\d{4}-\d{2}$/.test(value)) return null
  const first = `${value}-01`
  return isLocalDate(first) ? first : null
}
