/**
 * Offline outbox: a few quick changes made while offline (adding a task,
 * ticking a task, habit check-ins) are kept on the device, per account, and
 * sent in order when the connection is back (see (app)/_outbox).
 *
 * Every change is safe to send twice: tasks carry an id chosen here, and the
 * others set a state rather than toggle it.
 */

export type OutboxChange =
  | { kind: "createTask"; id: string; title: string; dueDate: string | null }
  | { kind: "setTaskDone"; id: string; done: boolean }
  | { kind: "setCheckIn"; habitId: string; date: string; done: boolean }

export type OutboxItem = OutboxChange & { key: string; queuedAt: string }

/** Changes to the same thing replace each other; only the latest is sent. */
function sameTarget(a: OutboxChange, b: OutboxChange): boolean {
  if (a.kind === "setTaskDone" && b.kind === "setTaskDone") return a.id === b.id
  if (a.kind === "setCheckIn" && b.kind === "setCheckIn") {
    return a.habitId === b.habitId && a.date === b.date
  }
  return false
}

/**
 * Adds a change to the end of the queue, replacing an earlier one for the
 * same thing (ticking a task twice offline sends only the final state).
 */
export function enqueue(
  items: readonly OutboxItem[],
  change: OutboxChange,
  now: Date,
  key: string,
): OutboxItem[] {
  return [
    ...items.filter((i) => !sameTarget(i, change)),
    { ...change, key, queuedAt: now.toISOString() },
  ]
}

/** Task states to show while their changes wait to be sent. */
export function pendingTaskDone(
  items: readonly OutboxItem[],
): Map<string, boolean> {
  return new Map(
    items.flatMap((i) => (i.kind === "setTaskDone" ? [[i.id, i.done]] : [])),
  )
}

/** Habit check-ins waiting to be sent, keyed "habitId|date". */
export function pendingCheckIns(
  items: readonly OutboxItem[],
): Map<string, boolean> {
  return new Map(
    items.flatMap((i) =>
      i.kind === "setCheckIn" ? [[`${i.habitId}|${i.date}`, i.done]] : [],
    ),
  )
}

// ---------------------------------------------------------------------------
// Device storage (browser only). One queue per account, so one person's
// changes are never sent from someone else's session on a shared device.
// ---------------------------------------------------------------------------

const PREFIX = "daybloom-outbox-v1:"
const EMPTY: OutboxItem[] = []
let currentUser: string | null = null
let cache: { user: string | null; raw: string | null; items: OutboxItem[] } = {
  user: null,
  raw: null,
  items: EMPTY,
}
const listeners = new Set<() => void>()

function read(user: string | null): OutboxItem[] {
  if (!user) return EMPTY
  let raw: string | null = null
  try {
    raw = localStorage.getItem(PREFIX + user)
  } catch {
    return EMPTY
  }
  if (cache.user === user && cache.raw === raw) return cache.items
  let items = EMPTY
  try {
    items = raw ? (JSON.parse(raw) as OutboxItem[]) : EMPTY
  } catch {
    items = EMPTY
  }
  cache = { user, raw, items }
  return items
}

function write(items: OutboxItem[]) {
  if (!currentUser) return
  try {
    if (items.length === 0) localStorage.removeItem(PREFIX + currentUser)
    else localStorage.setItem(PREFIX + currentUser, JSON.stringify(items))
  } catch {
    // Storage full or blocked: the change can't be kept; callers say so.
    throw new Error("outbox unavailable")
  }
  listeners.forEach((listener) => listener())
}

/** Set by the sync component once the signed-in account is known. */
export function setOutboxUser(user: string | null) {
  currentUser = user
  listeners.forEach((listener) => listener())
}

export function outboxItems(): OutboxItem[] {
  return read(currentUser)
}

export function subscribeOutbox(listener: () => void) {
  listeners.add(listener)
  const onStorage = (event: StorageEvent) => {
    if (event.key?.startsWith(PREFIX)) listener()
  }
  window.addEventListener("storage", onStorage)
  return () => {
    listeners.delete(listener)
    window.removeEventListener("storage", onStorage)
  }
}

/** Queues a change for this account. False when it can't be kept. */
export function queueChange(change: OutboxChange): boolean {
  if (!currentUser) return false
  try {
    write(enqueue(read(currentUser), change, new Date(), crypto.randomUUID()))
    return true
  } catch {
    return false
  }
}

/** Removes an item once it was sent (or refused). */
export function removeQueued(key: string) {
  write(read(currentUser).filter((i) => i.key !== key))
}

export function isOffline(): boolean {
  return typeof navigator !== "undefined" && navigator.onLine === false
}
