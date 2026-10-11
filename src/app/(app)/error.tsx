"use client"

import { CloudOff } from "lucide-react"

import { EmptyState } from "@/components/empty-state"
import { Button } from "@/components/ui/button"

export default function AppError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <EmptyState icon={CloudOff} title="Something went wrong">
      <p className="mb-4">We couldn&apos;t load this page. Check your connection and try again.</p>
      <Button onClick={reset} variant="outline">
        Try again
      </Button>
    </EmptyState>
  )
}
