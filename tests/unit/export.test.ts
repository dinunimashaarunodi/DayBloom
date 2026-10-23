import { describe, expect, it } from "vitest"

import { BOM, csvCell, toCsv } from "@/features/export/csv"
import {
  ALL_TABLES,
  CSV_DATASETS,
  findDataset,
  withoutUserId,
} from "@/features/export/datasets"

describe("csvCell", () => {
  it("leaves plain values alone and blanks out missing ones", () => {
    expect(csvCell("Buy milk")).toBe("Buy milk")
    expect(csvCell(42)).toBe("42")
    expect(csvCell(-3.5)).toBe("-3.5")
    expect(csvCell(true)).toBe("true")
    expect(csvCell(null)).toBe("")
    expect(csvCell(undefined)).toBe("")
  })

  it("quotes commas, quotes and line breaks", () => {
    expect(csvCell("tea, milk")).toBe('"tea, milk"')
    expect(csvCell('say "hi"')).toBe('"say ""hi"""')
    expect(csvCell("line one\nline two")).toBe('"line one\nline two"')
  })

  it("neutralises text a spreadsheet would run as a formula", () => {
    expect(csvCell("=SUM(A1:A9)")).toBe("'=SUM(A1:A9)")
    expect(csvCell("+1 call")).toBe("'+1 call")
    expect(csvCell("-oops")).toBe("'-oops")
    expect(csvCell("@cmd")).toBe("'@cmd")
    expect(csvCell('=HYPERLINK("x","y")')).toBe(`"'=HYPERLINK(""x"",""y"")"`)
  })
})

describe("toCsv", () => {
  it("writes a header, CRLF rows and a UTF-8 byte-order mark", () => {
    const csv = toCsv(
      [
        { name: "Ama", note: "hi, there" },
        { name: "Kavi", note: null },
      ],
      [
        { header: "Name", value: (r) => r.name },
        { header: "Note", value: (r) => r.note },
      ],
    )
    expect(csv).toBe(`${BOM}Name,Note\r\nAma,"hi, there"\r\nKavi,\r\n`)
  })

  it("writes just the header when there are no rows", () => {
    expect(toCsv([], [{ header: "Name", value: () => "" }])).toBe(
      `${BOM}Name\r\n`,
    )
  })
})

describe("datasets", () => {
  it("formats money as a plain decimal in the currency's digits", () => {
    const money = findDataset("transactions")!
    const amount = money.columns.find((c) => c.header === "Amount")!
    expect(amount.value({ amount_minor: 125050, currency: "LKR" })).toBe(1250.5)
    expect(amount.value({ amount_minor: 1500, currency: "JPY" })).toBe(1500)
    const category = money.columns.find((c) => c.header === "Category")!
    expect(category.value({ finance_categories: { name: "Food" } })).toBe(
      "Food",
    )
    expect(category.value({ finance_categories: null })).toBeUndefined()
  })

  it("has unique keys and only exports known tables", () => {
    const keys = CSV_DATASETS.map((d) => d.key)
    expect(new Set(keys).size).toBe(keys.length)
    for (const d of CSV_DATASETS) {
      expect(ALL_TABLES).toContain(d.table)
    }
    expect(findDataset("nope")).toBeUndefined()
  })

  it("drops the owner column", () => {
    expect(withoutUserId([{ id: "1", user_id: "u", title: "x" }])).toEqual([
      { id: "1", title: "x" },
    ])
  })
})
