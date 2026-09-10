"use client"

import * as React from "react"
import { Download, FileSpreadsheet, FileText, Printer, FileCode } from "lucide-react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { exportToExcel } from "@/lib/exports/excel"
import { exportToPdf } from "@/lib/exports/pdf"
import { exportToCsv } from "@/lib/exports/csv"
import { toast } from "sonner"

export interface ExportModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  filename: string
  // Rows are heterogeneous domain objects; export helpers read values by key.
  data: object[]
  columns: { header: string; key: string; dataKey?: string; width?: number }[]
  summaryStats?: { label: string; value: string | number }[]
  appliedFiltersText?: string
  currentRole?: string
}

export function ExportModal({
  open,
  onOpenChange,
  title,
  filename,
  data,
  columns,
  summaryStats,
  appliedFiltersText,
  currentRole = "Super Admin",
}: ExportModalProps) {
  const [format, setFormat] = React.useState<"excel" | "pdf" | "csv" | "print">("excel")
  const [isExporting, setIsExporting] = React.useState(false)

  const handleExport = async () => {
    setIsExporting(true)
    try {
      const exportCols = columns.map((c) => ({
        header: c.header,
        key: c.key,
        dataKey: c.key,
        width: c.width,
      }))

      if (format === "excel") {
        exportToExcel({
          filename: `${filename}_${Date.now()}`,
          sheetName: title.substring(0, 31),
          title: `Panyor Hall of Residence - ${title}`,
          data,
          columns: exportCols,
        })
        toast.success("Excel report generated successfully.")
      } else if (format === "pdf") {
        exportToPdf({
          filename: `${filename}_${Date.now()}`,
          reportTitle: title,
          generatedBy: currentRole,
          appliedFilters: appliedFiltersText,
          summaryStats,
          columns: exportCols,
          data,
        })
        toast.success("PDF report downloaded successfully.")
      } else if (format === "csv") {
        exportToCsv({
          filename: `${filename}_${Date.now()}`,
          columns: exportCols,
          data,
        })
        toast.success("CSV file downloaded successfully.")
      } else if (format === "print") {
        window.print()
      }

      onOpenChange(false)
    } catch (err: unknown) {
      toast.error(`Export failed: ${err instanceof Error ? err.message : "Unknown error"}`)
    } finally {
      setIsExporting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md max-w-[calc(100vw-2rem)]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Download className="size-5 text-primary" />
            Export Report: {title}
          </DialogTitle>
          <DialogDescription>
            Download institutional data for audit, official submission, or record keeping.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2 text-xs">
          <div className="rounded-lg border border-border bg-muted/40 p-3 space-y-1.5">
            <div className="flex justify-between items-center">
              <span className="font-semibold text-foreground">Records to export:</span>
              <Badge variant="secondary" className="font-mono">
                {data.length} records
              </Badge>
            </div>
            {appliedFiltersText && (
              <p className="text-[11px] text-muted-foreground">Active Filter: {appliedFiltersText}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label className="font-semibold">Select Export Format</Label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <div
                onClick={() => setFormat("excel")}
                className={`flex cursor-pointer items-center gap-2.5 rounded-lg border p-3 transition-all ${
                  format === "excel" ? "border-primary bg-accent/40 font-medium" : "border-border hover:bg-muted/40"
                }`}
              >
                <FileSpreadsheet className="size-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                <div>
                  <p className="text-xs text-foreground">Excel (.xlsx)</p>
                  <p className="text-[10px] text-muted-foreground">Formatted sheets & columns</p>
                </div>
              </div>

              <div
                onClick={() => setFormat("pdf")}
                className={`flex cursor-pointer items-center gap-2.5 rounded-lg border p-3 transition-all ${
                  format === "pdf" ? "border-primary bg-accent/40 font-medium" : "border-border hover:bg-muted/40"
                }`}
              >
                <FileText className="size-4 text-rose-600 dark:text-rose-400 shrink-0" />
                <div>
                  <p className="text-xs text-foreground">PDF Document</p>
                  <p className="text-[10px] text-muted-foreground">Official RGU Letterhead</p>
                </div>
              </div>

              <div
                onClick={() => setFormat("csv")}
                className={`flex cursor-pointer items-center gap-2.5 rounded-lg border p-3 transition-all ${
                  format === "csv" ? "border-primary bg-accent/40 font-medium" : "border-border hover:bg-muted/40"
                }`}
              >
                <FileCode className="size-4 text-sky-600 dark:text-sky-400 shrink-0" />
                <div>
                  <p className="text-xs text-foreground">CSV (.csv)</p>
                  <p className="text-[10px] text-muted-foreground">Raw comma-separated data</p>
                </div>
              </div>

              <div
                onClick={() => setFormat("print")}
                className={`flex cursor-pointer items-center gap-2.5 rounded-lg border p-3 transition-all ${
                  format === "print" ? "border-primary bg-accent/40 font-medium" : "border-border hover:bg-muted/40"
                }`}
              >
                <Printer className="size-4 text-amber-600 dark:text-amber-400 shrink-0" />
                <div>
                  <p className="text-xs text-foreground">Print View</p>
                  <p className="text-[10px] text-muted-foreground">Direct printer output</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" size="sm" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button size="sm" onClick={handleExport} disabled={isExporting}>
            <Download className="mr-1.5 size-3.5" />
            {isExporting ? "Generating..." : "Download Report"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
