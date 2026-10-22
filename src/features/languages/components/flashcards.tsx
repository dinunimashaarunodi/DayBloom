"use client"

import { Check, Eye, PartyPopper, RotateCcw } from "lucide-react"
import Link from "next/link"
import { useState, useTransition } from "react"

import { Button, buttonVariants } from "@/components/ui/button"
import { cn } from "@/lib/utils"

import { setWordLearned } from "../actions"
import type { Word } from "../logic"

/**
 * Flip-card review of words still being learned. The deck order comes from
 * the server, so the first render matches on both sides. "Got it" marks the
 * word as learned; "Still learning" just moves on.
 */
export function Flashcards({
  deck: initialDeck,
  backHref,
}: {
  deck: Word[]
  backHref: string
}) {
  // Keep this session's deck: marking a word learned re-renders the page with
  // a new (smaller, reshuffled) deck, which must not change the cards mid-review.
  const [deck] = useState(initialDeck)
  const [index, setIndex] = useState(0)
  const [flipped, setFlipped] = useState(false)
  const [learned, setLearned] = useState(0)
  const [saving, startTransition] = useTransition()
  const [error, setError] = useState<string>()

  const word = deck[index]

  function next() {
    setFlipped(false)
    setIndex((i) => i + 1)
  }

  function gotIt(id: string) {
    startTransition(async () => {
      const result = await setWordLearned(id, true)
      if (result.error) {
        setError(result.error)
        return
      }
      setError(undefined)
      setLearned((n) => n + 1)
      next()
    })
  }

  if (!word) {
    return (
      <div className="grid animate-in justify-items-center gap-3 surface p-8 text-center duration-300 zoom-in-95 fade-in">
        <PartyPopper className="size-8 text-gold" aria-hidden="true" />
        <p className="text-lg font-medium" role="status">
          Review done!
        </p>
        <p className="text-sm text-muted-foreground">
          You went through {deck.length} word{deck.length === 1 ? "" : "s"}
          {learned > 0 && ` and marked ${learned} as learned`}.
        </p>
        <Link
          href={backHref}
          className={cn(buttonVariants(), "mt-2 h-10 px-4")}
        >
          Back to words
        </Link>
      </div>
    )
  }

  return (
    <div className="grid gap-4">
      <p className="text-sm text-muted-foreground tabular-nums">
        Card {index + 1} of {deck.length}
      </p>
      <div
        className="grid min-h-52 place-items-center gap-3 surface p-6 text-center"
        aria-live="polite"
      >
        <p className="text-2xl font-semibold break-words sm:text-3xl">
          {word.term}
        </p>
        {flipped && (
          <div className="grid animate-in gap-1 duration-200 fade-in">
            <p className="text-lg">{word.meaning}</p>
            {word.example && (
              <p className="text-sm text-muted-foreground italic">
                {word.example}
              </p>
            )}
          </div>
        )}
      </div>
      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}
      <div className="flex flex-wrap justify-center gap-2">
        {!flipped ? (
          <Button
            type="button"
            className="h-10 px-4"
            onClick={() => setFlipped(true)}
          >
            <Eye aria-hidden="true" />
            Show meaning
          </Button>
        ) : (
          <>
            <Button
              type="button"
              variant="outline"
              className="h-10 px-4"
              disabled={saving}
              onClick={next}
            >
              <RotateCcw aria-hidden="true" />
              Still learning
            </Button>
            <Button
              type="button"
              className="h-10 px-4"
              disabled={saving}
              onClick={() => gotIt(word.id)}
            >
              <Check aria-hidden="true" />
              {saving ? "Saving…" : "Got it"}
            </Button>
          </>
        )}
      </div>
    </div>
  )
}
