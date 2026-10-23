"use server"

import { z } from "zod"

import { setCheckIn } from "@/features/habits/actions"
import { createTaskWithId, setTaskDone } from "@/features/tasks/actions"

const itemSchema = z.discriminatedUnion("kind", [
  z.object({
    kind: z.literal("createTask"),
    id: z.uuid(),
    title: z.string(),
    dueDate: z.string().nullable(),
  }),
  z.object({ kind: z.literal("setTaskDone"), id: z.uuid(), done: z.boolean() }),
  z.object({
    kind: z.literal("setCheckIn"),
    habitId: z.uuid(),
    date: z.string(),
    done: z.boolean(),
  }),
])

/**
 * Sends one change that was made while offline. "refused" means the server
 * won't accept it (e.g. a check-in now outside the 7-day window), so the
 * device stops retrying it. A dropped connection throws, and it's retried.
 */
export async function replayOutboxItem(
  item: unknown,
): Promise<{ status: "saved" | "refused" }> {
  const parsed = itemSchema.safeParse(item)
  if (!parsed.success) return { status: "refused" }
  const change = parsed.data
  const result =
    change.kind === "createTask"
      ? await createTaskWithId(change.id, change.title, change.dueDate)
      : change.kind === "setTaskDone"
        ? await setTaskDone(change.id, change.done)
        : await setCheckIn(change.habitId, change.date, change.done)
  return { status: result.error ? "refused" : "saved" }
}
