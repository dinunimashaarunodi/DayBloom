import { energyFor, moodFor, type Day } from "../logic"

/** Read-only review, for days older than the editing window. */
export function ReviewDisplay({ day }: { day: Day }) {
  const mood = moodFor(day.mood)
  const energy = energyFor(day.energy)
  if (!mood && !energy && !day.wins && !day.reflection) {
    return (
      <p className="text-sm text-muted-foreground">
        No reflection was written for this day.
      </p>
    )
  }

  return (
    <dl className="grid gap-3 text-sm sm:grid-cols-[auto_1fr] sm:gap-x-6">
      {mood && (
        <>
          <dt className="text-muted-foreground">Mood</dt>
          <dd>
            <span aria-hidden="true">{mood.emoji}</span> {mood.label}
          </dd>
        </>
      )}
      {energy && (
        <>
          <dt className="text-muted-foreground">Energy</dt>
          <dd>{energy.label}</dd>
        </>
      )}
      {day.wins && (
        <>
          <dt className="text-muted-foreground">What went well</dt>
          <dd className="whitespace-pre-line">{day.wins}</dd>
        </>
      )}
      {day.reflection && (
        <>
          <dt className="text-muted-foreground">To remember</dt>
          <dd className="whitespace-pre-line">{day.reflection}</dd>
        </>
      )}
    </dl>
  )
}
