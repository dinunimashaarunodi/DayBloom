import { minorToInput } from "@/lib/money"

import type { CsvValue } from "./csv"

/** Every table holding a user's data, for the complete JSON export. */
export const ALL_TABLES = [
  "profiles",
  "tasks",
  "events",
  "days",
  "habits",
  "habit_logs",
  "focus_sessions",
  "workouts",
  "goals",
  "goal_milestones",
  "languages",
  "language_practice",
  "language_words",
  "finance_categories",
  "transactions",
  "budgets",
  "journal_entries",
  "achievement_seen",
] as const

export type TableName = (typeof ALL_TABLES)[number]

type Row = Record<string, unknown>
type Column = { header: string; value: (row: Row) => CsvValue }

const text = (key: string) => (row: Row) => row[key] as CsvValue
const nested = (relation: string, key: string) => (row: Row) =>
  (row[relation] as Row | null)?.[key] as CsvValue

export type CsvDataset = {
  key: string
  label: string
  table: TableName
  /** PostgREST select (may embed a related table). */
  select: string
  /** Column to sort by, oldest first. */
  orderBy: string
  /** Leave out soft-deleted rows. */
  skipDeleted?: true
  /** Only rows where this column is set. */
  onlyWith?: string
  columns: Column[]
}

/** Spreadsheet-friendly exports, one CSV each. */
export const CSV_DATASETS: CsvDataset[] = [
  {
    key: "tasks",
    label: "Tasks",
    table: "tasks",
    select:
      "title, notes, status, priority, due_date, completed_at, created_at",
    orderBy: "created_at",
    skipDeleted: true,
    columns: [
      { header: "Title", value: text("title") },
      { header: "Notes", value: text("notes") },
      { header: "Status", value: text("status") },
      { header: "Priority", value: text("priority") },
      { header: "Due date", value: text("due_date") },
      { header: "Completed at", value: text("completed_at") },
      { header: "Created at", value: text("created_at") },
    ],
  },
  {
    key: "transactions",
    label: "Income and expenses",
    table: "transactions",
    select:
      "occurred_on, kind, amount_minor, currency, note, finance_categories(name)",
    orderBy: "occurred_on",
    skipDeleted: true,
    columns: [
      { header: "Date", value: text("occurred_on") },
      { header: "Type", value: text("kind") },
      { header: "Category", value: nested("finance_categories", "name") },
      {
        header: "Amount",
        // A plain decimal ("1250.50") that spreadsheets read as a number.
        value: (row) =>
          Number(minorToInput(Number(row.amount_minor), String(row.currency))),
      },
      { header: "Currency", value: text("currency") },
      { header: "Note", value: text("note") },
    ],
  },
  {
    key: "habit-check-ins",
    label: "Habit check-ins",
    table: "habit_logs",
    select: "local_date, habits(name)",
    orderBy: "local_date",
    columns: [
      { header: "Date", value: text("local_date") },
      { header: "Habit", value: nested("habits", "name") },
    ],
  },
  {
    key: "workouts",
    label: "Workouts",
    table: "workouts",
    select: "local_date, kind, title, duration_minutes, effort, notes",
    orderBy: "local_date",
    columns: [
      { header: "Date", value: text("local_date") },
      { header: "Type", value: text("kind") },
      { header: "Title", value: text("title") },
      { header: "Minutes", value: text("duration_minutes") },
      { header: "Effort (1 easy to 3 hard)", value: text("effort") },
      { header: "Notes", value: text("notes") },
    ],
  },
  {
    key: "focus-sessions",
    label: "Focus sessions",
    table: "focus_sessions",
    select: "label, planned_minutes, started_at, ended_at",
    orderBy: "started_at",
    columns: [
      { header: "Label", value: text("label") },
      { header: "Planned minutes", value: text("planned_minutes") },
      { header: "Started at", value: text("started_at") },
      { header: "Ended at", value: text("ended_at") },
    ],
  },
  {
    key: "reflections",
    label: "Daily reflections",
    table: "days",
    select: "local_date, mood, energy, wins, reflection",
    orderBy: "local_date",
    onlyWith: "reviewed_at",
    columns: [
      { header: "Date", value: text("local_date") },
      { header: "Mood (1 to 5)", value: text("mood") },
      { header: "Energy (1 to 5)", value: text("energy") },
      { header: "What went well", value: text("wins") },
      { header: "Anything to remember", value: text("reflection") },
    ],
  },
  {
    key: "journal",
    label: "Journal entries",
    table: "journal_entries",
    select: "local_date, title, body, created_at",
    orderBy: "local_date",
    columns: [
      { header: "Date", value: text("local_date") },
      { header: "Title", value: text("title") },
      { header: "Entry", value: text("body") },
      { header: "Written at", value: text("created_at") },
    ],
  },
]

export function findDataset(key: string): CsvDataset | undefined {
  return CSV_DATASETS.find((d) => d.key === key)
}

/** Drops the owner column, which is the same on every row. */
export function withoutUserId(rows: Row[]): Row[] {
  return rows.map((row) => {
    const copy = { ...row }
    delete copy.user_id
    return copy
  })
}
