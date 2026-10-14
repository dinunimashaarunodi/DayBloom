"use client"

import { CloudOff } from "lucide-react"

import { EmptyState } from "@/components/empty-state"
import { Button } from "@/components/ui/button"

/** Last-resort error page, e.g. when the app shell itself fails to load. */
export default function RootError({
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <main className="flex flex-1 items-center justify-center px-4 py-16">
      <EmptyState icon={CloudOff} title="Something went wrong">
        <p className="mb-4">
          DayBloom couldn&apos;t load just now. Please check your connection and
          try again.
        </p>
        <Button onClick={reset} variant="outline">
          Try again
        </Button>
      </EmptyState>
    </main>
  )
}
