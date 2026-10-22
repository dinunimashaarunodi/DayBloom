import type * as React from "react"

import { cn } from "@/lib/utils"

/**
 * A circular progress indicator with its value in the middle. Colours come
 * from `currentColor` (the arc) and `trackClassName` (the track), so it works
 * on cards and on the bloom gradient alike.
 */
export function ProgressRing({
  value,
  max,
  label,
  size = 112,
  stroke = 10,
  className,
  trackClassName = "stroke-muted",
  children,
}: {
  value: number
  max: number
  /** Accessible name, e.g. "Today's tasks completed". */
  label: string
  size?: number
  stroke?: number
  className?: string
  trackClassName?: string
  /** Shown in the centre (defaults to the percentage). */
  children?: React.ReactNode
}) {
  const radius = (size - stroke) / 2
  const circumference = 2 * Math.PI * radius
  const share = max === 0 ? 0 : Math.min(1, value / max)
  const percent = Math.round(share * 100)

  return (
    <div
      role="progressbar"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={max}
      aria-valuenow={value}
      aria-valuetext={`${value} of ${max}`}
      className={cn("relative grid shrink-0 place-items-center", className)}
      style={{ width: size, height: size }}
    >
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        className="-rotate-90"
        aria-hidden="true"
      >
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          strokeWidth={stroke}
          className={trackClassName}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={circumference * (1 - share)}
          className="transition-[stroke-dashoffset] duration-700 ease-out"
        />
      </svg>
      <div className="absolute inset-0 grid place-items-center text-center">
        {children ?? (
          <span className="text-xl font-semibold tabular-nums">{percent}%</span>
        )}
      </div>
    </div>
  )
}
