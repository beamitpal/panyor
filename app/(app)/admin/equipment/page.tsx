"use client"

import * as React from "react"
import {
  Gamepad2,
  Search,
  Plus,
  Download,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  ArrowRightLeft,
  ShieldAlert,
} from "lucide-react"
import { useRole } from "@/components/layout/role-context"
import type {
  EquipmentItem,
  EquipmentTransactionWithDetails,
  EquipmentRequestWithDetails,
  EquipmentCondition,
  EquipmentCategoryItem,
} from "@/types"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Empty } from "@/components/ui/empty"
import { Skeleton } from "@/components/ui/skeleton"
import { Alert, AlertDescription } from "@/components/ui/alert"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field"
import { Textarea } from "@/components/ui/textarea"
import { StudentSelector } from "@/components/shared/student-selector"
import { ExportModal } from "@/components/shared/export-modal"
import { toast } from "sonner"
import { useApi } from "@/hooks/use-api"

interface EquipmentPayload {
  equipment: EquipmentItem[]
  categories: EquipmentCategoryItem[]
  requests: EquipmentRequestWithDetails[]
  transactions: EquipmentTransactionWithDetails[]
}

async function readError(res: Response, fallback: string): Promise<string> {
  try {
    const data = await res.json()
    if (typeof data?.error === "string" && data.error) return data.error
  } catch {
    // ignore JSON parse errors
  }
  return fallback
}

export default function EquipmentPage() {
  const { currentUser, can } = useRole()

  const [search, setSearch] = React.useState("")
  const [categoryFilter, setCategoryFilter] = React.useState<string>("ALL")
  const [activeTab, setActiveTab] = React.useState("inventory")

  const { data, loading, error: loadError, reload } = useApi<EquipmentPayload>("/api/equipment")
  const equipment = React.useMemo(() => data?.equipment ?? [], [data])
  const categories = React.useMemo(() => data?.categories ?? [], [data])
  const requests = React.useMemo(() => data?.requests ?? [], [data])
  const transactions = React.useMemo(() => data?.transactions ?? [], [data])

  // Modals
  const [directIssueModalOpen, setDirectIssueModalOpen] = React.useState(false)
  const [studentReqModalOpen, setStudentReqModalOpen] = React.useState(false)
  const [returnModalOpen, setReturnModalOpen] = React.useState(false)
  const [addEquipmentModalOpen, setAddEquipmentModalOpen] = React.useState(false)
  const [exportOpen, setExportOpen] = React.useState(false)

  // Direct Issue Form State
  const [issueStudentId, setIssueStudentId] = React.useState("")
  const [issueEquipmentId, setIssueEquipmentId] = React.useState("")
  const [issueQuantity, setIssueQuantity] = React.useState(1)
  const [issueReturnDate, setIssueReturnDate] = React.useState(() =>
    new Date(Date.now() + 4 * 60 * 60 * 1000).toISOString().slice(0, 16)
  )
  const [issueNotes, setIssueNotes] = React.useState("")

  // Return Assessment State
  const [selectedTxn, setSelectedTxn] = React.useState<EquipmentTransactionWithDetails | null>(null)
  const [returnCondition, setReturnCondition] = React.useState<EquipmentCondition>("GOOD")
  const [damageNotes, setDamageNotes] = React.useState("")
  const [fineAmount, setFineAmount] = React.useState(0)

  // Add Equipment Form
  const [newEqForm, setNewEqForm] = React.useState({
    name: "",
    code: "",
    categoryId: "cat_board",
    description: "",
    totalQuantity: 2,
    condition: "EXCELLENT" as EquipmentCondition,
    replacementCost: 500,
  })

  // Keep category default in sync once categories load (replaces stale "cat_board").
  React.useEffect(() => {
    if (categories.length > 0) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setNewEqForm((prev) =>
        prev.categoryId === "cat_board" ||
        !categories.some((c) => c.id === prev.categoryId)
          ? { ...prev, categoryId: categories[0].id }
          : prev
      )
    }
  }, [categories])

  const filteredEquipment = React.useMemo(() => {
    let list = [...equipment]
    if (search.trim()) {
      const q = search.toLowerCase()
      list = list.filter(
        (e) =>
          e.name.toLowerCase().includes(q) ||
          e.code.toLowerCase().includes(q) ||
          (e.categoryName && e.categoryName.toLowerCase().includes(q))
      )
    }
    if (categoryFilter !== "ALL") {
      list = list.filter((e) => e.categoryId === categoryFilter)
    }
    return list
  }, [search, categoryFilter, equipment])

  const activeIssuedTxns = React.useMemo(() => {
    return transactions.filter((t) => t.status === "ISSUED")
  }, [transactions])

  const pendingRequests = React.useMemo(() => {
    return requests.filter((r) => r.status === "PENDING")
  }, [requests])

  const handleDirectIssueSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!issueStudentId || !issueEquipmentId) {
      toast.error("Please select both a resident student and equipment item.")
      return
    }

    const res = await fetch("/api/equipment/transactions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        studentProfileId: issueStudentId,
        equipmentId: issueEquipmentId,
        quantity: issueQuantity,
        expectedReturnDate: issueReturnDate,
        notes: issueNotes,
      }),
    })

    if (res.ok) {
      toast.success("Equipment issued successfully.")
      setDirectIssueModalOpen(false)
      setIssueStudentId("")
      setIssueEquipmentId("")
      setIssueQuantity(1)
      setIssueNotes("")
      reload()
    } else {
      toast.error(await readError(res, "Failed to issue equipment."))
    }
  }

  const handleReturnSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedTxn) return

    const res = await fetch(`/api/equipment/transactions/${selectedTxn.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "return",
        conditionAfter: returnCondition,
        damageNotes: returnCondition === "DAMAGED" ? damageNotes : undefined,
        fineAmount: returnCondition === "DAMAGED" ? fineAmount : 0,
      }),
    })

    if (res.ok) {
      toast.success("Equipment return processed.")
      setReturnModalOpen(false)
      setSelectedTxn(null)
      setDamageNotes("")
      setFineAmount(0)
      reload()
    } else {
      toast.error(await readError(res, "Failed to process return."))
    }
  }

  const handleMarkLost = async (txn: EquipmentTransactionWithDetails) => {
    if (!confirm(`Mark ${txn.equipmentName} as LOST for student ${txn.studentName}? Replacement penalty will be applied.`)) return

    const res = await fetch(`/api/equipment/transactions/${txn.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "lost" }),
    })

    if (res.ok) {
      toast.warning("Item marked as LOST in inventory register.")
      reload()
    } else {
      toast.error(await readError(res, "Failed to mark item as lost."))
    }
  }

  const handleReviewRequest = async (id: string, action: "approve" | "reject") => {
    const res = await fetch(`/api/equipment/requests/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action }),
    })

    if (res.ok) {
      toast.success(action === "approve" ? "Request approved and gear issued." : "Request rejected.")
      reload()
    } else {
      toast.error(await readError(res, "Failed to review request."))
    }
  }

  const handleAddEquipmentSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newEqForm.name || !newEqForm.code) {
      toast.error("Please provide equipment name and unique inventory code.")
      return
    }

    const res = await fetch("/api/equipment", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(newEqForm),
    })

    if (res.ok) {
      toast.success(`Equipment ${newEqForm.name} added to inventory.`)
      setAddEquipmentModalOpen(false)
      setNewEqForm({
        name: "",
        code: "",
        categoryId: "cat_board",
        description: "",
        totalQuantity: 2,
        condition: "EXCELLENT",
        replacementCost: 500,
      })
      reload()
    } else {
      toast.error(await readError(res, "Failed to create equipment."))
    }
  }

  const handleStudentRequestSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!currentUser.studentProfile) {
      toast.error("Only registered students can submit equipment requests.")
      return
    }

    const res = await fetch("/api/equipment/requests", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        studentProfileId: currentUser.studentProfile.id,
        equipmentId: issueEquipmentId,
        quantity: issueQuantity,
        expectedReturnDate: issueReturnDate,
        purpose: issueNotes,
      }),
    })

    if (res.ok) {
      toast.success("Equipment request submitted to Caretaker desk.")
      setStudentReqModalOpen(false)
      setIssueEquipmentId("")
      setIssueNotes("")
      reload()
    } else {
      toast.error(await readError(res, "Failed to submit request."))
    }
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">
            Sports & Games Inventory Desk
          </h1>
          <p className="text-xs text-muted-foreground">
            Dynamic inventory tracking for Outdoor Sports, Chess, Carrom, Cricket, Badminton, TT & Fitness gear.
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
              Export Register
            </Button>
          )}

          {can("equipment.create") && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setAddEquipmentModalOpen(true)}
              className="h-9 gap-1.5 text-xs"
            >
              <Plus className="size-3.5" />
              New Item
            </Button>
          )}

          {currentUser.role === "STUDENT" ? (
            <Button
              size="sm"
              onClick={() => setStudentReqModalOpen(true)}
              className="h-9 gap-1.5 text-xs"
            >
              <Gamepad2 className="size-3.5" />
              Request Gear
            </Button>
          ) : (
            can("equipment.issue") && (
              <Button
                size="sm"
                onClick={() => setDirectIssueModalOpen(true)}
                className="h-9 gap-1.5 text-xs"
              >
                <ArrowRightLeft className="size-3.5" />
                Quick Issue Gear
              </Button>
            )
          )}
        </div>
      </div>

      {loadError && (
        <Alert variant="destructive" className="flex items-center justify-between gap-3">
          <AlertDescription>{loadError}</AlertDescription>
          <Button variant="outline" size="sm" onClick={reload}>
            <RotateCcw className="size-3.5" />
            Retry
          </Button>
        </Alert>
      )}

      {/* Tabs Layout */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <TabsList className="h-9 max-w-full flex-nowrap overflow-x-auto">
            <TabsTrigger value="inventory">
              Inventory Catalog ({equipment.length})
            </TabsTrigger>
            <TabsTrigger value="active">
              Active Issued ({activeIssuedTxns.length})
            </TabsTrigger>
            <TabsTrigger value="requests">
              Requests ({pendingRequests.length})
            </TabsTrigger>
            <TabsTrigger value="history">
              Transaction History ({transactions.length})
            </TabsTrigger>
          </TabsList>

          {activeTab === "inventory" && (
            <div className="flex items-center gap-2">
              <div className="relative w-48 sm:w-64">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3 text-muted-foreground" />
                <Input
                  placeholder="Search gear..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-8 h-8 text-xs"
                />
              </div>

              <Select value={categoryFilter} onValueChange={(v) => setCategoryFilter(v ?? 'ALL')}>
                <SelectTrigger className="h-8 text-xs w-36">
                  <SelectValue placeholder="All Categories" />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    <SelectItem value="ALL">All Categories</SelectItem>
                    {categories.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.name}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                </SelectContent>
              </Select>
            </div>
          )}</div>
          {/* TAB 1: Inventory Catalog */}
          <TabsContent value="inventory" className="space-y-4">
            <Card>
              <CardContent className="p-0">
                <div className="overflow-x-auto"><Table className="min-w-[760px]">
                  <TableHeader>
                    <TableRow>
                      <TableHead>Equipment Item</TableHead>
                      <TableHead>Category</TableHead>
                      <TableHead className="text-center">Total</TableHead>
                      <TableHead className="text-center">Available</TableHead>
                      <TableHead className="text-center">Issued</TableHead>
                      <TableHead>Condition</TableHead>
                      <TableHead className="text-right">Action</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {loading ? (
                      <TableRow>
                        <TableCell colSpan={7} className="py-4">
                          <Skeleton className="h-10 w-full" />
                        </TableCell>
                      </TableRow>
                    ) : filteredEquipment.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={7} className="py-4">
                          <Empty
                            title="No equipment found"
                            description={search || categoryFilter !== "ALL" ? "Try clearing filters." : "Add the first item with “New Item”."}
                          />
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredEquipment.map((eq) => {
                        const isAvail = eq.availableQuantity > 0

                        return (
                          <TableRow key={eq.id}>
                            <TableCell>
                              <div className="flex flex-col">
                                <span className="font-bold text-foreground text-xs">{eq.name}</span>
                                <span className="text-[10px] text-muted-foreground font-mono">
                                  Code: {eq.code} • Repl. Cost: ₹{eq.replacementCost || 500}
                                </span>
                              </div>
                            </TableCell>

                            <TableCell>
                              <Badge variant="outline" size="sm" className="text-[10px]">
                                {eq.categoryName || "General"}
                              </Badge>
                            </TableCell>

                            <TableCell className="text-center font-mono font-bold">
                              {eq.totalQuantity}
                            </TableCell>

                            <TableCell className="text-center font-mono font-bold">
                              {eq.availableQuantity}
                            </TableCell>

                            <TableCell className="text-center font-mono font-bold">
                              {eq.issuedQuantity || 0}
                            </TableCell>

                            <TableCell>
                              {eq.condition}
                            </TableCell>

                            <TableCell className="text-right">
                              <Button
                                variant="ghost"
                                size="icon"
                                className="p-1"
                                disabled={!isAvail}
                                onClick={() => {
                                  setIssueEquipmentId(eq.id)
                                  setDirectIssueModalOpen(true)
                                }}
                              >
                                <ArrowRightLeft className="size-2.5" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        )
                      })
                    )}
                  </TableBody>
                </Table></div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="active" className="space-y-4">
            <Card>
              <CardContent className="p-0">
                <div className="overflow-x-auto"><Table className="min-w-[760px]">
                  <TableHeader>
                    <TableRow>
                      <TableHead>Transaction ID</TableHead>
                      <TableHead>Equipment</TableHead>
                      <TableHead>Student</TableHead>
                      <TableHead>Issued Date</TableHead>
                      <TableHead>Return Date</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Action</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {loading ? (
                      <TableRow>
                        <TableCell colSpan={7} className="py-4">
                          <Skeleton className="h-10 w-full" />
                        </TableCell>
                      </TableRow>
                    ) : activeIssuedTxns.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={7} className="py-4">
                          <Empty
                            title="No gear issued"
                            description="No gear currently issued."
                          />
                        </TableCell>
                      </TableRow>
                    ) : (
                      activeIssuedTxns.map((t) => (
                        <TableRow key={t.id}>
                          <TableCell>{t.id}</TableCell>
                          <TableCell>{t.equipmentName}</TableCell>
                          <TableCell>{t.studentName}</TableCell>
                          <TableCell>{t.issuedAt ? new Date(t.issuedAt).toLocaleDateString() : "-"}</TableCell>
                          <TableCell>{t.actualReturnDate ? new Date(t.actualReturnDate).toLocaleDateString() : "-"}</TableCell>
                          <TableCell>
                            <Badge
                              variant={t.status === "DAMAGED" ? "destructive" : "outline"}
                              size="sm"
                            >
                              {t.status}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-1">
                              {can("equipment.return") && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-7 text-[11px]"
                                  onClick={() => {
                                    setSelectedTxn(t)
                                    setReturnModalOpen(true)
                                  }}
                                >
                                  <RotateCcw className="size-3" />
                                  Return
                                </Button>
                              )}
                              {can("equipment.return") && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-7 text-[11px] text-destructive"
                                  onClick={() => void handleMarkLost(t)}
                                >
                                  <ShieldAlert className="size-3" />
                                  Lost
                                </Button>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table></div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="requests" className="space-y-4">
            <Card>
              <CardContent className="p-0">
                <div className="overflow-x-auto"><Table className="min-w-[760px]">
                  <TableHeader>
                    <TableHead>Request ID</TableHead>
                    <TableHead>Equipment</TableHead>
                    <TableHead>Student</TableHead>
                    <TableHead>Requested Date</TableHead>
                    <TableHead>Purpose</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Action</TableHead>
                  </TableHeader>
                  <TableBody>
                    {loading ? (
                      <TableRow>
                        <TableCell colSpan={7} className="py-4">
                          <Skeleton className="h-10 w-full" />
                        </TableCell>
                      </TableRow>
                    ) : pendingRequests.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={7} className="py-4">
                          <Empty
                            title="No pending requests"
                            description="There are no equipment requests awaiting review."
                          />
                        </TableCell>
                      </TableRow>
                    ) : (
                      pendingRequests.map((r) => (
                        <TableRow key={r.id}>
                          <TableCell>{r.id}</TableCell>
                          <TableCell>{r.equipmentName}</TableCell>
                          <TableCell>{r.studentName}</TableCell>
                          <TableCell>{r.requestedAt ? new Date(r.requestedAt).toLocaleDateString() || "-" : "-"}</TableCell>
                          <TableCell>{r.purpose || "-"}</TableCell>
                          <TableCell>
                            <Badge variant="outline" size="sm">PENDING</Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            {can("equipment.issue") && (
                              <div className="flex justify-end gap-1">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-7 text-[11px]"
                                  onClick={() => void handleReviewRequest(r.id, "approve")}
                                >
                                  <CheckCircle2 className="size-3" />
                                  Approve
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-7 text-[11px] text-destructive"
                                  onClick={() => void handleReviewRequest(r.id, "reject")}
                                >
                                  <AlertTriangle className="size-3" />
                                  Reject
                                </Button>
                              </div>
                            )}
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table></div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="history" className="space-y-4">
            <Card>
              <CardContent className="p-0">
                <div className="overflow-x-auto"><Table className="min-w-[760px]">
                  <TableHeader>
                    <TableRow>
                      <TableHead>Transaction ID</TableHead>
                      <TableHead>Equipment</TableHead>
                      <TableHead>Student</TableHead>
                      <TableHead>Issue Date</TableHead>
                      <TableHead>Return Date</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {loading ? (
                      <TableRow>
                        <TableCell colSpan={6} className="py-4">
                          <Skeleton className="h-10 w-full" />
                        </TableCell>
                      </TableRow>
                    ) : transactions.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} className="py-4">
                          <Empty
                            title="No transactions"
                            description="No transactions recorded yet."
                          />
                        </TableCell>
                      </TableRow>
                    ) : (
                      transactions.map((t) => (
                        <TableRow key={t.id}>
                          <TableCell>{t.id}</TableCell>
                          <TableCell>{t.equipmentName}</TableCell>
                          <TableCell>{t.studentName}</TableCell>
                          <TableCell>{(t.issuedAt ? new Date(t.issuedAt as unknown as string) : undefined)?.toLocaleDateString() || "-"}</TableCell>
                          <TableCell>{(t.actualReturnDate ? new Date(t.actualReturnDate as unknown as string) : undefined)?.toLocaleDateString() || "-"}</TableCell>
                          <TableCell>
                            <Badge variant={t.status === "DAMAGED" ? "destructive" : "outline"} size="sm">
                              {t.status}
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
      </Tabs>

      {/* New Item dialog */}
      <Dialog open={addEquipmentModalOpen} onOpenChange={setAddEquipmentModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add equipment item</DialogTitle>
            <DialogDescription>Add a new item to the inventory catalog.</DialogDescription>
          </DialogHeader>
          <form onSubmit={(e) => void handleAddEquipmentSubmit(e)}>
            <FieldGroup>
              <Field>
                <FieldLabel htmlFor="eq-name">Name</FieldLabel>
                <Input id="eq-name" value={newEqForm.name} onChange={(e) => setNewEqForm((p) => ({ ...p, name: e.target.value }))} />
              </Field>
              <Field>
                <FieldLabel htmlFor="eq-code">Code</FieldLabel>
                <Input id="eq-code" value={newEqForm.code} onChange={(e) => setNewEqForm((p) => ({ ...p, code: e.target.value }))} />
              </Field>
              <Field>
                <FieldLabel>Category</FieldLabel>
                <Select value={newEqForm.categoryId} onValueChange={(v) => setNewEqForm((p) => ({ ...p, categoryId: v ?? p.categoryId }))}>
                  <SelectTrigger><SelectValue placeholder="Select category" /></SelectTrigger>
                  <SelectContent><SelectGroup>
                    {categories.map((c) => (<SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>))}
                  </SelectGroup></SelectContent>
                </Select>
              </Field>
              <Field>
                <FieldLabel htmlFor="eq-desc">Description</FieldLabel>
                <Textarea id="eq-desc" value={newEqForm.description} onChange={(e) => setNewEqForm((p) => ({ ...p, description: e.target.value }))} />
              </Field>
              <Field>
                <FieldLabel htmlFor="eq-qty">Total quantity</FieldLabel>
                <Input id="eq-qty" type="number" min={1} value={newEqForm.totalQuantity} onChange={(e) => { const n = Number(e.target.value); setNewEqForm((p) => ({ ...p, totalQuantity: Number.isNaN(n) ? p.totalQuantity : n })) }} />
              </Field>
              <Field>
                <FieldLabel>Condition</FieldLabel>
                <Select value={newEqForm.condition} onValueChange={(v) => setNewEqForm((p) => ({ ...p, condition: (v ?? p.condition) as EquipmentCondition }))}>
                  <SelectTrigger><SelectValue placeholder="Select condition" /></SelectTrigger>
                  <SelectContent><SelectGroup>
                    {(["EXCELLENT", "GOOD", "FAIR", "POOR", "DAMAGED"] as EquipmentCondition[]).map((c) => (<SelectItem key={c} value={c}>{c}</SelectItem>))}
                  </SelectGroup></SelectContent>
                </Select>
              </Field>
              <Field>
                <FieldLabel htmlFor="eq-cost">Replacement cost</FieldLabel>
                <Input id="eq-cost" type="number" min={0} value={newEqForm.replacementCost} onChange={(e) => { const n = Number(e.target.value); setNewEqForm((p) => ({ ...p, replacementCost: Number.isNaN(n) ? p.replacementCost : n })) }} />
              </Field>
            </FieldGroup>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setAddEquipmentModalOpen(false)}>Cancel</Button>
              <Button type="submit">Add item</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Direct Issue dialog */}
      <Dialog open={directIssueModalOpen} onOpenChange={setDirectIssueModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Quick issue gear</DialogTitle>
            <DialogDescription>Issue equipment directly to a resident student.</DialogDescription>
          </DialogHeader>
          <form onSubmit={(e) => void handleDirectIssueSubmit(e)}>
            <FieldGroup>
              <Field>
                <FieldLabel>Student</FieldLabel>
                <StudentSelector value={issueStudentId} onChange={(s) => setIssueStudentId(s.id)} filterApprovedOnly />
              </Field>
              <Field>
                <FieldLabel>Equipment</FieldLabel>
                <Select value={issueEquipmentId} onValueChange={(v) => setIssueEquipmentId(v ?? "")}>
                  <SelectTrigger><SelectValue placeholder="Select equipment" /></SelectTrigger>
                  <SelectContent><SelectGroup>
                    {equipment.map((e) => (<SelectItem key={e.id} value={e.id}>{e.name}</SelectItem>))}
                  </SelectGroup></SelectContent>
                </Select>
              </Field>
              <Field>
                <FieldLabel htmlFor="issue-qty">Quantity</FieldLabel>
                <Input id="issue-qty" type="number" min={1} value={issueQuantity} onChange={(e) => { const n = Number(e.target.value); setIssueQuantity(Number.isNaN(n) ? 1 : n) }} />
              </Field>
              <Field>
                <FieldLabel htmlFor="issue-date">Expected return</FieldLabel>
                <Input id="issue-date" type="datetime-local" value={issueReturnDate} onChange={(e) => setIssueReturnDate(e.target.value)} />
              </Field>
              <Field>
                <FieldLabel htmlFor="issue-notes">Notes</FieldLabel>
                <Textarea id="issue-notes" value={issueNotes} onChange={(e) => setIssueNotes(e.target.value)} />
              </Field>
            </FieldGroup>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setDirectIssueModalOpen(false)}>Cancel</Button>
              <Button type="submit">Issue gear</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Return dialog */}
      <Dialog open={returnModalOpen} onOpenChange={(o) => { setReturnModalOpen(o); if (!o) setSelectedTxn(null) }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Process return</DialogTitle>
            <DialogDescription>Assess the returned gear and record any damage.</DialogDescription>
          </DialogHeader>
          <form onSubmit={(e) => void handleReturnSubmit(e)}>
            <FieldGroup>
              {selectedTxn && (
                <p className="text-xs text-muted-foreground">
                  {selectedTxn.equipmentName} — {selectedTxn.studentName} (Qty {selectedTxn.quantity})
                </p>
              )}
              <Field>
                <FieldLabel>Condition after return</FieldLabel>
                <Select value={returnCondition} onValueChange={(v) => setReturnCondition((v ?? "GOOD") as EquipmentCondition)}>
                  <SelectTrigger><SelectValue placeholder="Select condition" /></SelectTrigger>
                  <SelectContent><SelectGroup>
                    <SelectItem value="GOOD">GOOD</SelectItem>
                    <SelectItem value="DAMAGED">DAMAGED</SelectItem>
                  </SelectGroup></SelectContent>
                </Select>
              </Field>
              {returnCondition === "DAMAGED" && (
                <>
                  <Field>
                    <FieldLabel htmlFor="ret-damage">Damage notes</FieldLabel>
                    <Textarea id="ret-damage" value={damageNotes} onChange={(e) => setDamageNotes(e.target.value)} />
                  </Field>
                  <Field>
                    <FieldLabel htmlFor="ret-fine">Fine amount</FieldLabel>
                    <Input id="ret-fine" type="number" min={0} value={fineAmount} onChange={(e) => { const n = Number(e.target.value); setFineAmount(Number.isNaN(n) ? 0 : n) }} />
                  </Field>
                </>
              )}
            </FieldGroup>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setReturnModalOpen(false)}>Cancel</Button>
              <Button type="submit">Confirm return</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Student Request dialog */}
      {currentUser.studentProfile && (
      <Dialog open={studentReqModalOpen} onOpenChange={setStudentReqModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Request gear</DialogTitle>
            <DialogDescription>Submit an equipment request to the caretaker desk.</DialogDescription>
          </DialogHeader>
          <form onSubmit={(e) => void handleStudentRequestSubmit(e)}>
            <FieldGroup>
              <Field>
                <FieldLabel>Equipment</FieldLabel>
                <Select value={issueEquipmentId} onValueChange={(v) => setIssueEquipmentId(v ?? "")}>
                  <SelectTrigger><SelectValue placeholder="Select equipment" /></SelectTrigger>
                  <SelectContent><SelectGroup>
                    {equipment.map((eq) => (<SelectItem key={eq.id} value={eq.id}>{eq.name}</SelectItem>))}
                  </SelectGroup></SelectContent>
                </Select>
              </Field>
              <Field>
                <FieldLabel htmlFor="req-qty">Quantity</FieldLabel>
                <Input id="req-qty" type="number" min={1} value={issueQuantity} onChange={(e) => { const n = Number(e.target.value); setIssueQuantity(Number.isNaN(n) ? 1 : n) }} />
              </Field>
              <Field>
                <FieldLabel htmlFor="req-date">Expected return</FieldLabel>
                <Input id="req-date" type="datetime-local" value={issueReturnDate} onChange={(e) => setIssueReturnDate(e.target.value)} />
              </Field>
              <Field>
                <FieldLabel htmlFor="req-purpose">Purpose</FieldLabel>
                <Textarea id="req-purpose" value={issueNotes} onChange={(e) => setIssueNotes(e.target.value)} />
              </Field>
            </FieldGroup>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setStudentReqModalOpen(false)}>Cancel</Button>
              <Button type="submit">Submit request</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
      )}

      <ExportModal
        open={exportOpen}
        onOpenChange={setExportOpen}
        title="Equipment Register"
        filename="equipment_register"
        data={filteredEquipment}
        columns={[
          { header: "Item", key: "name" },
          { header: "Code", key: "code" },
          { header: "Category", key: "categoryName" },
          { header: "Total", key: "totalQuantity" },
          { header: "Available", key: "availableQuantity" },
          { header: "Issued", key: "issuedQuantity" },
        ]}
        currentRole={currentUser.role}
      />
    </div>
  )
}


