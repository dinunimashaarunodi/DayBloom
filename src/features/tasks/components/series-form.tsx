"use client"

import { useActionState, useState } from "react"

import { FormField, SelectField } from "@/components/form/form-field"
import { FormMessage } from "@/components/form/form-message"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { type ActionState, idleState } from "@/lib/action-state"
import type { LocalDate } from "@/lib/dates/local-date"
import { cn } from "@/lib/utils"

import { EVERY_DAY, WEEKDAYS, type TaskSeries } from "../repeat"
import type { RepeatKind } from "../schema"

const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]
const KINDS: { value: RepeatKind; label: string }[] = [
  { value: "daily", label: "Every day" },
  { value: "weekdays", label: "Weekdays" },
  { value: "days", label: "Chosen days" },
  { value: "monthly", label: "Monthly" },
]

type SeriesAction = (
  prev: ActionState,
  formData: FormData,
) => Promise<ActionState>

function kindOf(series?: TaskSeries): RepeatKind {
  if (!series) return "daily"
  if (series.month_day !== null) return "monthly"
  if (series.days_mask === EVERY_DAY) return "daily"
  if (series.days_mask === WEEKDAYS) return "weekdays"
  return "days"
}

const chip = cn(
  "flex h-9 cursor-pointer items-center justify-center rounded-lg border px-3 text-sm transition-colors",
  "hover:bg-muted has-[:checked]:border-primary has-[:checked]:bg-primary has-[:checked]:text-primary-foreground",
  "has-[:focus-visible]:ring-3 has-[:focus-visible]:ring-ring/50",
)

/** Create or edit a repeating task. */
export function SeriesForm({
  action,
  submitLabel,
  today,
  series,
}: {
  action: SeriesAction
  submitLabel: string
  today: LocalDate
  series?: TaskSeries
}) {
  const [state, formAction, pending] = useActionState(action, idleState)
  const values = state.values ?? {
    title: series?.title ?? "",
    notes: series?.notes ?? "",
    priority: series?.priority ?? "normal",
    kind: kindOf(series),
    days:
      series?.days_mask != null
        ? DAYS.map((_, i) => i)
            .filter((i) => series.days_mask! & (1 << i))
            .join(",")
        : "",
    monthDay: String(series?.month_day ?? Number(today.slice(8))),
    startsOn: series?.starts_on ?? today,
    endsOn: series?.ends_on ?? "",
  }
  const [kind, setKind] = useState<RepeatKind>(values.kind as RepeatKind)
  const checkedDays = new Set((values.days ?? "").split(",").filter(Boolean))
  const errors = state.fieldErrors ?? {}

  return (
    <form action={formAction} className="grid gap-4" noValidate>
      <FormMessage state={state} />
      <FormField
        name="title"
        label="Task"
        placeholder="e.g. Water the plants"
        maxLength={200}
        autoComplete="off"
        defaultValue={values.title}
        errors={errors.title}
      />

      <fieldset className="grid gap-2">
        <legend className="mb-1 text-sm font-medium">Repeats</legend>
        <div className="flex flex-wrap gap-1.5">
          {KINDS.map((option) => (
            <label key={option.value} className={chip}>
              <input
                type="radio"
                name="kind"
                value={option.value}
                checked={kind === option.value}
                onChange={() => setKind(option.value)}
                className="sr-only"
              />
              {option.label}
            </label>
          ))}
        </div>
      </fieldset>

      {kind === "days" && (
        <fieldset className="grid gap-2">
          <legend className="mb-1 text-sm font-medium">On</legend>
          <div className="flex flex-wrap gap-1.5">
            {DAYS.map((day, i) => (
              <label key={day} className={cn(chip, "min-w-11 px-2")}>
                <input
                  type="checkbox"
                  name="days"
                  value={String(i)}
                  defaultChecked={checkedDays.has(String(i))}
                  className="sr-only"
                />
                {day}
              </label>
            ))}
          </div>
          {errors.days && (
            <p className="text-sm text-destructive">{errors.days[0]}</p>
          )}
        </fieldset>
      )}

      {kind === "monthly" && (
        <SelectField
          name="monthDay"
          label="Day of the month"
          hint="29, 30 and 31 fall on the last day of shorter months."
          defaultValue={values.monthDay}
          errors={errors.monthDay}
          className="sm:max-w-48"
        >
          {Array.from({ length: 31 }, (_, i) => (
            <option key={i + 1} value={String(i + 1)}>
              {i + 1}
            </option>
          ))}
        </SelectField>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        <FormField
          name="startsOn"
          label="Starts"
          type="date"
          defaultValue={values.startsOn}
          errors={errors.startsOn}
        />
        <FormField
          name="endsOn"
          label="Ends (optional)"
          type="date"
          defaultValue={values.endsOn}
          errors={errors.endsOn}
        />
      </div>

      <SelectField
        name="priority"
        label="Priority"
        defaultValue={values.priority}
        errors={errors.priority}
        className="sm:max-w-48"
      >
        <option value="low">Low</option>
        <option value="normal">Normal</option>
        <option value="high">High</option>
      </SelectField>

      <div className="grid gap-1.5">
        <Label htmlFor="series-notes">Notes (optional)</Label>
        <Textarea
          id="series-notes"
          name="notes"
          rows={2}
          maxLength={5000}
          defaultValue={values.notes}
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
