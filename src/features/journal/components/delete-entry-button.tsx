"use client"

import { Trash2 } from "lucide-react"

import { Button } from "@/components/ui/button"

import { deleteEntry } from "../actions"

/** Asks first: deleting an entry can't be undone. */
export function DeleteEntryButton({ entryId }: { entryId: string }) {
  return (
    <form
      action={deleteEntry.bind(null, entryId)}
      onSubmit={(event) => {
        if (!window.confirm("Delete this entry? You can't undo this."))
          event.preventDefault()
      }}
    >
      <Button type="submit" variant="destructive" className="h-10 px-4">
        <Trash2 aria-hidden="true" />
        Delete entry
      </Button>
    </form>
  )
}
