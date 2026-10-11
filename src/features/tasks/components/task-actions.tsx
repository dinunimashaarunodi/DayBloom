"use client"

import { Leaf, Trash2 } from "lucide-react"

import { Button } from "@/components/ui/button"

import { deleteTask, letGoTask } from "../actions"

/** "Let it go" and "Delete", each a small form so they work without JavaScript. */
export function TaskActions({
  taskId,
  canLetGo,
}: {
  taskId: string
  canLetGo: boolean
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {canLetGo && (
        <form action={letGoTask.bind(null, taskId)}>
          <Button type="submit" variant="outline" className="h-10 px-4">
            <Leaf aria-hidden="true" />
            Let it go
          </Button>
        </form>
      )}
      <form
        action={deleteTask.bind(null, taskId)}
        onSubmit={(event) => {
          if (!window.confirm("Delete this task? You can't undo this."))
            event.preventDefault()
        }}
      >
        <Button type="submit" variant="destructive" className="h-10 px-4">
          <Trash2 aria-hidden="true" />
          Delete
        </Button>
      </form>
    </div>
  )
}
