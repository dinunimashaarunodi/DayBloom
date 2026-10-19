import { z } from "zod"

import { DEFAULT_TIMEZONE, isValidTimeZone } from "@/lib/dates/timezone"

// Must match the password rules configured in supabase/config.toml.
export const passwordSchema = z
  .string()
  .min(8, "Use at least 8 characters.")
  .max(72, "Use 72 characters or fewer.")
  .regex(/[A-Za-z]/, "Include at least one letter.")
  .regex(/\d/, "Include at least one number.")

export const emailSchema = z
  .string()
  .trim()
  .toLowerCase()
  .pipe(z.email("Enter a valid email address."))

export const signInSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, "Enter your password."),
})

export const signUpSchema = z.object({
  displayName: z
    .string()
    .trim()
    .max(80, "Use 80 characters or fewer.")
    .optional()
    .transform((value) => value || undefined),
  email: emailSchema,
  password: passwordSchema,
  // Detected in the browser. Fall back to UTC instead of blocking signup;
  // it can be changed in Settings.
  timezone: z.string().refine(isValidTimeZone).catch(DEFAULT_TIMEZONE),
})

export const forgotPasswordSchema = z.object({
  email: emailSchema,
})

export const resetPasswordSchema = z
  .object({
    password: passwordSchema,
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords don't match.",
    path: ["confirmPassword"],
  })

/** Typing the word makes deleting an account a deliberate act. */
export const DELETE_CONFIRMATION = "DELETE"

export const deleteAccountSchema = z.object({
  confirmation: z
    .string()
    .trim()
    .refine((value) => value === DELETE_CONFIRMATION, {
      message: `Type ${DELETE_CONFIRMATION} to confirm.`,
    }),
})
