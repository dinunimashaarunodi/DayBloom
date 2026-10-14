"use client"

import { Trash2 } from "lucide-react"

import { Button } from "@/components/ui/button"

import { deleteEvent } from "../actions"

export function DeleteEventButton({ eventId }: { eventId: string }) {
  return (
    <form
      action={deleteEvent.bind(null, eventId)}
      onSubmit={(event) => {
        if (!window.confirm("Delete this event? You can't undo this."))
          event.preventDefault()
      }}
    >
      <Button type="submit" variant="destructive" className="h-10 px-4">
        <Trash2 aria-hidden="true" />
        Delete event
      </Button>
    </form>
  )
}
