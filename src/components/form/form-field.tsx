import type * as React from "react"

import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { NativeSelect } from "@/components/ui/native-select"

type FieldShellProps = {
  id: string
  label: string
  hint?: string
  errors?: string[]
  children: (aria: { "aria-invalid"?: true; "aria-describedby"?: string }) => React.ReactNode
}

/** Label + control + hint + field-level error, wired up for screen readers. */
function FieldShell({ id, label, hint, errors, children }: FieldShellProps) {
  const error = errors?.[0]
  const hintId = hint ? `${id}-hint` : undefined
  const errorId = error ? `${id}-error` : undefined
  const describedBy = [hintId, errorId].filter(Boolean).join(" ") || undefined

  return (
    <div className="grid gap-1.5">
      <Label htmlFor={id}>{label}</Label>
      {children({ "aria-invalid": error ? true : undefined, "aria-describedby": describedBy })}
      {hint && (
        <p id={hintId} className="text-xs text-muted-foreground">
          {hint}
        </p>
      )}
      {error && (
        <p id={errorId} className="text-sm text-destructive">
          {error}
        </p>
      )}
    </div>
  )
}

type FormFieldProps = React.ComponentProps<typeof Input> & {
  name: string
  label: string
  hint?: string
  errors?: string[]
}

export function FormField({ name, label, hint, errors, id = name, ...props }: FormFieldProps) {
  return (
    <FieldShell id={id} label={label} hint={hint} errors={errors}>
      {(aria) => <Input id={id} name={name} className="h-10 md:h-9" {...aria} {...props} />}
    </FieldShell>
  )
}

type SelectFieldProps = Omit<React.ComponentProps<"select">, "size"> & {
  name: string
  label: string
  hint?: string
  errors?: string[]
}

export function SelectField({ name, label, hint, errors, id = name, ...props }: SelectFieldProps) {
  return (
    <FieldShell id={id} label={label} hint={hint} errors={errors}>
      {(aria) => <NativeSelect id={id} name={name} className="w-full" {...aria} {...props} />}
    </FieldShell>
  )
}
