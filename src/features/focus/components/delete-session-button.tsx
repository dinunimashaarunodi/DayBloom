"use client"

import { Trash2 } from "lucide-react"

import { Button } from "@/components/ui/button"

import { deleteFocusSession } from "../actions"

export function DeleteSessionButton({
  sessionId,
  name,
}: {
  sessionId: string
  name: string
}) {
  return (
    <form
      action={deleteFocusSession.bind(null, sessionId)}
      onSubmit={(event) => {
        if (!window.confirm("Delete this session? You can't undo this."))
          event.preventDefault()
      }}
    >
      <Button
        type="submit"
        variant="ghost"
        size="icon"
        className="size-9 text-muted-foreground"
        aria-label={`Delete session: ${name}`}
      >
        <Trash2 aria-hidden="true" />
      </Button>
    </form>
  )
}
