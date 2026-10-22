import {
  BookOpen,
  CheckCircle2,
  Dumbbell,
  Languages,
  Leaf,
  Lock,
  Repeat,
  Target,
  Timer,
  Wallet,
  type LucideIcon,
} from "lucide-react"

import { cn } from "@/lib/utils"

import type { AchievementArea } from "../definitions"
import { progressLabel, type Achievement } from "../logic"

const AREA_ICONS: Record<AchievementArea, LucideIcon> = {
  tasks: CheckCircle2,
  reflection: Leaf,
  habits: Repeat,
  focus: Timer,
  workouts: Dumbbell,
  goals: Target,
  journal: BookOpen,
  languages: Languages,
  finance: Wallet,
}

/**
 * Badges: unlocked ones in rose with a gold icon, locked ones muted with a
 * lock and their progress, so the state never depends on colour alone.
 */
export function AchievementGrid({
  label,
  achievements,
}: {
  label: string
  achievements: Achievement[]
}) {
  return (
    <ul aria-label={label} className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {achievements.map((a) => {
        const Icon = AREA_ICONS[a.area]
        return (
          <li
            key={a.code}
            className={cn(
              "flex gap-3 surface p-4",
              a.isNew &&
                "animate-in ring-2 ring-gold/60 duration-500 zoom-in-95 fade-in",
            )}
          >
            <span
              className={cn(
                "grid size-10 shrink-0 place-items-center rounded-full",
                a.unlocked ? "bg-rose" : "bg-muted text-muted-foreground",
              )}
            >
              {a.unlocked ? (
                <Icon className="size-5 text-gold" aria-hidden="true" />
              ) : (
                <Lock className="size-4" aria-hidden="true" />
              )}
            </span>
            <div className="grid min-w-0 flex-1 content-start gap-1">
              <p className="flex flex-wrap items-center gap-x-2 font-medium">
                {a.title}
                {a.isNew && (
                  <span className="rounded-md bg-rose px-1.5 text-xs font-medium text-foreground">
                    New
                  </span>
                )}
              </p>
              <p className="text-sm text-muted-foreground">{a.description}</p>
              {a.unlocked ? (
                <p className="text-xs font-medium text-foreground">Unlocked</p>
              ) : (
                <div className="grid gap-1">
                  <div
                    role="progressbar"
                    aria-label={`${a.title} progress`}
                    aria-valuemin={0}
                    aria-valuemax={a.target}
                    aria-valuenow={a.progress}
                    aria-valuetext={progressLabel(a)}
                    className="h-1.5 overflow-hidden rounded-full bg-muted"
                  >
                    <div
                      className="h-full rounded-full bg-primary"
                      style={{ width: `${a.percent}%` }}
                    />
                  </div>
                  <p className="text-xs text-muted-foreground tabular-nums">
                    {progressLabel(a)}
                  </p>
                </div>
              )}
            </div>
          </li>
        )
      })}
    </ul>
  )
}
