import {
  Archive,
  ArchiveRestore,
  PartyPopper,
  RotateCcw,
  Trophy,
} from "lucide-react"
import type { Metadata } from "next"
import { notFound } from "next/navigation"
import { Suspense } from "react"

import { BackLink } from "@/components/layout/back-link"
import { PageHeader } from "@/components/layout/page-header"
import { Section } from "@/components/layout/section"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { Skeleton } from "@/components/ui/skeleton"
import { setGoalStatus, updateGoal } from "@/features/goals/actions"
import { GoalForm } from "@/features/goals/components/goal-form"
import { GoalProgress } from "@/features/goals/components/goal-progress"
import { MilestoneList } from "@/features/goals/components/milestone-list"
import { readyToAchieve, targetLabel } from "@/features/goals/logic"
import { getGoal } from "@/features/goals/queries"
import { idSchema } from "@/features/goals/schema"
import { getProfile } from "@/features/profile/queries"
import { formatLocalDate, toLocalDate } from "@/lib/dates/local-date"

export const metadata: Metadata = { title: "Goal" }

export default function GoalPage({ params }: PageProps<"/goals/[id]">) {
  return (
    <>
      <BackLink href="/goals" label="Goals" />
      <Suspense fallback={<Skeleton className="h-96" />}>
        <GoalDetail params={params} />
      </Suspense>
    </>
  )
}

async function GoalDetail({
  params,
}: Pick<PageProps<"/goals/[id]">, "params">) {
  const { id } = await params
  if (!idSchema.safeParse(id).success) notFound()
  const [{ today, goal }, { timezone }] = await Promise.all([
    getGoal(id),
    getProfile(),
  ])
  if (!goal) notFound()

  const active = goal.status === "active"
  const status = (next: string) => setGoalStatus.bind(null, goal.id, next)

  return (
    <>
      <PageHeader
        eyebrow={
          goal.status === "achieved"
            ? "Achieved"
            : goal.status === "archived"
              ? "Archived"
              : targetLabel(goal.target_date, today)
        }
        title={goal.title}
        description={goal.why}
      />
      <div className="grid gap-8">
        {goal.status === "achieved" && goal.achieved_at && (
          <div className="flex animate-in items-center gap-3 surface p-4 duration-500 zoom-in-95 fade-in">
            <Trophy className="size-6 shrink-0 text-gold" aria-hidden="true" />
            <p className="text-sm">
              <span className="font-medium">You did it!</span> Achieved on{" "}
              {formatLocalDate(
                toLocalDate(new Date(goal.achieved_at), timezone),
                "longYear",
              )}
              .
            </p>
          </div>
        )}

        <Section id="milestones" title="Milestones">
          <GoalProgress milestones={goal.milestones} label={goal.title} />
          <MilestoneList
            goalId={goal.id}
            milestones={goal.milestones}
            editable={goal.status !== "archived"}
          />
          {active && readyToAchieve(goal.milestones) && (
            <form
              action={status("achieved")}
              className="flex flex-wrap items-center gap-3 surface p-4"
            >
              <PartyPopper
                className="size-5 shrink-0 text-gold"
                aria-hidden="true"
              />
              <p className="flex-1 text-sm">
                Every milestone is done. Ready to celebrate?
              </p>
              <Button type="submit" className="h-10 px-4">
                Mark as achieved
              </Button>
            </form>
          )}
        </Section>

        {goal.status !== "archived" && (
          <Section id="edit" title="Edit goal">
            <div className="max-w-xl">
              <GoalForm
                action={updateGoal.bind(null, goal.id)}
                submitLabel="Save changes"
                goal={goal}
              />
            </div>
          </Section>
        )}

        <Separator />
        <div className="flex flex-wrap gap-2">
          {active && !readyToAchieve(goal.milestones) && (
            <form action={status("achieved")}>
              <Button type="submit" variant="outline" className="h-10 px-4">
                <Trophy aria-hidden="true" />
                Mark as achieved
              </Button>
            </form>
          )}
          {goal.status === "achieved" && (
            <form action={status("active")}>
              <Button type="submit" variant="outline" className="h-10 px-4">
                <RotateCcw aria-hidden="true" />
                Back to in progress
              </Button>
            </form>
          )}
          {goal.status === "archived" ? (
            <form action={status("active")}>
              <Button type="submit" variant="outline" className="h-10 px-4">
                <ArchiveRestore aria-hidden="true" />
                Restore goal
              </Button>
            </form>
          ) : (
            <form action={status("archived")}>
              <Button type="submit" variant="outline" className="h-10 px-4">
                <Archive aria-hidden="true" />
                Archive goal
              </Button>
            </form>
          )}
        </div>
        {goal.status !== "archived" && (
          <p className="-mt-6 text-xs text-muted-foreground">
            Archiving puts a goal aside without deleting it. You can restore it
            any time.
          </p>
        )}
      </div>
    </>
  )
}
