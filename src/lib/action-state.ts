import { z } from "zod"

/** Result returned by form Server Actions and consumed with useActionState. */
export type ActionState = {
  status: "idle" | "success" | "error"
  message?: string
  fieldErrors?: Record<string, string[] | undefined>
  /** Submitted values (never passwords) so the form can be refilled after an error. */
  values?: Record<string, string>
}

export const idleState: ActionState = { status: "idle" }

export function validationError(
  error: z.ZodError,
  values?: Record<string, string>,
): ActionState {
  return {
    status: "error",
    message: "Please fix the highlighted fields.",
    fieldErrors: z.flattenError(error).fieldErrors,
    values,
  }
}

/** Reads text fields from FormData, skipping files and missing keys. */
export function formValues(
  formData: FormData,
  keys: string[],
): Record<string, string> {
  const values: Record<string, string> = {}
  for (const key of keys) {
    const value = formData.get(key)
    if (typeof value === "string") values[key] = value
  }
  return values
}
