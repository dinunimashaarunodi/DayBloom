"use client"

import { useActionState } from "react"

import { FormField, SelectField } from "@/components/form/form-field"
import { FormMessage } from "@/components/form/form-message"
import { Button } from "@/components/ui/button"
import { NativeSelectOption } from "@/components/ui/native-select"
import { idleState } from "@/lib/action-state"

import { updateProfile } from "../actions"

export function ProfileForm({
  displayName,
  timezone,
  timezones,
}: {
  displayName: string | null
  timezone: string
  timezones: string[]
}) {
  const [state, formAction, pending] = useActionState(updateProfile, idleState)
  const values = state.values ?? { displayName: displayName ?? "", timezone }

  return (
    <form action={formAction} className="grid gap-4" noValidate>
      <FormMessage state={state} />
      <FormField
        name="displayName"
        label="Name"
        autoComplete="given-name"
        defaultValue={values.displayName}
        errors={state.fieldErrors?.displayName}
      />
      <SelectField
        name="timezone"
        label="Timezone"
        hint="Your day starts and ends at midnight in this timezone."
        defaultValue={values.timezone}
        errors={state.fieldErrors?.timezone}
      >
        {timezones.map((tz) => (
          <NativeSelectOption key={tz} value={tz}>
            {tz.replaceAll("_", " ")}
          </NativeSelectOption>
        ))}
      </SelectField>
      <Button type="submit" className="h-10 justify-self-start px-4" disabled={pending}>
        {pending ? "Saving…" : "Save changes"}
      </Button>
    </form>
  )
}
