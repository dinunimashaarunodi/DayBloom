/**
 * CSV writing for data exports (RFC 4180: comma-separated, CRLF lines,
 * fields with commas, quotes or line breaks wrapped in double quotes).
 */

/** Byte-order mark: tells Excel the file is UTF-8 (names, emoji). */
export const BOM = String.fromCharCode(0xfeff)

export type CsvValue = string | number | boolean | null | undefined

/**
 * One cell. Text that a spreadsheet would run as a formula (starting with
 * = + - @, or a tab or carriage return) gets a leading apostrophe, so opening
 * an export can never execute anything (CSV injection). Numbers stay numbers.
 */
export function csvCell(value: CsvValue): string {
  if (value === null || value === undefined) return ""
  if (typeof value === "number" || typeof value === "boolean") {
    return String(value)
  }
  let text = value
  if (/^[=+\-@\t\r]/.test(text)) text = `'${text}`
  return /[",\r\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text
}

/** A header row plus one row per record, in the given column order. */
export function toCsv<T>(
  rows: readonly T[],
  columns: readonly { header: string; value: (row: T) => CsvValue }[],
): string {
  const lines = [
    columns.map((c) => csvCell(c.header)).join(","),
    ...rows.map((row) => columns.map((c) => csvCell(c.value(row))).join(",")),
  ]
  return `${BOM}${lines.join("\r\n")}\r\n`
}
