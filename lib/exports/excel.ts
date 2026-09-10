import * as XLSX from "xlsx"

export interface ExcelExportOptions {
  filename: string
  sheetName?: string
  title?: string
  // Rows are heterogeneous domain objects; values are read by key.
  data: object[]
  columns?: { header: string; key: string; width?: number }[]
}

export function exportToExcel({
  filename,
  sheetName = "Report",
  title: _title = "Panyor Hall of Residence - Rajiv Gandhi University",
  data,
  columns,
}: ExcelExportOptions) {
  void _title
  let exportData: Record<string, unknown>[] = []

  if (columns && columns.length > 0) {
    exportData = data.map((item) => {
      const row: Record<string, unknown> = {}
      const source = item as Record<string, unknown>
      for (const col of columns) {
        const cell = source[col.key]
        row[col.header] = cell !== undefined && cell !== null ? cell : "-"
      }
      return row
    })
  } else {
    exportData = data.map((item) => ({ ...(item as Record<string, unknown>) }))
  }

  const worksheet = XLSX.utils.json_to_sheet(exportData)

  // Set column widths if provided
  if (columns && columns.length > 0) {
    worksheet["!cols"] = columns.map((c) => ({ wch: c.width || Math.max(c.header.length + 4, 14) }))
  }

  const workbook = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(workbook, worksheet, sheetName)

  // Trigger download
  XLSX.writeFile(workbook, `${filename}.xlsx`)
}
