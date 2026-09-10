"use client"

import * as React from "react"
import Link from "next/link"
import { Users, Building2, Gamepad2, LifeBuoy, UtensilsCrossed, BellRing, ArrowUpRight, AlertTriangle, Plus, Download } from "lucide-react"
import { useRole } from "@/components/layout/role-context"
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { ExportModal } from "@/components/shared/export-modal"
import { Skeleton } from "@/components/ui/skeleton"
import { Empty } from "@/components/ui/empty"
import { useApi } from "@/hooks/use-api"

interface DashboardRoom { id: string; roomNumber: string; block: string; floor: number; capacity: number | null; occupancy: number; status: string }
interface DashboardComplaint { id: string; ticketNumber: string; title: string; description: string; priority: string; status: string; categoryName: string; studentName: string; studentId: string; roomNumber: string | null; createdAt: string | null }
interface DashboardTransaction { id: string; equipmentName: string; quantity: number; studentName: string; studentId: string; roomNumber: string | null; status: string; issuedAt: string | null; expectedReturnDate: string | null; actualReturnDate?: string | null; conditionAfter?: string | null; fineAmount?: number | null }
interface DashboardDistribution { id: string; title: string; mealType: string; distributionDate: string; totalExpected: number; totalDistributed: number; status: string }
interface DashboardNotice { id: string; title: string; content: string; category: string; priority: string; publishedAt: string | null }
interface DashboardData {
  students: { total: number; approved: number; pending: number; rejected: number; suspended: number }
  rooms: { total: number; capacity: number; occupied: number; rate: number; list: DashboardRoom[] }
  equipment: { totalUnits: number; issued: number; pendingRequests: number; transactions: DashboardTransaction[] }
  complaints: { total: number; open: number; urgent: number; list: DashboardComplaint[] }
  mess: { today: DashboardDistribution[]; totalToday: number }
  notices: DashboardNotice[]
  transactions: DashboardTransaction[]
  auditCount: number
}

export default function DashboardOverviewPage() {
  const { currentUser, can } = useRole()
  const [exportOpen, setExportOpen] = React.useState(false)
  const { data: dash, error, loading } = useApi<DashboardData>("/api/dashboard")

  const totalRooms = dash?.rooms?.total ?? 0
  const totalBedCapacity = dash?.rooms?.capacity ?? 0
  const occupiedBeds = dash?.rooms?.occupied ?? 0
  const occupancyRate = dash?.rooms?.rate ?? 0
  const approvedStudents = dash?.students?.approved ?? 0
  const pendingStudents = dash?.students?.pending ?? 0
  const totalEquipment = dash?.equipment?.totalUnits ?? 0
  const issuedEquipment = dash?.equipment?.issued ?? 0
  const activeRequests = dash?.equipment?.pendingRequests ?? 0
  const openCount = dash?.complaints?.open ?? 0
  const urgentCount = dash?.complaints?.urgent ?? 0
  const complaintsList = dash?.complaints?.list ?? []
  const totalComplaints = complaintsList.length
  const todayDistributions = dash?.mess?.today ?? []
  const recentNotices = dash?.notices ?? []
  const recentTransactions = dash?.transactions ?? dash?.equipment?.transactions ?? []

  if (loading) return <div className="max-w-7xl mx-auto"><Card><CardContent className="space-y-3 p-8"><Skeleton className="h-6 w-1/4" /><Skeleton className="h-4 w-1/2" /><Skeleton className="h-32 w-full" /></CardContent></Card></div>
  if (error) return <div className="max-w-7xl mx-auto"><Card><CardContent className="p-8 text-center text-xs text-destructive">{error}</CardContent></Card></div>

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 rounded-2xl border border-border bg-gradient-to-r from-card to-muted/50 p-6 shadow-xs">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="font-mono text-[10px] uppercase tracking-wider">Rajiv Gandhi University</Badge>
            <Badge variant="secondary" className="font-mono text-[10px]">Session 2025–2026</Badge>
          </div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">Welcome back, {currentUser.name}</h1>
          <p className="text-xs text-muted-foreground">Panyor Hall Operations Cockpit • Logged in with <span className="font-semibold text-foreground">{currentUser.roles?.join(" + ") || currentUser.role}</span> privileges.</p>
        </div>
        <div className="flex items-center gap-2">
          {can("reports.export") && (
            <Button variant="outline" size="sm" onClick={() => setExportOpen(true)} className="h-9 gap-1.5 text-xs"><Download className="size-3.5" /> Export Summary</Button>
          )}
          <Link href="/admin/equipment"><Button size="sm" className="h-9 gap-1.5 text-xs"><Plus className="size-3.5" /> Quick Issue Gear</Button></Link>
        </div>
      </div>

      {/* Administrative KPIs */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
              <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Room Occupancy</CardTitle>
              <Building2 className="size-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{occupancyRate}%</div>
              <p className="text-[11px] text-muted-foreground mt-0.5">{occupiedBeds} of {totalBedCapacity} beds filled (Double Occupancy)</p>
              <Progress value={occupancyRate} className="mt-3 h-1.5" />
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
              <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Resident Students</CardTitle>
              <Users className="size-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{approvedStudents}</div>
              <p className="text-[11px] text-muted-foreground mt-0.5">{pendingStudents > 0 ? <span className="text-amber-600 dark:text-amber-400 font-medium">{pendingStudents} pending approval</span> : "All registrations approved"}</p>
              <div className="mt-3 flex gap-1"><Link href="/admin/students" className="text-[11px] text-primary hover:underline flex items-center gap-1 font-medium">Review Approvals <ArrowUpRight className="size-3" /></Link></div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
              <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Equipment Circulation</CardTitle>
              <Gamepad2 className="size-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{issuedEquipment} <span className="text-xs font-normal text-muted-foreground">/ {totalEquipment}</span></div>
              <p className="text-[11px] text-muted-foreground mt-0.5">{activeRequests > 0 ? `${activeRequests} pending checkout requests` : "Inventory balanced & tracked"}</p>
              <div className="mt-3 flex gap-1"><Link href="/admin/equipment" className="text-[11px] text-primary hover:underline flex items-center gap-1 font-medium">Issue & Return Desk <ArrowUpRight className="size-3" /></Link></div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
              <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Active Complaints</CardTitle>
              <LifeBuoy className="size-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{openCount}</div>
              <p className="text-[11px] text-muted-foreground mt-0.5">{urgentCount > 0 ? <span className="text-destructive font-medium flex items-center gap-1"><AlertTriangle className="size-3" /> {urgentCount} urgent SLA tickets</span> : "0 critical escalations"}</p>
              <div className="mt-3 flex gap-1"><Link href="/admin/complaints" className="text-[11px] text-primary hover:underline flex items-center gap-1 font-medium">Open Triage Desk <ArrowUpRight className="size-3" /></Link></div>
            </CardContent>
          </Card>
        </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader className="flex flex-col gap-2 sm:flex-row sm:items-center justify-between">
              <div><CardTitle className="text-sm font-bold">Complaint Triage & Status Radar</CardTitle><CardDescription>Live maintenance & resident support queue</CardDescription></div>
              <Link href="/admin/complaints"><Button variant="ghost" size="sm" className="text-xs h-8">View All ({totalComplaints})</Button></Link>
            </CardHeader>
            <CardContent>
              {complaintsList.length === 0 ? (
                <Empty title="No complaints recorded yet" description="New maintenance tickets will appear here." />
              ) : (
                <div className="divide-y divide-border/60">
                  {complaintsList.slice(0, 4).map((cmp: DashboardComplaint) => (
                    <div key={cmp.id} className="py-3 flex items-start justify-between gap-3 text-xs">
                      <div className="space-y-1 min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-mono font-bold break-all text-foreground">{cmp.ticketNumber}</span>
                          <Badge variant={cmp.priority === "URGENT" ? "destructive" : cmp.priority === "HIGH" ? "warning" : "outline"} size="sm" className="text-[9px] py-0 px-1 font-mono">{cmp.priority}</Badge>
                          <Badge variant="secondary" size="sm" className="text-[9px] py-0 px-1">{cmp.categoryName}</Badge>
                          {cmp.roomNumber && <span className="text-[11px] text-muted-foreground font-mono">Rm {cmp.roomNumber}</span>}
                        </div>
                        <p className="font-medium text-foreground truncate">{cmp.title}</p>
                        <p className="text-[11px] text-muted-foreground truncate">{cmp.description}</p>
                      </div>
                      <div className="flex flex-col items-end gap-1 shrink-0">
                        <Badge variant={cmp.status === "RESOLVED" || cmp.status === "CLOSED" ? "success" : cmp.status === "IN_PROGRESS" ? "info" : "warning"} size="sm">{cmp.status}</Badge>
                        <span className="text-[10px] text-muted-foreground">{cmp.createdAt ? new Date(cmp.createdAt).toLocaleDateString() : "—"}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-col gap-2 sm:flex-row sm:items-center justify-between">
              <div><CardTitle className="text-sm font-bold">Recent Sports & Games Activity</CardTitle><CardDescription>Circulation logs for Chess, Carrom, Cricket, TT, Badminton</CardDescription></div>
              <Link href="/admin/equipment"><Button variant="ghost" size="sm" className="text-xs h-8">Equipment Desk</Button></Link>
            </CardHeader>
            <CardContent>
              {recentTransactions.length === 0 ? (
                <Empty title="No equipment activity yet" description="Issued sports equipment will appear here." />
              ) : (
                <div className="divide-y divide-border/60">
                  {recentTransactions.slice(0, 5).map((txn: DashboardTransaction) => (
                    <div key={txn.id} className="py-2.5 flex items-center justify-between text-xs">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="flex size-8 items-center justify-center rounded-lg bg-muted text-muted-foreground shrink-0"><Gamepad2 className="size-4" /></div>
                        <div className="flex flex-col min-w-0">
                          <span className="font-semibold text-foreground truncate">{txn.quantity}x {txn.equipmentName}</span>
                          <span className="text-[11px] text-muted-foreground truncate">Issued to {txn.studentName}{txn.roomNumber ? ` (Rm ${txn.roomNumber})` : ""}</span>
                        </div>
                      </div>
                      <div className="flex flex-col items-end shrink-0">
                        <Badge variant={txn.status === "RETURNED" ? "success" : txn.status === "ISSUED" ? "info" : "destructive"} size="sm" className="text-[9px]">{txn.status}</Badge>
                        <span className="text-[10px] text-muted-foreground font-mono">Exp: {txn.expectedReturnDate ? new Date(txn.expectedReturnDate).toLocaleDateString() : "—"}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-3">
              <div><CardTitle className="text-sm font-bold">Today&apos;s Mess Distribution</CardTitle><CardDescription>Panyor Dining Hall counter</CardDescription></div>
              <UtensilsCrossed className="size-4 text-muted-foreground" />
            </CardHeader>
            <CardContent className="space-y-4 text-xs">
              {todayDistributions.length === 0 ? (
                <Empty title="No active meal session" description="Today's mess distributions will appear here." />
              ) : (
                todayDistributions.map((dist: DashboardDistribution) => {
                  const pct = dist.totalExpected ? Math.round((dist.totalDistributed / dist.totalExpected) * 100) : 0
                  return (
                    <div key={dist.id} className="rounded-lg border border-border p-3 space-y-2">
                      <div className="flex items-center justify-between"><span className="font-bold text-foreground">{dist.title}</span><Badge variant="secondary" size="sm" className="font-mono text-[9px]">{dist.mealType}</Badge></div>
                      <div className="flex justify-between text-[11px] text-muted-foreground"><span>Distributed: {dist.totalDistributed} / {dist.totalExpected}</span><span className="font-mono font-medium">{pct}%</span></div>
                      <Progress value={pct} className="h-1.5" />
                    </div>
                  )
                })
              )}
              <Link href="/admin/mess"><Button variant="outline" size="sm" className="w-full text-xs h-8">Open Mess Distribution Counter</Button></Link>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-3">
              <div><CardTitle className="text-sm font-bold">Notice Board</CardTitle><CardDescription>Official circulars from Warden & Admin</CardDescription></div>
              <BellRing className="size-4 text-muted-foreground" />
            </CardHeader>
            <CardContent className="space-y-3">
              {recentNotices.length === 0 ? (
                <Empty title="No notices published yet" description="Official circulars will appear here." />
              ) : (
                recentNotices.slice(0, 3).map((notice: DashboardNotice) => (
                  <div key={notice.id} className="rounded-lg border border-border/80 bg-card/60 p-3 text-xs space-y-1.5">
                    <div className="flex items-center justify-between">
                      <Badge variant={notice.priority === "CRITICAL" ? "destructive" : notice.priority === "HIGH" ? "warning" : "outline"} size="sm" className="text-[9px] py-0 px-1 font-mono">{notice.category}</Badge>
                      <span className="text-[10px] text-muted-foreground">{notice.publishedAt ? new Date(notice.publishedAt).toLocaleDateString() : "—"}</span>
                    </div>
                    <h4 className="font-bold text-foreground leading-snug">{notice.title}</h4>
                    <p className="text-[11px] text-muted-foreground line-clamp-2 leading-relaxed">{notice.content}</p>
                  </div>
                ))
              )}
              <Link href="/admin/notices"><Button variant="ghost" size="sm" className="w-full text-xs h-8">View All Circulars</Button></Link>
            </CardContent>
          </Card>
        </div>
      </div>

      <ExportModal
        open={exportOpen}
        onOpenChange={setExportOpen}
        title="Hostel Operations Executive Summary"
        filename="panyor_hostel_overview"
        data={[
          { Metric: "Total Rooms", Value: totalRooms },
          { Metric: "Bed Capacity (Double Occupancy)", Value: totalBedCapacity },
          { Metric: "Occupied Beds", Value: occupiedBeds },
          { Metric: "Occupancy Rate", Value: `${occupancyRate}%` },
          { Metric: "Approved Resident Students", Value: approvedStudents },
          { Metric: "Pending Student Registrations", Value: pendingStudents },
          { Metric: "Total Sports Inventory Units", Value: totalEquipment },
          { Metric: "Equipment in Circulation", Value: issuedEquipment },
          { Metric: "Open Complaint Tickets", Value: openCount },
          { Metric: "Urgent Complaints", Value: urgentCount },
        ]}
        columns={[{ header: "Operational KPI / Metric", key: "Metric", width: 35 }, { header: "Current Metric Value", key: "Value", width: 25 }]}
        currentRole={currentUser.role}
      />
    </div>
  )
}

