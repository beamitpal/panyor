export interface CsvExportOptions {
  filename: string
  columns: { header: string; key: string }[]
  // Rows are heterogeneous domain objects; values are read by key and stringified.
  data: object[]
}

function readCell(item: object, key: string): unknown {
  return (item as Record<string, unknown>)[key]
}

export function exportToCsv({ filename, columns, data }: CsvExportOptions) {
  const headers = columns.map((c) => `"${c.header.replace(/"/g, '""')}"`).join(",")

  const rows = data.map((item) =>
    columns
      .map((c) => {
        const cell = readCell(item, c.key)
        const val = cell !== undefined && cell !== null ? String(cell) : ""
        return `"${val.replace(/"/g, '""')}"`
      })
      .join(",")
  )

  const csvContent = [headers, ...rows].join("\r\n")
  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" })
  const url = URL.createObjectURL(blob)

  const link = document.createElement("a")
  link.setAttribute("href", url)
  link.setAttribute("download", `${filename}.csv`)
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
}
