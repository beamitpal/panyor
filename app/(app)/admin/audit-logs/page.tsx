"use client"

import * as React from "react"
import { Search, Download, Terminal } from "lucide-react"
import { useRole } from "@/components/layout/role-context"
import type { AuditLogItem } from "@/types"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { ExportModal } from "@/components/shared/export-modal"
import { Empty } from "@/components/ui/empty"
import { Skeleton } from "@/components/ui/skeleton"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { useApi } from "@/hooks/use-api"

export default function AuditLogsPage() {
  const { currentUser, can } = useRole()
  const { data, loading, error, reload } = useApi<{ logs: AuditLogItem[] }>("/api/audit-logs")
  const logs = React.useMemo(() => data?.logs ?? [], [data])
  const [search, setSearch] = React.useState("")
  const [roleFilter, setRoleFilter] = React.useState<string>("ALL")
  const [resourceFilter, setResourceFilter] = React.useState<string>("ALL")
  const [selectedLog, setSelectedLog] = React.useState<AuditLogItem | null>(null)
  const [inspectorOpen, setInspectorOpen] = React.useState(false)
  const [exportOpen, setExportOpen] = React.useState(false)

  const filteredLogs = React.useMemo(() => {
    let list = [...logs]
    if (search.trim()) {
      const q = search.toLowerCase()
      list = list.filter((l) => (l.actorName && l.actorName.toLowerCase().includes(q)) || (l.actorEmail && l.actorEmail.toLowerCase().includes(q)) || l.action.toLowerCase().includes(q) || (l.resourceType && l.resourceType.toLowerCase().includes(q)) || (l.resource && l.resource.toLowerCase().includes(q)) || (l.resourceId && l.resourceId.toLowerCase().includes(q)))
    }
    if (roleFilter !== "ALL") list = list.filter((l) => l.actorRole === roleFilter)
    if (resourceFilter !== "ALL") list = list.filter((l) => (l.resourceType && l.resourceType === resourceFilter) || l.resource === resourceFilter)
    return list
  }, [search, roleFilter, resourceFilter, logs])

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">System & Operations Audit Trail</h1>
          <p className="text-xs text-muted-foreground">Tamper-proof immutable ledger recording all resident admissions, room allotments, equipment checkouts & administrative actions.</p>
        </div>
        <div className="flex items-center gap-2">
          {can("reports.export") && (
            <Button variant="outline" size="sm" onClick={() => setExportOpen(true)} className="h-9 gap-1.5 text-xs">
              <Download className="size-3.5" /> Export Audit Trail
            </Button>
          )}
        </div>
      </div>

      <Card>
        <CardContent className="p-4">
          <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
            <div className="sm:col-span-6 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
              <Input placeholder="Search audit trail by actor name, action (e.g. equipment.issue), resource..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9 h-9 text-xs" />
            </div>
            <div className="sm:col-span-3">
              <Select value={roleFilter} onValueChange={(v) => setRoleFilter(v ?? "")}>
<SelectTrigger className="h-9 text-xs"><SelectValue placeholder="All Roles" /></SelectTrigger>
<SelectContent><SelectGroup><SelectItem value="ALL">All Roles</SelectItem><SelectItem value="SUPER_ADMIN">Super Admin</SelectItem><SelectItem value="WARDEN">Warden</SelectItem><SelectItem value="DEPUTY_WARDEN">Deputy Warden</SelectItem><SelectItem value="CARETAKER">Caretaker</SelectItem><SelectItem value="MESS_EMPLOYEE">Mess Employee</SelectItem><SelectItem value="MESS_COMMITTEE">Mess Committee</SelectItem><SelectItem value="STUDENT">Student</SelectItem></SelectGroup></SelectContent>
</Select>
            </div>
            <div className="sm:col-span-3">
              <Select value={resourceFilter} onValueChange={(v) => setResourceFilter(v ?? "")}>
<SelectTrigger className="h-9 text-xs"><SelectValue placeholder="All Resources" /></SelectTrigger>
<SelectContent><SelectGroup><SelectItem value="ALL">All Resources</SelectItem><SelectItem value="room">Room Allocations</SelectItem><SelectItem value="student_profile">Student Profiles</SelectItem><SelectItem value="equipment_transaction">Equipment Loans</SelectItem><SelectItem value="complaint">Complaints</SelectItem><SelectItem value="mess_distribution">Mess Distributions</SelectItem><SelectItem value="notice">Hostel Notices</SelectItem></SelectGroup></SelectContent>
</Select>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="p-4 pb-2">
          <CardTitle className="text-sm font-bold">Audit Event Ledger ({filteredLogs.length})</CardTitle>
          <CardDescription>Chronological sequence of all system transactions with metadata diffs</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="p-6 space-y-3"><Skeleton className="h-5 w-1/3" /><Skeleton className="h-10 w-full" /><Skeleton className="h-10 w-full" /></div>
          ) : error ? (
            <div className="p-6 space-y-3"><Alert variant="destructive"><AlertDescription>{error}</AlertDescription></Alert><Button variant="outline" size="sm" onClick={reload}>Retry</Button></div>
          ) : filteredLogs.length === 0 ? (
            <div className="p-6"><Empty title="No audit events found" description="No events match your search and filters." /></div>
          ) : (
            <div className="overflow-x-auto"><Table className="min-w-[760px]">
              <TableHeader>
                <TableRow>
                  <TableHead>Timestamp</TableHead>
                  <TableHead>Actor</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Action</TableHead>
                  <TableHead>Resource</TableHead>
                  <TableHead>IP Address</TableHead>
                  <TableHead className="text-right">Payload</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredLogs.map((log) => (
                  <TableRow key={log.id}>
                    <TableCell className="font-mono text-xs text-muted-foreground whitespace-nowrap">{new Date(log.createdAt).toLocaleString([], { dateStyle: "short", timeStyle: "medium" })}</TableCell>
                    <TableCell className="font-semibold text-foreground text-xs">{log.actorName || log.actorEmail || "System"}</TableCell>
                    <TableCell><Badge variant="secondary" size="sm" className="font-mono text-[9px] py-0 px-1">{log.actorRole || "SYSTEM"}</Badge></TableCell>
                    <TableCell className="font-mono text-xs font-medium text-foreground">{log.action}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1 font-mono text-xs">
                        <span>{log.resourceType || log.resource}</span>
                        {log.resourceId && <span className="text-[10px] text-muted-foreground truncate max-w-[100px]">({log.resourceId})</span>}
                      </div>
                    </TableCell>
                    <TableCell className="font-mono text-xs text-muted-foreground">{log.ipAddress || "—"}</TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="icon" className="size-7" onClick={() => { setSelectedLog(log); setInspectorOpen(true) }} title="Inspect JSON Metadata">
                        <Terminal className="size-3.5 text-muted-foreground" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table></div>
          )}
        </CardContent>
      </Card>

      <Dialog open={inspectorOpen} onOpenChange={setInspectorOpen}>
        <DialogContent className="sm:max-w-lg max-w-[calc(100vw-2rem)]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><Terminal className="size-5 text-primary" /> Audit Event Payload Inspector</DialogTitle>
            <DialogDescription>Action: <span className="font-mono font-bold break-all text-foreground">{selectedLog?.action}</span> by {selectedLog?.actorName || selectedLog?.actorEmail} ({selectedLog?.actorRole})</DialogDescription>
          </DialogHeader>
          {selectedLog && (
            <div className="space-y-3 py-2 text-xs">
              <div className="rounded-lg border border-border bg-muted/40 p-3 space-y-1">
                <div className="flex justify-between"><span className="text-muted-foreground">Event ID:</span><span className="font-mono">{selectedLog.id}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Timestamp:</span><span className="font-mono">{new Date(selectedLog.createdAt).toISOString()}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">User Agent:</span><span className="truncate max-w-[280px]">{selectedLog.userAgent}</span></div>
              </div>
              <div>
                <span className="font-bold text-foreground block mb-1">State Diffs & Metadata</span>
                <pre className="rounded-lg bg-zinc-950 text-zinc-100 p-3 font-mono text-[11px] overflow-x-auto max-h-64">{JSON.stringify(selectedLog.metadata || {}, null, 2)}</pre>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <ExportModal
        open={exportOpen}
        onOpenChange={setExportOpen}
        title="Hostel Security & System Audit Trail"
        filename="panyor_audit_log"
        data={filteredLogs.map((l) => ({ timestamp: new Date(l.createdAt).toLocaleString(), actor: l.actorName || l.actorEmail || "System", role: l.actorRole || "SYSTEM", action: l.action, resource: l.resourceType || l.resource, resourceId: l.resourceId || "-", ip: l.ipAddress || "—" }))}
        columns={[
          { header: "Timestamp", key: "timestamp", width: 20 },
          { header: "Actor", key: "actor", width: 20 },
          { header: "Role", key: "role", width: 14 },
          { header: "Action", key: "action", width: 24 },
          { header: "Resource", key: "resource", width: 16 },
          { header: "Resource ID", key: "resourceId", width: 16 },
          { header: "IP Address", key: "ip", width: 14 },
        ]}
        summaryStats={[{ label: "Total Events", value: filteredLogs.length }]}
        appliedFiltersText={`Role: ${roleFilter}, Resource: ${resourceFilter}`}
        currentRole={currentUser.role}
      />
    </div>
  )
}
