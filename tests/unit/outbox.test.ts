import { describe, expect, it } from "vitest"

import {
  enqueue,
  pendingCheckIns,
  pendingTaskDone,
  type OutboxItem,
} from "@/lib/outbox"

const NOW = new Date("2026-10-23T08:00:00Z")
let n = 0
const add = (items: OutboxItem[], change: Parameters<typeof enqueue>[1]) =>
  enqueue(items, change, NOW, `k${n++}`)

describe("enqueue", () => {
  it("keeps changes in the order they were made", () => {
    let items: OutboxItem[] = []
    items = add(items, {
      kind: "createTask",
      id: "t1",
      title: "A",
      dueDate: null,
    })
    items = add(items, { kind: "setTaskDone", id: "t2", done: true })
    items = add(items, {
      kind: "setCheckIn",
      habitId: "h1",
      date: "2026-10-23",
      done: true,
    })
    expect(items.map((i) => i.kind)).toEqual([
      "createTask",
      "setTaskDone",
      "setCheckIn",
    ])
    expect(items[0]).toMatchObject({ queuedAt: NOW.toISOString() })
  })

  it("sends only the latest state for the same task or check-in", () => {
    let items: OutboxItem[] = []
    items = add(items, { kind: "setTaskDone", id: "t1", done: true })
    items = add(items, {
      kind: "setCheckIn",
      habitId: "h",
      date: "d1",
      done: true,
    })
    items = add(items, { kind: "setTaskDone", id: "t1", done: false })
    items = add(items, {
      kind: "setCheckIn",
      habitId: "h",
      date: "d2",
      done: true,
    })
    items = add(items, {
      kind: "setCheckIn",
      habitId: "h",
      date: "d1",
      done: false,
    })
    expect(items).toMatchObject([
      { kind: "setTaskDone", id: "t1", done: false },
      { kind: "setCheckIn", date: "d2", done: true },
      { kind: "setCheckIn", date: "d1", done: false },
    ])
  })

  it("never merges new tasks, even with the same title", () => {
    let items: OutboxItem[] = []
    items = add(items, {
      kind: "createTask",
      id: "a",
      title: "Milk",
      dueDate: null,
    })
    items = add(items, {
      kind: "createTask",
      id: "b",
      title: "Milk",
      dueDate: null,
    })
    expect(items).toHaveLength(2)
  })

  it("ticks a task that is itself still waiting, after creating it", () => {
    let items: OutboxItem[] = []
    items = add(items, {
      kind: "createTask",
      id: "t",
      title: "A",
      dueDate: null,
    })
    items = add(items, { kind: "setTaskDone", id: "t", done: true })
    expect(items.map((i) => i.kind)).toEqual(["createTask", "setTaskDone"])
  })
})

describe("pending states", () => {
  it("shows waiting ticks and check-ins", () => {
    let items: OutboxItem[] = []
    items = add(items, { kind: "setTaskDone", id: "t1", done: true })
    items = add(items, {
      kind: "setCheckIn",
      habitId: "h",
      date: "d",
      done: false,
    })
    expect(pendingTaskDone(items)).toEqual(new Map([["t1", true]]))
    expect(pendingCheckIns(items)).toEqual(new Map([["h|d", false]]))
  })
})
