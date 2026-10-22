"use client"

import { Trash2 } from "lucide-react"

import { Button } from "@/components/ui/button"

import { deleteWorkout } from "../actions"

/** Asks first: deleting a workout can't be undone. */
export function DeleteWorkoutButton({ workoutId }: { workoutId: string }) {
  return (
    <form
      action={deleteWorkout.bind(null, workoutId)}
      onSubmit={(event) => {
        if (!window.confirm("Delete this workout? You can't undo this."))
          event.preventDefault()
      }}
    >
      <Button type="submit" variant="destructive" className="h-10 px-4">
        <Trash2 aria-hidden="true" />
        Delete workout
      </Button>
    </form>
  )
}
