"use client"

import { Check, Eye, PartyPopper, RotateCcw } from "lucide-react"
import Link from "next/link"
import { useState, useTransition } from "react"

import { Button, buttonVariants } from "@/components/ui/button"
import { cn } from "@/lib/utils"

import { reviewWord } from "../actions"
import type { Word } from "../logic"

/**
 * Flip-card review of the words due today (spaced repetition). The deck order
 * comes from the server, so the first render matches on both sides.
 * "Got it" moves a word to a longer interval; "Still learning" brings it back
 * tomorrow and once more at the end of this session.
 */
export function Flashcards({
  deck: initialDeck,
  backHref,
}: {
  deck: Word[]
  backHref: string
}) {
  // Keep this session's deck: each answer revalidates the page, which must
  // not change the cards mid-review.
  const [deck, setDeck] = useState(initialDeck)
  const [index, setIndex] = useState(0)
  const [flipped, setFlipped] = useState(false)
  const [stats, setStats] = useState({ remembered: 0, again: 0, learned: 0 })
  const [retried, setRetried] = useState<ReadonlySet<string>>(new Set())
  const [saving, startTransition] = useTransition()
  const [error, setError] = useState<string>()

  const word = deck[index]
  const words = initialDeck.length

  function answer(card: Word, remembered: boolean) {
    startTransition(async () => {
      const result = await reviewWord(card.id, remembered)
      if (result.error) {
        setError(result.error)
        return
      }
      setError(undefined)
      setStats((s) => ({
        remembered: s.remembered + (remembered ? 1 : 0),
        again: s.again + (remembered ? 0 : 1),
        learned: s.learned + (result.learned ? 1 : 0),
      }))
      // A forgotten word comes round once more before the session ends.
      if (!remembered && !retried.has(card.id)) {
        setDeck((d) => [...d, card])
        setRetried((r) => new Set(r).add(card.id))
      }
      setFlipped(false)
      setIndex((i) => i + 1)
    })
  }

  if (!word) {
    return (
      <div className="grid animate-in justify-items-center gap-3 surface p-8 text-center duration-300 zoom-in-95 fade-in">
        <PartyPopper className="size-8 text-gold" aria-hidden="true" />
        <p className="text-lg font-medium" role="status">
          Review done!
        </p>
        <p className="max-w-sm text-sm text-muted-foreground">
          You went through {words} word{words === 1 ? "" : "s"}.
          {stats.learned > 0 &&
            ` ${stats.learned} ${stats.learned === 1 ? "is" : "are"} now learned.`}{" "}
          Words you knew come back later; the tricky ones come back tomorrow.
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
      <div className="flex items-center justify-between gap-2 text-sm text-muted-foreground tabular-nums">
        <p>
          Card {index + 1} of {deck.length}
        </p>
        {index >= words && <p>One more look</p>}
      </div>
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
              onClick={() => answer(word, false)}
            >
              <RotateCcw aria-hidden="true" />
              Still learning
            </Button>
            <Button
              type="button"
              className="h-10 px-4"
              disabled={saving}
              onClick={() => answer(word, true)}
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
