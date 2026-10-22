import { ACHIEVEMENTS, type AchievementCopy } from "./definitions"

/** One row from my_achievements(). */
export type AchievementProgress = {
  code: string
  progress: number
  target: number
}

export type Achievement = AchievementCopy &
  AchievementProgress & {
    unlocked: boolean
    /** Unlocked and not yet seen. */
    isNew: boolean
    percent: number
  }

/**
 * Joins progress rows with their copy (rows without copy are skipped) and
 * sorts: new first, then unlocked, then locked by how close they are.
 */
export function buildAchievements(
  rows: AchievementProgress[],
  seen: ReadonlySet<string>,
): Achievement[] {
  const list: Achievement[] = []
  for (const row of rows) {
    const copy = ACHIEVEMENTS[row.code]
    if (!copy) continue
    const unlocked = row.progress >= row.target
    list.push({
      ...copy,
      ...row,
      unlocked,
      isNew: unlocked && !seen.has(row.code),
      percent: Math.min(100, Math.floor((row.progress / row.target) * 100)),
    })
  }
  const rank = (a: Achievement) => (a.isNew ? 0 : a.unlocked ? 1 : 2)
  return list.sort(
    (a, b) => rank(a) - rank(b) || (a.unlocked ? 0 : b.percent - a.percent),
  )
}

/** "3 of 5", or for minute-based targets "2 h 30 min of 10 h". */
export function progressLabel(
  a: Pick<Achievement, "code" | "progress" | "target">,
) {
  if (a.code.endsWith("_10h")) {
    const hours = (m: number) =>
      m % 60 === 0 ? `${m / 60} h` : `${Math.floor(m / 60)} h ${m % 60} min`
    return `${hours(a.progress)} of ${hours(a.target)}`
  }
  return `${a.progress} of ${a.target}`
}
