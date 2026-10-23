"use client"

import {
  createContext,
  useContext,
  useState,
  useTransition,
  type ReactNode,
} from "react"

import { formatLocalDate, type LocalDate } from "@/lib/dates/local-date"
import { cn } from "@/lib/utils"

import { moveEventToDay } from "../actions"

/** Our own drag type, so drops of links, text or files are ignored. */
const MIME = "application/x-daybloom-event"

type Dragged = { id: string; from: LocalDate }

type DndContext = {
  saving: boolean
  move: (dragged: Dragged, to: LocalDate) => void
}

const Context = createContext<DndContext | null>(null)

/**
 * Drag events onto another day (desktop pointers). One move at a time:
 * Next.js sends actions one by one, so drops wait while a move saves.
 * Tasks are never draggable: moving one later would be a postpone shortcut.
 * Keyboard and touch users move events from the event's own page.
 */
export function CalendarDnd({ children }: { children: ReactNode }) {
  const [saving, startTransition] = useTransition()
  const [status, setStatus] = useState<{ text: string; error: boolean }>()

  function move(dragged: Dragged, to: LocalDate) {
    if (dragged.from === to) return
    startTransition(async () => {
      const result = await moveEventToDay(dragged.id, dragged.from, to)
      setStatus(
        result.error
          ? { text: result.error, error: true }
          : {
              text: `Moved "${result.title}" to ${formatLocalDate(to, "long")}.`,
              error: false,
            },
      )
    })
  }

  return (
    <Context.Provider value={{ saving, move }}>
      <div className={cn("grid gap-3", saving && "cursor-progress")}>
        <p
          role="status"
          className={cn(
            "min-h-5 text-sm",
            status?.error ? "text-destructive" : "text-muted-foreground",
          )}
        >
          {saving ? "Moving…" : status?.text}
        </p>
        {children}
      </div>
    </Context.Provider>
  )
}

function useDnd() {
  const context = useContext(Context)
  if (!context) throw new Error("Calendar drag and drop needs <CalendarDnd>")
  return context
}

/** Makes an event draggable from `from` (the day it's shown on). */
export function DraggableEvent({
  id,
  from,
  className,
  children,
}: {
  id: string
  from: LocalDate
  className?: string
  children: ReactNode
}) {
  const { saving } = useDnd()
  return (
    <span
      draggable={!saving}
      onDragStart={(event) => {
        event.dataTransfer.setData(MIME, JSON.stringify({ id, from }))
        event.dataTransfer.effectAllowed = "move"
      }}
      className={cn("cursor-grab active:cursor-grabbing", className)}
      title="Drag to another day"
    >
      {children}
    </span>
  )
}

/** A day that accepts dropped events, highlighted while one is over it. */
export function DropDay({
  day,
  className,
  children,
}: {
  day: LocalDate
  className?: string
  children: ReactNode
}) {
  const { saving, move } = useDnd()
  const [over, setOver] = useState(false)
  const accepts = (types: readonly string[]) => !saving && types.includes(MIME)

  return (
    <div
      data-drop-day={day}
      onDragOver={(event) => {
        if (!accepts(event.dataTransfer.types)) return
        event.preventDefault()
        event.dataTransfer.dropEffect = "move"
        setOver(true)
      }}
      onDragLeave={(event) => {
        // Ignore moving between this day's own children.
        if (!event.currentTarget.contains(event.relatedTarget as Node)) {
          setOver(false)
        }
      }}
      onDrop={(event) => {
        setOver(false)
        const data = event.dataTransfer.getData(MIME)
        if (!data) return
        event.preventDefault()
        move(JSON.parse(data) as Dragged, day)
      }}
      className={cn(
        "transition-shadow duration-150",
        over && "rounded-lg ring-2 ring-primary ring-inset",
        className,
      )}
    >
      {children}
    </div>
  )
}
