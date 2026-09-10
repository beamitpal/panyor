"use client"

import * as React from "react"
import { Download, Users, Building2, Gamepad2, LifeBuoy, UtensilsCrossed, ShieldCheck } from "lucide-react"
import { useRole } from "@/components/layout/role-context"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { ExportModal } from "@/components/shared/export-modal"
import { Skeleton } from "@/components/ui/skeleton"
import { useApi } from "@/hooks/use-api"

interface ReportRoom { roomNumber: string; block: string; floor: number; capacity?: number | null; occupancy: number; status: string }
interface ReportTransaction { equipmentName: string; quantity: number; studentName: string; status: string; issuedAt: string | null; actualReturnDate: string | null; fineAmount: number | null }
interface ReportComplaint { ticketNumber: string; categoryName: string; priority: string; studentName: string; roomNumber: string | null; title: string; status: string; createdAt: string | null }
interface ReportMessSession { title: string; mealType: string; distributionDate: string; totalExpected: number; totalDistributed: number; status: string }
interface ReportDashboard {
  rooms?: { total: number; capacity: number; occupied: number; rate: number; list: ReportRoom[] }
  equipment?: { totalUnits: number; issued: number; transactions: ReportTransaction[] }
  complaints?: { open: number; list: ReportComplaint[] }
  mess?: { totalToday: number; today: ReportMessSession[] }
}
interface ReportStudent { name: string; studentId: string; enrollmentNo: string; department: string; program: string; year: number; roomNumber: string | null; bedNumber: number | null; approvalStatus: string; phone: string; email: string }
interface ReportAuditLog { action: string; actorName: string | null; actorEmail: string | null; actorRole: string | null; resourceType: string | null; resource: string | null; resourceId: string | null; ipAddress: string | null; createdAt: string | null }

interface ReportTemplate {
  id: string
  title: string
  description: string
  icon: React.ComponentType<{ className?: string }>
  filename: string
  getData: () => object[]
  columns: { header: string; key: string; width?: number }[]
  getSummaryStats: () => { label: string; value: string | number }[]
}

export default function ReportsPage() {
  const { currentUser } = useRole()
  const [selectedReport, setSelectedReport] = React.useState<ReportTemplate | null>(null)
  const [exportOpen, setExportOpen] = React.useState(false)
  const dashApi = useApi<ReportDashboard>("/api/dashboard")
  const studentsApi = useApi<{ students: ReportStudent[] }>("/api/students")
  const logsApi = useApi<{ logs: ReportAuditLog[] }>("/api/audit-logs")
  const loading = dashApi.loading || studentsApi.loading || logsApi.loading
  const error = dashApi.error ?? studentsApi.error ?? logsApi.error
  const dash = dashApi.data
  const students = React.useMemo(() => studentsApi.data?.students ?? [], [studentsApi.data])
  const logs = React.useMemo(() => logsApi.data?.logs ?? [], [logsApi.data])

  const reportTemplates: ReportTemplate[] = React.useMemo(() => {
    const complaints = dash?.complaints?.list ?? []
    const transactions = dash?.equipment?.transactions ?? []
    const rooms = dash?.rooms?.list ?? []
    return [
      {
        id: "students",
        title: "Student Resident Master Directory",
        description: "Official roster of all enrolled residents, academic departments, allotted rooms, and admission status.",
        icon: Users,
        filename: "panyor_students_roster",
        getData: () => students.map((s: ReportStudent) => ({ name: s.name, studentId: s.studentId, enrollmentNo: s.enrollmentNo, department: s.department, program: s.program, year: s.year, room: s.roomNumber || "Unassigned", bed: s.bedNumber || "-", status: s.approvalStatus, phone: s.phone, email: s.email })),
        columns: [
          { header: "Resident Name", key: "name", width: 22 },
          { header: "Roll #", key: "studentId", width: 14 },
          { header: "Enrollment", key: "enrollmentNo", width: 16 },
          { header: "Department", key: "department", width: 28 },
          { header: "Program", key: "program", width: 10 },
          { header: "Room", key: "room", width: 10 },
          { header: "Bed", key: "bed", width: 8 },
          { header: "Status", key: "status", width: 12 },
          { header: "Phone", key: "phone", width: 15 },
          { header: "Email", key: "email", width: 22 },
        ],
        getSummaryStats: () => [
          { label: "Total Residents", value: students.length },
          { label: "Approved Residents", value: students.filter((s: ReportStudent) => s.approvalStatus === "APPROVED").length },
        ],
      },
      {
        id: "rooms",
        title: "Double Occupancy & Bed Utilization Audit",
        description: "Room-by-room occupancy breakdown ensuring compliance with the 2-student-per-room ceiling.",
        icon: Building2,
        filename: "panyor_double_occupancy_audit",
        getData: () => rooms.map((r: ReportRoom) => ({ roomNumber: r.roomNumber, block: r.block, floor: r.floor, occupancy: `${r.occupancy}/${r.capacity ?? 2}`, status: r.status })),
        columns: [
          { header: "Room", key: "roomNumber", width: 10 },
          { header: "Block", key: "block", width: 12 },
          { header: "Floor", key: "floor", width: 8 },
          { header: "Occupancy", key: "occupancy", width: 12 },
          { header: "Status", key: "status", width: 12 },
        ],
        getSummaryStats: () => [
          { label: "Total Rooms", value: dash?.rooms?.total ?? 0 },
          { label: "Bed Capacity", value: dash?.rooms?.capacity ?? 0 },
          { label: "Occupied Beds", value: dash?.rooms?.occupied ?? 0 },
          { label: "Utilization Rate", value: `${dash?.rooms?.rate ?? 0}%` },
        ],
      },
      {
        id: "equipment",
        title: "Sports Equipment Circulation & Condition Audit",
        description: "Complete inventory ledger, active loans, damage assessments, and penalty charges.",
        icon: Gamepad2,
        filename: "panyor_equipment_audit",
        getData: () => transactions.map((t: ReportTransaction) => ({ equipment: t.equipmentName, quantity: t.quantity, student: t.studentName, status: t.status, issuedAt: t.issuedAt ? new Date(t.issuedAt).toLocaleDateString() : "-", returnDate: t.actualReturnDate ? new Date(t.actualReturnDate).toLocaleDateString() : "-", penalty: t.fineAmount ? `₹${t.fineAmount}` : "₹0" })),
        columns: [
          { header: "Equipment Item", key: "equipment", width: 22 },
          { header: "Qty", key: "quantity", width: 8 },
          { header: "Resident", key: "student", width: 20 },
          { header: "Status", key: "status", width: 12 },
          { header: "Issued Date", key: "issuedAt", width: 12 },
          { header: "Returned Date", key: "returnDate", width: 12 },
          { header: "Penalty", key: "penalty", width: 10 },
        ],
        getSummaryStats: () => [
          { label: "Total Inventory Units", value: dash?.equipment?.totalUnits ?? 0 },
          { label: "Currently Issued", value: dash?.equipment?.issued ?? 0 },
        ],
      },
      {
        id: "complaints",
        title: "Complaints SLA & Maintenance Resolution Log",
        description: "Hostel maintenance lifecycle tickets, resolution turnaround times, staff assignments, and resident star ratings.",
        icon: LifeBuoy,
        filename: "panyor_complaints_sla_report",
        getData: () => complaints.map((c: ReportComplaint) => ({ ticket: c.ticketNumber, category: c.categoryName, priority: c.priority, student: c.studentName, room: c.roomNumber || "N/A", title: c.title, status: c.status, loggedDate: c.createdAt ? new Date(c.createdAt).toLocaleDateString() : "-" })),
        columns: [
          { header: "Ticket #", key: "ticket", width: 15 },
          { header: "Priority", key: "priority", width: 12 },
          { header: "Category", key: "category", width: 18 },
          { header: "Resident", key: "student", width: 20 },
          { header: "Room", key: "room", width: 10 },
          { header: "Title", key: "title", width: 28 },
          { header: "Status", key: "status", width: 12 },
          { header: "Date Logged", key: "loggedDate", width: 14 },
        ],
        getSummaryStats: () => [
          { label: "Total Complaints Logged", value: complaints.length },
          { label: "Open Tickets", value: dash?.complaints?.open ?? 0 },
        ],
      },
      {
        id: "mess",
        title: "Daily & Monthly Mess Meal Consumption Ledger",
        description: "Today's distribution sessions with distributed counts.",
        icon: UtensilsCrossed,
        filename: "panyor_mess_consumption_ledger",
        getData: () => (dash?.mess?.today ?? []).map((d: ReportMessSession) => ({ title: d.title, mealType: d.mealType, date: d.distributionDate, expected: d.totalExpected, distributed: d.totalDistributed, status: d.status })),
        columns: [
          { header: "Session", key: "title", width: 24 },
          { header: "Meal Type", key: "mealType", width: 12 },
          { header: "Date", key: "date", width: 12 },
          { header: "Expected", key: "expected", width: 10 },
          { header: "Distributed", key: "distributed", width: 12 },
          { header: "Status", key: "status", width: 12 },
        ],
        getSummaryStats: () => [{ label: "Active Sessions Today", value: dash?.mess?.totalToday ?? 0 }],
      },
      {
        id: "audit",
        title: "Complete Institutional Audit Trail",
        description: "Immutable security log of all user logins, room allocations, student approvals, and inventory modifications.",
        icon: ShieldCheck,
        filename: "panyor_security_audit_log",
        getData: () => logs.map((a: ReportAuditLog) => ({ timestamp: new Date(a.createdAt ?? "").toLocaleString(), actor: a.actorName || a.actorEmail || "System", role: a.actorRole || "SYSTEM", action: a.action, resource: a.resourceType || a.resource, resourceId: a.resourceId || "-", ip: a.ipAddress || "—" })),
        columns: [
          { header: "Timestamp", key: "timestamp", width: 20 },
          { header: "Actor Name", key: "actor", width: 20 },
          { header: "Role", key: "role", width: 14 },
          { header: "Action", key: "action", width: 24 },
          { header: "Resource Type", key: "resource", width: 16 },
          { header: "Resource ID", key: "resourceId", width: 18 },
          { header: "IP Address", key: "ip", width: 14 },
        ],
        getSummaryStats: () => [{ label: "Total Audit Events", value: logs.length }],
      },
    ]
  }, [dash, students, logs])

  const handleLaunchExport = (rpt: ReportTemplate) => { setSelectedReport(rpt); setExportOpen(true) }

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">Reports & Institutional Exports Center</h1>
          <p className="text-xs text-muted-foreground">Generate official University-formatted Excel (.xlsx), PDF with Rajiv Gandhi University Letterhead, and CSV logs.</p>
        </div>
      </div>

      {loading ? (
        <Card><CardContent className="space-y-3 p-8"><Skeleton className="h-5 w-1/3" /><Skeleton className="h-4 w-2/3" /><Skeleton className="h-24 w-full" /></CardContent></Card>
      ) : error ? (
        <Card><CardContent className="p-8 text-center text-xs text-destructive">{error}</CardContent></Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {reportTemplates.map((rpt) => {
            const Icon = rpt.icon
            return (
              <Card key={rpt.id} className="flex flex-col justify-between border-border hover:shadow-md transition-shadow">
                <CardHeader className="p-5 pb-3">
                  <div className="flex size-10 items-center justify-center rounded-xl bg-primary/10 text-primary mb-3"><Icon className="size-5" /></div>
                  <CardTitle className="text-base font-bold">{rpt.title}</CardTitle>
                  <CardDescription className="text-xs leading-relaxed pt-1">{rpt.description}</CardDescription>
                </CardHeader>
                <CardContent className="p-5 pt-0">
                  <div className="rounded-lg bg-muted/40 p-2.5 text-[11px] text-muted-foreground space-y-1">
                    <span className="font-semibold text-foreground">Export Formats</span>
                    <div className="flex gap-2 text-[10px]">
                      <Badge variant="outline" className="font-mono">Excel (.xlsx)</Badge>
                      <Badge variant="outline" className="font-mono">PDF Letterhead</Badge>
                      <Badge variant="outline" className="font-mono">CSV</Badge>
                    </div>
                  </div>
                </CardContent>
                <CardFooter className="p-5 pt-0">
                  <Button size="sm" className="w-full gap-1.5 text-xs h-9" onClick={() => handleLaunchExport(rpt)}>
                    <Download className="size-3.5" /> Generate Report
                  </Button>
                </CardFooter>
              </Card>
            )
          })}
        </div>
      )}

      {selectedReport && (
        <ExportModal open={exportOpen} onOpenChange={setExportOpen} title={selectedReport.title} filename={selectedReport.filename} data={selectedReport.getData()} columns={selectedReport.columns} summaryStats={selectedReport.getSummaryStats()} currentRole={currentUser.role} />
      )}
    </div>
  )
}
