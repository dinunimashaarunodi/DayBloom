import type { Metadata } from "next"
import { notFound } from "next/navigation"
import { Suspense } from "react"

import { BackLink } from "@/components/layout/back-link"
import { PageHeader } from "@/components/layout/page-header"
import { Separator } from "@/components/ui/separator"
import { Skeleton } from "@/components/ui/skeleton"
import { getUserToday } from "@/features/tasks/queries"
import { updateWorkout } from "@/features/workouts/actions"
import { DeleteWorkoutButton } from "@/features/workouts/components/delete-workout-button"
import { WorkoutForm } from "@/features/workouts/components/workout-form"
import { getWorkout } from "@/features/workouts/queries"
import { workoutIdSchema } from "@/features/workouts/schema"

export const metadata: Metadata = { title: "Edit workout" }

export default function WorkoutPage({ params }: PageProps<"/workouts/[id]">) {
  return (
    <>
      <BackLink href="/workouts" label="Workouts" />
      <PageHeader title="Edit workout" />
      <Suspense fallback={<Skeleton className="h-96" />}>
        <WorkoutEditor params={params} />
      </Suspense>
    </>
  )
}

async function WorkoutEditor({
  params,
}: Pick<PageProps<"/workouts/[id]">, "params">) {
  const { id } = await params
  if (!workoutIdSchema.safeParse(id).success) notFound()
  const [workout, { today }] = await Promise.all([
    getWorkout(id),
    getUserToday(),
  ])
  if (!workout) notFound()

  return (
    <div className="grid max-w-2xl gap-8">
      <WorkoutForm
        action={updateWorkout.bind(null, workout.id)}
        submitLabel="Save changes"
        today={today}
        workout={workout}
      />
      <Separator />
      <DeleteWorkoutButton workoutId={workout.id} />
    </div>
  )
}
