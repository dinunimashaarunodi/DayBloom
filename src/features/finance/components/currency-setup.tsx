"use client"

import { useActionState } from "react"

import { SelectField } from "@/components/form/form-field"
import { FormMessage } from "@/components/form/form-message"
import { Button } from "@/components/ui/button"
import { NativeSelectOption } from "@/components/ui/native-select"
import { idleState } from "@/lib/action-state"

import { setUpFinance } from "../actions"

/** First visit to Finance: pick the currency everything is tracked in. */
export function CurrencySetup({
  suggested,
  currencies,
}: {
  suggested: string
  /** [code, display name] pairs. */
  currencies: [string, string][]
}) {
  const [state, formAction, pending] = useActionState(setUpFinance, idleState)

  return (
    <form action={formAction} className="grid max-w-md gap-4" noValidate>
      <FormMessage state={state} />
      <SelectField
        name="currency"
        label="Your currency"
        hint="All amounts are tracked in this currency."
        defaultValue={state.values?.currency ?? suggested}
        errors={state.fieldErrors?.currency}
      >
        {currencies.map(([code, name]) => (
          <NativeSelectOption key={code} value={code}>
            {code} · {name}
          </NativeSelectOption>
        ))}
      </SelectField>
      <Button
        type="submit"
        className="h-10 justify-self-start px-4"
        disabled={pending}
      >
        {pending ? "Setting up…" : "Start tracking"}
      </Button>
    </form>
  )
}
