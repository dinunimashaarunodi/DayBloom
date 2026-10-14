"use client"

import { useActionState, useState } from "react"

import { FormField } from "@/components/form/form-field"
import { FormMessage } from "@/components/form/form-message"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { type ActionState, idleState } from "@/lib/action-state"

type EventAction = (
  prev: ActionState,
  formData: FormData,
) => Promise<ActionState>

/** Create/edit form. Times are in the user's own timezone. */
export function EventForm({
  action,
  defaults,
  submitLabel,
  timezone,
}: {
  action: EventAction
  defaults: Record<string, string>
  submitLabel: string
  timezone: string
}) {
  const [state, formAction, pending] = useActionState(action, idleState)
  const values = state.values ?? defaults
  const [allDay, setAllDay] = useState(values.allDay === "on")
  const errors = state.fieldErrors ?? {}

  return (
    <form action={formAction} className="grid gap-4" noValidate>
      <FormMessage state={state} />
      <FormField
        name="title"
        label="Event"
        maxLength={200}
        required
        defaultValue={values.title}
        errors={errors.title}
      />

      <div className="flex items-center gap-2">
        <Checkbox
          id="allDay"
          name="allDay"
          value="on"
          checked={allDay}
          onCheckedChange={(checked) => setAllDay(checked === true)}
        />
        <Label htmlFor="allDay">All day</Label>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <FormField
          name="date"
          label={allDay ? "Start date" : "Date"}
          type="date"
          required
          defaultValue={values.date}
          errors={errors.date}
        />
        {allDay ? (
          <FormField
            name="endDate"
            label="End date"
            type="date"
            hint="Leave empty for a one-day event."
            defaultValue={values.endDate}
            errors={errors.endDate}
          />
        ) : (
          <>
            <FormField
              name="startTime"
              label="Starts"
              type="time"
              required
              defaultValue={values.startTime}
              errors={errors.startTime}
            />
            <FormField
              name="endTime"
              label="Ends"
              type="time"
              required
              defaultValue={values.endTime}
              errors={errors.endTime}
            />
          </>
        )}
      </div>
      {!allDay && (
        <p className="-mt-2 text-xs text-muted-foreground">
          Times are in your timezone ({timezone.replaceAll("_", " ")}).
        </p>
      )}

      <div className="grid gap-1.5">
        <Label htmlFor="notes">Notes</Label>
        <Textarea
          id="notes"
          name="notes"
          rows={3}
          maxLength={5000}
          defaultValue={values.notes}
          aria-invalid={errors.notes ? true : undefined}
        />
        {errors.notes && (
          <p className="text-sm text-destructive">{errors.notes[0]}</p>
        )}
      </div>

      <Button
        type="submit"
        className="h-10 justify-self-start px-4"
        disabled={pending}
      >
        {pending ? "Saving…" : submitLabel}
      </Button>
    </form>
  )
}
