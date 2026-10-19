"use client"

import { Trash2 } from "lucide-react"
import { useActionState, useState } from "react"

import { FormField } from "@/components/form/form-field"
import { FormMessage } from "@/components/form/form-message"
import { Button } from "@/components/ui/button"
import { idleState } from "@/lib/action-state"

import { deleteAccount } from "../actions"
import { DELETE_CONFIRMATION } from "../schema"

/** Permanently deletes the account. Typing DELETE makes it a deliberate act. */
export function DeleteAccountForm() {
  const [state, formAction, pending] = useActionState(deleteAccount, idleState)
  const [typed, setTyped] = useState("")

  return (
    <form action={formAction} className="grid gap-4" noValidate>
      <FormMessage state={state} />
      <FormField
        name="confirmation"
        label={`Type ${DELETE_CONFIRMATION} to confirm`}
        autoComplete="off"
        autoCapitalize="characters"
        spellCheck={false}
        value={typed}
        onChange={(event) => setTyped(event.target.value)}
        errors={state.fieldErrors?.confirmation}
      />
      <Button
        type="submit"
        variant="destructive"
        className="h-10 justify-self-start px-4"
        disabled={pending || typed.trim() !== DELETE_CONFIRMATION}
      >
        <Trash2 aria-hidden="true" />
        {pending ? "Deleting…" : "Delete my account"}
      </Button>
    </form>
  )
}
