"use client"

import { X } from "lucide-react"
import { useOptimistic, useState, useTransition } from "react"

import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { cn } from "@/lib/utils"

import { deleteWord, setWordLearned } from "../actions"
import type { Word } from "../logic"

type Change = { id: string; learned?: boolean; removed?: boolean }

/**
 * The vocabulary list: mark words as learned or remove them. Controls are
 * disabled while a change saves (Next.js sends actions one at a time).
 */
export function WordList({ words }: { words: Word[] }) {
  const [items, apply] = useOptimistic(words, (current, change: Change) =>
    change.removed
      ? current.filter((w) => w.id !== change.id)
      : current.map((w) =>
          w.id === change.id
            ? { ...w, learned: change.learned ?? w.learned }
            : w,
        ),
  )
  const [saving, startTransition] = useTransition()
  const [error, setError] = useState<string>()

  function run(change: Change, save: () => Promise<{ error?: string }>) {
    startTransition(async () => {
      apply(change)
      setError((await save()).error)
    })
  }

  return (
    <div className="grid gap-2">
      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}
      <ul aria-label="Words" className="divide-y overflow-hidden surface">
        {items.map((w) => (
          <li key={w.id} className="flex items-start gap-3 px-4 py-3">
            <Checkbox
              className="mt-0.5 size-5 rounded-md"
              disabled={saving}
              checked={w.learned}
              onCheckedChange={(checked) =>
                run({ id: w.id, learned: checked === true }, () =>
                  setWordLearned(w.id, checked === true),
                )
              }
              aria-label={`${w.learned ? "Mark as still learning" : "Mark as learned"}: ${w.term}`}
            />
            <div className="grid min-w-0 flex-1 gap-0.5">
              <p className="text-sm break-words">
                <span
                  className={cn(
                    "font-medium",
                    w.learned && "text-muted-foreground",
                  )}
                >
                  {w.term}
                </span>
                <span className="text-muted-foreground"> · {w.meaning}</span>
              </p>
              {w.example && (
                <p className="text-xs break-words text-muted-foreground italic">
                  {w.example}
                </p>
              )}
              {w.learned && (
                <p className="text-xs font-medium text-sage-ink">Learned</p>
              )}
            </div>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="size-9 shrink-0 text-muted-foreground"
              disabled={saving}
              aria-label={`Remove word: ${w.term}`}
              onClick={() =>
                run({ id: w.id, removed: true }, () => deleteWord(w.id))
              }
            >
              <X aria-hidden="true" />
            </Button>
          </li>
        ))}
      </ul>
    </div>
  )
}
