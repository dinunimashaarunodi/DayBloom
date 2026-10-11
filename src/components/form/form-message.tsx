import { CircleAlert, CircleCheck } from "lucide-react"

import { Alert, AlertDescription } from "@/components/ui/alert"
import type { ActionState } from "@/lib/action-state"

/** Form-level success or error message from a Server Action. */
export function FormMessage({ state }: { state: ActionState }) {
  if (!state.message || state.status === "idle") return null
  const isError = state.status === "error"

  return (
    <Alert variant={isError ? "destructive" : "default"} aria-live="polite">
      {isError ? <CircleAlert /> : <CircleCheck />}
      <AlertDescription>{state.message}</AlertDescription>
    </Alert>
  )
}
