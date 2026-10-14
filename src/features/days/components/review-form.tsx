"use client"

import { useActionState } from "react"

import { FormMessage } from "@/components/form/form-message"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { idleState } from "@/lib/action-state"
import type { LocalDate } from "@/lib/dates/local-date"
import { cn } from "@/lib/utils"

import { saveReview } from "../actions"
import { ENERGY_LEVELS, MOODS, type Day } from "../logic"

type Review = Pick<Day, "mood" | "energy" | "wins" | "reflection">

/** A row of radio "chips". Native radios keep it keyboard- and screen-reader-friendly. */
function ScaleField({
  name,
  legend,
  options,
  defaultValue,
  error,
}: {
  name: string
  legend: string
  options: readonly { value: number; label: string; emoji?: string }[]
  defaultValue: string
  error?: string
}) {
  return (
    <fieldset className="grid gap-2">
      <legend className="mb-2 text-sm font-medium">{legend}</legend>
      <div className="flex flex-wrap gap-2">
        {options.map((option) => (
          <label
            key={option.value}
            className={cn(
              "flex cursor-pointer items-center gap-1.5 rounded-lg border px-3 py-2 text-sm transition-colors",
              "hover:bg-muted has-[:checked]:border-primary has-[:checked]:bg-primary/10 has-[:checked]:font-medium",
              "has-[:focus-visible]:ring-3 has-[:focus-visible]:ring-ring/50",
            )}
          >
            <input
              type="radio"
              name={name}
              value={option.value}
              defaultChecked={defaultValue === String(option.value)}
              className="sr-only"
            />
            {option.emoji && <span aria-hidden="true">{option.emoji}</span>}
            {option.label}
          </label>
        ))}
      </div>
      {error && <p className="text-sm text-destructive">{error}</p>}
    </fieldset>
  )
}

export function ReviewForm({
  date,
  review,
}: {
  date: LocalDate
  review: Review | null
}) {
  const [state, formAction, pending] = useActionState(saveReview, idleState)
  const values = state.values ?? {
    mood: review?.mood?.toString() ?? "",
    energy: review?.energy?.toString() ?? "",
    wins: review?.wins ?? "",
    reflection: review?.reflection ?? "",
  }
  const errors = state.fieldErrors ?? {}

  return (
    <form action={formAction} className="grid gap-5" noValidate>
      <input type="hidden" name="date" value={date} />
      <FormMessage state={state} />
      <ScaleField
        name="mood"
        legend="How did the day feel?"
        options={MOODS}
        defaultValue={values.mood ?? ""}
        error={errors.mood?.[0]}
      />
      <ScaleField
        name="energy"
        legend="Energy"
        options={ENERGY_LEVELS}
        defaultValue={values.energy ?? ""}
        error={errors.energy?.[0]}
      />
      <div className="grid gap-1.5">
        <Label htmlFor={`wins-${date}`}>What went well?</Label>
        <Textarea
          id={`wins-${date}`}
          name="wins"
          rows={2}
          maxLength={2000}
          defaultValue={values.wins}
        />
        {errors.wins && (
          <p className="text-sm text-destructive">{errors.wins[0]}</p>
        )}
      </div>
      <div className="grid gap-1.5">
        <Label htmlFor={`reflection-${date}`}>Anything to remember?</Label>
        <Textarea
          id={`reflection-${date}`}
          name="reflection"
          rows={2}
          maxLength={2000}
          defaultValue={values.reflection}
        />
        {errors.reflection && (
          <p className="text-sm text-destructive">{errors.reflection[0]}</p>
        )}
      </div>
      <Button
        type="submit"
        className="h-10 justify-self-start px-4"
        disabled={pending}
      >
        {pending ? "Saving…" : "Save reflection"}
      </Button>
    </form>
  )
}
