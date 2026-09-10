"use client"

import * as React from "react"
import {
  UtensilsCrossed,
  Search,
  Plus,
  Download,
  Check,
} from "lucide-react"
import { useRole } from "@/components/layout/role-context"
import type {
  MessDistributionWithDetails,
  MessRecordWithDetails,
  MealType,
  MessCategory,
  MessItemDef,
} from "@/types"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Progress } from "@/components/ui/progress"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Textarea } from "@/components/ui/textarea"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { Field, FieldLabel, FieldGroup } from "@/components/ui/field"
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { ExportModal } from "@/components/shared/export-modal"
import { Empty } from "@/components/ui/empty"
import { Skeleton } from "@/components/ui/skeleton"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { toast } from "sonner"
import { useApi } from "@/hooks/use-api"

type TerminalRoom = {
  id: string
  roomNumber: string
  block: string
  students: { id: string; name: string; studentId: string; avatarUrl?: string | null; bedNumber?: number | null }[]
}

type CollectorStudent = {
  id: string
  name: string
  studentId: string
  roomNumber?: string | null
  approvalStatus?: string
}

async function api<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, { ...init, headers: { "Content-Type": "application/json", ...(init?.headers ?? {}) } })
  const data = (await res.json().catch(() => ({}))) as T & { error?: string }
  if (!res.ok) throw new Error((data as { error?: string }).error || `Request failed (${res.status}).`)
  return data as T
}

export default function MessPage() {
  const { currentUser, can } = useRole()

  const [activeTab, setActiveTab] = React.useState("terminal")
  const [selectedSessionId, setSelectedSessionId] = React.useState<string>("")
  const [roomQuery, setRoomQuery] = React.useState("")
  const [historyDate, setHistoryDate] = React.useState(new Date().toISOString().split("T")[0])
  const [historyMeal, setHistoryMeal] = React.useState<string>("ALL")

  const itemsApi = useApi<{ items: MessItemDef[] }>("/api/mess/items")
  const distApi = useApi<{ distributions: MessDistributionWithDetails[]; rooms: TerminalRoom[]; students: CollectorStudent[] }>("/api/mess/distributions")
  const recordsParams = (() => {
    const params = new URLSearchParams()
    if (historyDate) params.set("date", historyDate)
    if (historyMeal !== "ALL") params.set("mealType", historyMeal)
    return params.toString()
  })()
  const recordsApi = useApi<{ records: MessRecordWithDetails[] }>(`/api/mess/records?${recordsParams}`)

  const loading = itemsApi.loading || distApi.loading
  const loadError = itemsApi.error ?? distApi.error
  const messItems = React.useMemo(() => itemsApi.data?.items ?? [], [itemsApi.data])
  const activeSessions = React.useMemo(() => distApi.data?.distributions ?? [], [distApi.data])
  const terminalRoomsData = React.useMemo(() => distApi.data?.rooms ?? [], [distApi.data])
  const allStudents = React.useMemo(() => distApi.data?.students ?? [], [distApi.data])
  const filteredRecords = React.useMemo(() => recordsApi.data?.records ?? [], [recordsApi.data])
  const recordsLoading = recordsApi.loading
  const reloadBase = () => { itemsApi.reload(); distApi.reload() }

  // Modals
  const [newSessionModalOpen, setNewSessionModalOpen] = React.useState(false)
  const [newFoodItemModalOpen, setNewFoodItemModalOpen] = React.useState(false)
  const [exportOpen, setExportOpen] = React.useState(false)
  const [proxyDialogOpen, setProxyDialogOpen] = React.useState(false)
  const [proxyBeneficiary, setProxyBeneficiary] = React.useState<{ id: string; name: string } | null>(null)
  const [collectorQuery, setCollectorQuery] = React.useState("")
  const [selectedCollectorId, setSelectedCollectorId] = React.useState("")

  // New Session Form
  const [sessionForm, setSessionForm] = React.useState({
    mealType: "DINNER" as MealType,
    messItemId: "",
    title: "Today's Dinner Distribution",
    distributionDate: new Date().toISOString().split("T")[0],
  })

  // New Item Form
  const [foodItemForm, setFoodItemForm] = React.useState({
    name: "",
    category: "NON_VEG" as MessCategory,
    description: "",
  })

  const loadBase = reloadBase
  const loadRecords = recordsApi.reload

  const currentSession = React.useMemo(() => {
    if (selectedSessionId) {
      return activeSessions.find((s) => s.id === selectedSessionId) || activeSessions[0]
    }
    return activeSessions[0]
  }, [selectedSessionId, activeSessions])

  // Filtered rooms for rapid meal terminal lookup
  const terminalRooms = React.useMemo(() => {
    let list = [...terminalRoomsData]
    if (roomQuery.trim()) {
      const q = roomQuery.toLowerCase()
      list = list.filter(
        (r) =>
          r.roomNumber.toLowerCase().includes(q) ||
          r.students.some((s: { name: string; studentId: string }) => s.name.toLowerCase().includes(q) || s.studentId.toLowerCase().includes(q))
      )
    }
    return list
  }, [roomQuery, terminalRoomsData])

  const receivedKeys = React.useMemo(() => {
    const set = new Set<string>()
    for (const r of filteredRecords) {
      set.add(`${r.distributionDate}|${r.mealType}|${r.messItemId}|${r.studentProfileId}`)
    }
    return set
  }, [filteredRecords])

  const openProxyDialog = (studentId: string, studentName: string) => {
    setProxyBeneficiary({ id: studentId, name: studentName })
    setCollectorQuery("")
    setSelectedCollectorId("")
    setProxyDialogOpen(true)
  }

  const collectorStudents = React.useMemo(() => {
    const q = collectorQuery.trim().toLowerCase()
    return allStudents.filter((s) => s.id !== proxyBeneficiary?.id && (!q || s.name.toLowerCase().includes(q) || s.studentId.toLowerCase().includes(q) || (s.roomNumber || "").toLowerCase().includes(q))).slice(0, 8)
  }, [collectorQuery, proxyBeneficiary?.id, allStudents])

  const handleProxyMeal = async () => {
    if (!currentSession || !proxyBeneficiary || !selectedCollectorId) { toast.error("Select a collector first."); return }
    try {
      await api("/api/mess/records", {
        method: "POST",
        body: JSON.stringify({
          distributionId: currentSession.id,
          beneficiaryStudentProfileId: proxyBeneficiary.id,
          collectorStudentProfileId: selectedCollectorId,
        }),
      })
      const collector = allStudents.find((s) => s.id === selectedCollectorId)
      toast.success(`Meal recorded for ${proxyBeneficiary.name}; collected by ${collector?.name || "collector"}.`)
      setProxyDialogOpen(false)
      loadRecords()
      loadBase()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not record proxy pickup.")
    }
  }

  const handleMarkMeal = async (studentId: string, studentName: string) => {
    if (!currentSession) {
      toast.error("No active meal distribution session selected.")
      return
    }
    try {
      await api("/api/mess/records", {
        method: "POST",
        body: JSON.stringify({ distributionId: currentSession.id, studentProfileId: studentId, status: "RECEIVED" }),
      })
      toast.success(`Meal marked as received for ${studentName}.`)
      loadRecords()
      loadBase()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to record meal.")
    }
  }

  const handleCreateSessionSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const messItemId = sessionForm.messItemId || messItems[0]?.id || ""
    if (!messItemId) {
      toast.error("Please select a mess food item.")
      return
    }
    try {
      const data = await api<{ session: MessDistributionWithDetails }>("/api/mess/distributions", {
        method: "POST",
        body: JSON.stringify({ ...sessionForm, messItemId }),
      })
      toast.success("Mess distribution session created.")
      setNewSessionModalOpen(false)
      if (data.session) setSelectedSessionId(data.session.id)
      loadBase()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to create session.")
    }
  }

  const handleCreateFoodItemSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!foodItemForm.name.trim()) {
      toast.error("Please enter food item name.")
      return
    }
    try {
      await api("/api/mess/items", { method: "POST", body: JSON.stringify(foodItemForm) })
      toast.success(`Food item ${foodItemForm.name} registered.`)
      setNewFoodItemModalOpen(false)
      setFoodItemForm({ name: "", category: "NON_VEG", description: "" })
      loadBase()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to add food item.")
    }
  }

  if (loading) {
    return (
      <div className="space-y-6 max-w-7xl mx-auto">
        <Card className="p-6 space-y-3">
          <Skeleton className="h-6 w-1/3" />
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-10 w-full" />
        </Card>
      </div>
    )
  }

  if (loadError) {
    return (
      <div className="space-y-6 max-w-7xl mx-auto">
        <Card className="p-6 space-y-3">
          <Alert variant="destructive"><AlertDescription>{loadError}</AlertDescription></Alert>
          <Button size="sm" onClick={() => void loadBase()}>Retry</Button>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">
            Mess Management & Meal Distribution
          </h1>
          <p className="text-xs text-muted-foreground">
            High-speed room & resident verification terminal, dietary tracking & duplicate prevention.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {can("reports.export") && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setExportOpen(true)}
              className="h-9 gap-1.5 text-xs"
            >
              <Download className="size-3.5" />
              Export Mess Report
            </Button>
          )}

          {can("mess.manage") && (
            <>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setNewFoodItemModalOpen(true)}
                className="h-9 gap-1.5 text-xs"
              >
                <Plus className="size-3.5" />
                Add Food Item
              </Button>

              <Button
                size="sm"
                onClick={() => setNewSessionModalOpen(true)}
                className="h-9 gap-1.5 text-xs"
              >
                <Plus className="size-3.5" />
                Start Meal Session
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v ?? "")} className="space-y-4">
        <TabsList className="h-9 max-w-full overflow-x-auto">
          <TabsTrigger value="terminal">
            Live Distribution Terminal
          </TabsTrigger>
          <TabsTrigger value="records">
            Distribution Logs ({filteredRecords.length})
          </TabsTrigger>
          <TabsTrigger value="items">
            Mess Menu Catalog ({messItems.length})
          </TabsTrigger>
        </TabsList>

        {/* TAB 1: Live Terminal */}
        <TabsContent value="terminal" className="space-y-4">
          {/* Current Session Banner */}
          {currentSession ? (
            <Card className="border-border bg-gradient-to-r from-card via-card to-muted/40">
              <CardContent className="p-4 sm:p-5">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <Badge variant="default" className="font-mono text-[10px]">
                        {currentSession.mealType}
                      </Badge>
                      <Badge variant="outline" className="font-mono text-[10px]">
                        {currentSession.messCategory}
                      </Badge>
                      <span className="text-[11px] text-muted-foreground font-mono">
                        Date: {currentSession.distributionDate}
                      </span>
                    </div>
                    <h3 className="text-base font-bold text-foreground">
                      {currentSession.title} ({currentSession.messItemName})
                    </h3>
                    <p className="text-xs text-muted-foreground">
                      Counter Operator: {currentUser.name} ({currentUser.role})
                    </p>
                  </div>

                  <div className="flex flex-col sm:items-end gap-1.5 min-w-[200px]">
                    <div className="flex justify-between w-full text-xs font-semibold">
                      <span>Served: {currentSession.totalDistributed} / {currentSession.totalExpected}</span>
                      <span className="font-mono">
                        {Math.round((currentSession.totalDistributed / (currentSession.totalExpected || 1)) * 100)}%
                      </span>
                    </div>
                    <Progress
                      value={Math.round((currentSession.totalDistributed / (currentSession.totalExpected || 1)) * 100)}
                      className="h-2 w-full"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          ) : (
            <Empty title="No meal session active" description='No meal session currently active. Click "Start Meal Session" to begin dinner/lunch distribution.' />
          )}

          {/* High-speed room verification search */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="relative w-full sm:w-80">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
              <Input
                placeholder="Rapid search room (e.g. 101), student name..."
                value={roomQuery}
                onChange={(e) => setRoomQuery(e.target.value)}
                className="pl-9 h-9 text-xs"
                autoFocus
              />
            </div>

            {/* Session Switcher dropdown */}
            {activeSessions.length > 1 && (
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground">Active Session:</span>
                <Select value={currentSession?.id} onValueChange={(v) => setSelectedSessionId(v ?? "")}>
                  <SelectTrigger className="h-9 text-xs w-56"><SelectValue placeholder="Select session" /></SelectTrigger>
                  <SelectContent><SelectGroup>{activeSessions.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.mealType}: {s.title} ({s.distributionDate})
                    </SelectItem>
                  ))}</SelectGroup></SelectContent>
                </Select>
              </div>
            )}
          </div>

          {/* Room-by-Room Resident Meal Dispatch Cards */}
          {terminalRooms.length === 0 ? (
            <Empty title="No rooms found" description="Residents appear here once rooms and student profiles exist in the database." />
          ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {terminalRooms.map((room) => {
              return (
                <Card key={room.id} className="border-border">
                  <CardHeader className="p-3 pb-2 flex flex-row items-center justify-between space-y-0">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-sm text-foreground font-mono">
                        Room {room.roomNumber}
                      </span>
                      <Badge variant="outline" size="sm" className="text-[9px] font-mono">
                        {room.block}
                      </Badge>
                    </div>
                    <Badge variant="secondary" size="sm" className="text-[9px]">
                      {room.students.length}/2 Residents
                    </Badge>
                  </CardHeader>

                  <CardContent className="p-3 pt-1 space-y-2 text-xs">
                    {room.students.length === 0 ? (
                      <div className="py-3 text-center text-muted-foreground text-[11px]">
                        Room is currently vacant.
                      </div>
                    ) : (
                      room.students.map((student: { id: string; name: string; studentId: string; avatarUrl?: string | null; bedNumber?: number | null }) => {
                        // Check if student already received meal in this session
                        const alreadyReceived = currentSession
                          ? receivedKeys.has(`${currentSession.distributionDate}|${currentSession.mealType}|${currentSession.messItemId}|${student.id}`)
                          : false

                        return (
                          <div
                            key={student.id}
                            className={`flex items-center justify-between p-2 rounded-lg border ${
                              alreadyReceived
                                ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-950 dark:text-emerald-200"
                                : "border-border bg-card"
                            }`}
                          >
                            <div className="flex items-center gap-2 min-w-0 flex-1 pr-2">
                              <Avatar className="size-6 shrink-0">
                                {student.avatarUrl && <AvatarImage src={student.avatarUrl} />}
                                <AvatarFallback className="text-[8px]">
                                  {student.name.substring(0, 2)}
                                </AvatarFallback>
                              </Avatar>
                              <div className="flex flex-col min-w-0">
                                <div className="flex items-center gap-1">
                                  <span className="font-semibold truncate">{student.name}</span>
                                  <span className="text-[9px] opacity-70 font-mono">Bed {student.bedNumber}</span>
                                </div>
                                <span className="text-[10px] opacity-75 font-mono truncate">{student.studentId}</span>
                              </div>
                            </div>

                            {alreadyReceived ? (
                              <Badge variant="success" size="sm" className="text-[9px] py-0 px-1.5 flex items-center gap-1 shrink-0">
                                <Check className="size-2.5" /> Received
                              </Badge>
                            ) : (
                              can("mess.distribute") && (
                                <div className="flex items-center gap-1">
                                  <Button size="sm" className="h-7 text-[11px] px-2.5 shrink-0" onClick={() => handleMarkMeal(student.id, student.name)}>Mark Meal</Button>
                                  <Button size="sm" variant="outline" className="h-7 text-[11px] px-2 shrink-0" onClick={() => openProxyDialog(student.id, student.name)}>Proxy</Button>
                                </div>
                              )
                            )}
                          </div>
                        )
                      })
                    )}
                  </CardContent>
                </Card>
              )
            })}
          </div>
          )}
        </TabsContent>

        {/* TAB 2: Historical Records */}
        <TabsContent value="records" className="space-y-4">
          <Card>
            <CardHeader className="p-4 pb-2 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div>
                <CardTitle className="text-sm font-bold">Meal Verification Log</CardTitle>
                <CardDescription>Audited records of meal handouts with timestamps and recording operator</CardDescription>
              </div>

              <div className="flex items-center gap-2">
                <Input
                  type="date"
                  value={historyDate}
                  onChange={(e) => setHistoryDate(e.target.value)}
                  className="h-8 text-xs w-36"
                />

                <Select value={historyMeal} onValueChange={(v) => setHistoryMeal(v ?? "")}>
<SelectTrigger className="h-8 text-xs w-32"><SelectValue placeholder="All Meals" /></SelectTrigger>
<SelectContent><SelectGroup><SelectItem value="ALL">All Meals</SelectItem><SelectItem value="BREAKFAST">Breakfast</SelectItem><SelectItem value="LUNCH">Lunch</SelectItem><SelectItem value="SNACKS">Snacks</SelectItem><SelectItem value="DINNER">Dinner</SelectItem></SelectGroup></SelectContent>
</Select>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto"><Table className="min-w-[760px]">
                <TableHeader>
                  <TableRow>
                    <TableHead>Student Resident</TableHead>
                    <TableHead>Room</TableHead>
                    <TableHead>Meal & Dish</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Handed Out At</TableHead>
                    <TableHead>Recorded By</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {recordsLoading ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                        Loading records…
                      </TableCell>
                    </TableRow>
                  ) : filteredRecords.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                        No meal records found for selected date & meal.
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredRecords.map((rec) => (
                      <TableRow key={rec.id}>
                        <TableCell>
                          <div className="flex flex-col">
                            <span className="font-semibold text-foreground text-xs">{rec.studentName}</span>
                            <span className="text-[10px] text-muted-foreground font-mono">{rec.studentId}</span>
                          </div>
                        </TableCell>

                        <TableCell className="font-mono text-xs">
                          {rec.roomNumber ? `Room ${rec.roomNumber}` : "-"}
                        </TableCell>

                        <TableCell>
                          <div className="flex flex-col">
                            <span className="font-bold text-foreground text-xs">{rec.messItemName}</span>
                            <span className="text-[10px] text-muted-foreground font-mono">{rec.mealType}</span>
                          </div>
                        </TableCell>

                        <TableCell>
                          <Badge variant="outline" size="sm" className="text-[10px]">
                            {rec.messCategory}
                          </Badge>
                        </TableCell>

                        <TableCell className="font-mono text-xs text-muted-foreground">
                          {new Date(rec.distributedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                        </TableCell>

                        <TableCell className="text-xs text-muted-foreground">
                          {rec.recordedByName}
                        </TableCell>

                        <TableCell>
                          <Badge variant="success" size="sm" className="text-[9px] font-mono">
                            {rec.status}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table></div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* TAB 3: Mess Menu Items */}
        <TabsContent value="items" className="space-y-4">
          {messItems.length === 0 ? (
            <Empty title="No menu items yet" description="Add one to start serving meals." />
          ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {messItems.map((item) => (
              <Card key={item.id} className="p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <Badge variant="secondary" size="sm" className="text-[10px] font-mono">
                    {item.category}
                  </Badge>
                  <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-medium">
                    Active Menu Item
                  </span>
                </div>
                <h4 className="font-bold text-foreground text-sm">{item.name}</h4>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  {item.description || "Standard nutritious hostel mess preparation."}
                </p>
              </Card>
            ))}
          </div>
          )}
        </TabsContent>
      </Tabs>

      <Dialog open={proxyDialogOpen} onOpenChange={setProxyDialogOpen}>
        <DialogContent className="sm:max-w-md max-w-[calc(100vw-2rem)]">
          <DialogHeader>
            <DialogTitle>Collect Meal on Behalf</DialogTitle>
            <DialogDescription>Record one meal for the beneficiary while another student physically collects it with the container.</DialogDescription>
          </DialogHeader>
          <FieldGroup className="space-y-4">
            <div className="rounded-lg border bg-muted/30 p-3 text-sm"><div className="text-xs text-muted-foreground">Beneficiary</div><div className="font-semibold">{proxyBeneficiary?.name}</div><div className="text-xs text-muted-foreground mt-1">Meal: {currentSession?.mealType} · {currentSession?.distributionDate}</div></div>
            <Field><FieldLabel>Collector<span className="text-destructive"> *</span></FieldLabel>
              <Input placeholder="Search student name, ID or room" value={collectorQuery} onChange={(e) => setCollectorQuery(e.target.value)} />
              <div className="mt-2 max-h-48 overflow-auto rounded-md border">
                {collectorStudents.map((student) => <button type="button" key={student.id} onClick={() => setSelectedCollectorId(student.id)} className={`block w-full border-b px-3 py-2 text-left last:border-b-0 hover:bg-muted ${selectedCollectorId === student.id ? "bg-accent" : ""}`}><div className="text-sm font-medium">{student.name}</div><div className="text-[11px] text-muted-foreground">{student.studentId} · Room {student.roomNumber || "—"}</div></button>)}
                {!collectorStudents.length && <div className="p-3 text-xs text-muted-foreground">No eligible collector found.</div>}
              </div>
            </Field>
          </FieldGroup>
          <DialogFooter><Button variant="outline" onClick={() => setProxyDialogOpen(false)}>Cancel</Button><Button onClick={handleProxyMeal} disabled={!selectedCollectorId}>Confirm Proxy Collection</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Start New Meal Distribution Session Modal */}
      <Dialog open={newSessionModalOpen} onOpenChange={setNewSessionModalOpen}>
        <DialogContent className="sm:max-w-md max-w-[calc(100vw-2rem)]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <UtensilsCrossed className="size-5 text-primary" />
              Start Meal Distribution Session
            </DialogTitle>
            <DialogDescription>
              Launch dining counter session for breakfast, lunch, or dinner.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleCreateSessionSubmit}><FieldGroup className="space-y-4 py-2 text-xs">
            <Field><FieldLabel>Session Title<span className="text-destructive"> *</span></FieldLabel>
              <Input
                required
                placeholder="e.g. Wednesday Special Dinner"
                value={sessionForm.title}
                onChange={(e) => setSessionForm({ ...sessionForm, title: e.target.value })}
              />
            </Field>

            <FieldGroup className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Field><FieldLabel>Meal Type<span className="text-destructive"> *</span></FieldLabel>
                <Select value={sessionForm.mealType} onValueChange={(v) => setSessionForm({ ...sessionForm, mealType: ((v ?? "") as MealType) })}>
                  <SelectTrigger className="w-full"><SelectValue placeholder="Meal Type" /></SelectTrigger>
                  <SelectContent><SelectGroup><SelectItem value="BREAKFAST">Breakfast</SelectItem><SelectItem value="LUNCH">Lunch</SelectItem><SelectItem value="SNACKS">Evening Snacks</SelectItem><SelectItem value="DINNER">Dinner</SelectItem></SelectGroup></SelectContent>
                </Select>
              </Field>

              <Field><FieldLabel>Distribution Date<span className="text-destructive"> *</span></FieldLabel>
                <Input
                  type="date"
                  value={sessionForm.distributionDate}
                  onChange={(e) => setSessionForm({ ...sessionForm, distributionDate: e.target.value })}
                />
              </Field>
            </FieldGroup>

            <Field><FieldLabel>Menu Food Item<span className="text-destructive"> *</span></FieldLabel>
              <Select value={sessionForm.messItemId || messItems[0]?.id || ""} onValueChange={(v) => setSessionForm({ ...sessionForm, messItemId: (v ?? "") })}>
                <SelectTrigger className="w-full"><SelectValue placeholder="Select menu item" /></SelectTrigger>
                <SelectContent><SelectGroup>{messItems.map((i) => (
                  <SelectItem key={i.id} value={i.id}>
                    {i.name} ({i.category})
                  </SelectItem>
                ))}</SelectGroup></SelectContent>
              </Select>
            </Field>

            <DialogFooter>
              <Button variant="outline" size="sm" type="button" onClick={() => setNewSessionModalOpen(false)}>
                Cancel
              </Button>
              <Button size="sm" type="submit">
                Launch Counter Session
              </Button>
            </DialogFooter>
          </FieldGroup>
          </form>
        </DialogContent>
      </Dialog>

      {/* Add New Food Item Modal */}
      <Dialog open={newFoodItemModalOpen} onOpenChange={setNewFoodItemModalOpen}>
        <DialogContent className="sm:max-w-md max-w-[calc(100vw-2rem)]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Plus className="size-5 text-primary" />
              Register New Mess Food Item
            </DialogTitle>
            <DialogDescription>
              Add meal recipes & dietary categories to Panyor Hall Dining catalog.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleCreateFoodItemSubmit}><FieldGroup className="space-y-4 py-2 text-xs">
            <Field><FieldLabel>Food Item Name<span className="text-destructive"> *</span></FieldLabel>
              <Input
                required
                placeholder="e.g. Kadai Paneer with Jeera Rice"
                value={foodItemForm.name}
                onChange={(e) => setFoodItemForm({ ...foodItemForm, name: e.target.value })}
              />
            </Field>

            <Field><FieldLabel>Dietary Category<span className="text-destructive"> *</span></FieldLabel>
              <Select value={foodItemForm.category} onValueChange={(v) => setFoodItemForm({ ...foodItemForm, category: ((v ?? "") as MessCategory) })}>
                <SelectTrigger className="w-full"><SelectValue placeholder="Dietary Category" /></SelectTrigger>
                <SelectContent><SelectGroup><SelectItem value="VEG">VEG (Pure Vegetarian)</SelectItem><SelectItem value="NON_VEG">NON-VEG (Chicken / Fish / Meat)</SelectItem><SelectItem value="PANEER">PANEER (Special Veg)</SelectItem><SelectItem value="EGGS">EGGS (Egg Curry / Boiled)</SelectItem><SelectItem value="SPECIAL">SPECIAL (Festival / Feast)</SelectItem></SelectGroup></SelectContent>
              </Select>
            </Field>

            <Field><FieldLabel>Description / Serving Details</FieldLabel>
              <Textarea
                placeholder="e.g. Served with 2 hot rotis, daal tadka, and seasonal salad..."
                value={foodItemForm.description}
                onChange={(e) => setFoodItemForm({ ...foodItemForm, description: e.target.value })}
              />
            </Field>

            <DialogFooter>
              <Button variant="outline" size="sm" type="button" onClick={() => setNewFoodItemModalOpen(false)}>
                Cancel
              </Button>
              <Button size="sm" type="submit">
                Add Menu Item
              </Button>
            </DialogFooter>
          </FieldGroup>
          </form>
        </DialogContent>
      </Dialog>

      {/* Export Modal */}
      <ExportModal
        open={exportOpen}
        onOpenChange={setExportOpen}
        title="Hostel Mess Daily Distribution Report"
        filename="panyor_mess_distribution"
        data={filteredRecords.map((r) => ({
          date: r.distributionDate,
          mealType: r.mealType,
          item: r.messItemName,
          category: r.messCategory,
          student: r.studentName,
          roll: r.studentId,
          room: r.roomNumber || "N/A",
          time: new Date(r.distributedAt).toLocaleTimeString(),
          operator: r.recordedByName,
        }))}
        columns={[
          { header: "Date", key: "date", width: 12 },
          { header: "Meal", key: "mealType", width: 12 },
          { header: "Dish / Item", key: "item", width: 22 },
          { header: "Category", key: "category", width: 12 },
          { header: "Resident Student", key: "student", width: 22 },
          { header: "Roll #", key: "roll", width: 14 },
          { header: "Room", key: "room", width: 10 },
          { header: "Handed Out At", key: "time", width: 14 },
          { header: "Recorded By", key: "operator", width: 18 },
        ]}
        summaryStats={[
          { label: "Total Meals Distributed", value: filteredRecords.length },
          { label: "Active Residents", value: allStudents.filter((s) => s.approvalStatus === "APPROVED").length },
        ]}
        appliedFiltersText={`Date: ${historyDate}, Meal: ${historyMeal}`}
        currentRole={currentUser.role}
      />
    </div>
  )
}

