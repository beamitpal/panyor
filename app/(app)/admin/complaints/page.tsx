"use client"

import * as React from "react"
import {
  LifeBuoy,
  Search,
  Plus,
  Download,
  Send,
  MessageSquare,
  Star,
  UserCheck,
  Lock,
} from "lucide-react"
import { useRole } from "@/components/layout/role-context"
import type {
  ComplaintWithDetails,
  ComplaintStatus,
  ComplaintPriority,
  ComplaintCommentItem,
} from "@/types"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog"
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet"
import { Field, FieldLabel, FieldGroup } from "@/components/ui/field"
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Skeleton } from "@/components/ui/skeleton"
import { Empty } from "@/components/ui/empty"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Message, MessageScroller } from "@/components/ui/message"
import { StudentSelector } from "@/components/shared/student-selector"
import { ExportModal } from "@/components/shared/export-modal"
import { toast } from "sonner"
import { useApi } from "@/hooks/use-api"

export default function ComplaintsPage() {
  const { currentUser, can } = useRole()

  const { data, loading, error: loadError, reload } = useApi<{
    complaints: ComplaintWithDetails[]
    categories: { id: string; name: string }[]
  }>("/api/complaints")
  const complaints = React.useMemo(() => data?.complaints ?? [], [data])
  const categories = React.useMemo(() => data?.categories ?? [], [data])
  const canViewStaff = can("users.manage") || can("complaints.assign")
  const { data: staffData } = useApi<{ staff: { id: string; name: string; role: string }[] }>(
    canViewStaff ? "/api/staff" : null
  )
  const staffList = React.useMemo(() => staffData?.staff ?? [], [staffData])
  const [commentsById, setCommentsById] = React.useState<Record<string, ComplaintCommentItem[]>>({})

  const loadComments = React.useCallback(async (complaintId: string) => {
    try {
      const res = await fetch(`/api/complaints/${complaintId}/comments`, { cache: "no-store" })
      const data = await res.json()
      if (res.ok) setCommentsById((prev) => ({ ...prev, [complaintId]: data.comments ?? [] }))
    } catch {
      /* non-fatal */
    }
  }, [])

  const [search, setSearch] = React.useState("")
  const [statusFilter, setStatusFilter] = React.useState<string>("ALL")
  const [priorityFilter, setPriorityFilter] = React.useState<string>("ALL")
  const [categoryFilter, setCategoryFilter] = React.useState<string>("ALL")

  // Selected complaint for details drawer
  const [selectedComplaint, setSelectedComplaint] = React.useState<ComplaintWithDetails | null>(null)
  const [drawerOpen, setDrawerOpen] = React.useState(false)

  // Drawer comment state
  const [commentText, setCommentText] = React.useState("")
  const [isInternalComment, setIsInternalComment] = React.useState(false)

  // Status update state in drawer
  const [updateStatus, setUpdateStatus] = React.useState<ComplaintStatus>("IN_PROGRESS")
  const [assignedStaffId, setAssignedStaffId] = React.useState("")
  const [resolutionNotes, setResolutionNotes] = React.useState("")

  // Student feedback rating state
  const [ratingVal, setRatingVal] = React.useState(5)
  const [ratingNotes, setRatingNotes] = React.useState("")

  // Modals
  const [newComplaintModalOpen, setNewComplaintModalOpen] = React.useState(false)
  const [exportOpen, setExportOpen] = React.useState(false)

  // New Complaint Form
  const [formStudentId, setFormStudentId] = React.useState("")
  const [formCategory, setFormCategory] = React.useState("")
  const formCategoryEffective = formCategory || categories[0]?.id || ""
  const [formPriority, setFormPriority] = React.useState<ComplaintPriority>("MEDIUM")
  const [formTitle, setFormTitle] = React.useState("")
  const [formDescription, setFormDescription] = React.useState("")

  // Filter staff for assignment
  const staffMembers = React.useMemo(() => staffList, [staffList])

  const filteredComplaints = React.useMemo(() => {
    let list = [...complaints]

    // If active user is student, only show their complaints
    if (currentUser.role === "STUDENT" && currentUser.studentProfile) {
      list = list.filter((c) => c.studentProfileId === currentUser.studentProfile?.id)
    }

    if (search.trim()) {
      const q = search.toLowerCase()
      list = list.filter(
        (c) =>
          c.ticketNumber.toLowerCase().includes(q) ||
          c.title.toLowerCase().includes(q) ||
          c.description.toLowerCase().includes(q) ||
          c.studentName.toLowerCase().includes(q) ||
          (c.roomNumber && c.roomNumber.toLowerCase().includes(q))
      )
    }

    if (statusFilter !== "ALL") {
      list = list.filter((c) => c.status === statusFilter)
    }

    if (priorityFilter !== "ALL") {
      list = list.filter((c) => c.priority === priorityFilter)
    }

    if (categoryFilter !== "ALL") {
      list = list.filter((c) => c.categoryId === categoryFilter)
    }

    return list
  }, [search, statusFilter, priorityFilter, categoryFilter, currentUser, complaints])

  const complaintComments = React.useMemo(() => {
    if (!selectedComplaint) return []
    let list = commentsById[selectedComplaint.id] ?? []
    if (currentUser.role === "STUDENT") {
      list = list.filter((c) => !c.isInternal)
    }
    return [...list].sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
  }, [selectedComplaint, currentUser.role, commentsById])

  const handleOpenDrawer = (cmp: ComplaintWithDetails) => {
    setSelectedComplaint(cmp)
    setUpdateStatus(cmp.status)
    setAssignedStaffId(cmp.assignedTo || "")
    setResolutionNotes(cmp.resolutionNotes || "")
    setDrawerOpen(true)
    void loadComments(cmp.id)
  }

  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedComplaint || !commentText.trim()) return

    try {
      const res = await fetch(`/api/complaints/${selectedComplaint.id}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: commentText, isInternal: isInternalComment }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Failed to post comment.")
      setCommentText("")
      setIsInternalComment(false)
      await loadComments(selectedComplaint.id)
      reload()
    } catch {
      toast.error("Failed to post comment.")
    }
  }

  const handleUpdateStatusSubmit = async () => {
    if (!selectedComplaint) return

    try {
      const res = await fetch(`/api/complaints/${selectedComplaint.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: updateStatus,
          assignedTo: assignedStaffId || null,
          resolutionNotes: updateStatus === "RESOLVED" ? resolutionNotes : undefined,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Failed to update status.")
      toast.success(`Complaint status updated to ${updateStatus}.`)
      reload()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to update status.")
    }
  }

  const handleStudentFeedbackSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedComplaint) return

    try {
      const res = await fetch(`/api/complaints/${selectedComplaint.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "CLOSED", rating: ratingVal, feedbackNotes: ratingNotes }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Failed to submit feedback.")
      toast.success("Feedback submitted and ticket closed.")
      reload()
    } catch {
      toast.error("Failed to submit feedback.")
    }
  }

  const handleCreateComplaintSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const studentProfileId =
      currentUser.role === "STUDENT" && currentUser.studentProfile
        ? currentUser.studentProfile.id
        : formStudentId

    if (!studentProfileId) {
      toast.error("Please select a student profile.")
      return
    }

    if (!formTitle.trim() || !formDescription.trim()) {
      toast.error("Please provide title and description.")
      return
    }

    try {
      const res = await fetch("/api/complaints", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          studentProfileId,
          categoryId: formCategoryEffective,
          priority: formPriority,
          title: formTitle,
          description: formDescription,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Failed to log complaint.")
      toast.success(`Complaint ${data.complaint?.ticketNumber} logged successfully.`)
      setNewComplaintModalOpen(false)
      setFormTitle("")
      setFormDescription("")
      setFormStudentId("")
      reload()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to log complaint.")
    }
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">
            Complaints & Maintenance Triage Desk
          </h1>
          <p className="text-xs text-muted-foreground">
            Rapid issue reporting, caretaker assignments, timeline comments & student satisfaction ratings.
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

          <Button
            size="sm"
            onClick={() => {
              if (currentUser.role === "STUDENT" && currentUser.studentProfile) {
                setFormStudentId(currentUser.studentProfile.id)
              }
              setNewComplaintModalOpen(true)
            }}
            className="h-9 gap-1.5 text-xs"
          >
            <Plus className="size-3.5" />
            Log Complaint
          </Button>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
            <div className="sm:col-span-5 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
              <Input
                placeholder="Search ticket # (e.g. CMP-2026-001), room, keyword..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9 h-9 text-xs"
              />
            </div>

            <div className="sm:col-span-2">
              <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v ?? 'ALL')}>
                <SelectTrigger className="h-9 text-xs w-full">
                  <SelectValue placeholder="All Statuses" />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    <SelectItem value="ALL">All Statuses</SelectItem>
                    <SelectItem value="OPEN">Open</SelectItem>
                    <SelectItem value="ACKNOWLEDGED">Acknowledged</SelectItem>
                    <SelectItem value="IN_PROGRESS">In Progress</SelectItem>
                    <SelectItem value="RESOLVED">Resolved</SelectItem>
                    <SelectItem value="CLOSED">Closed</SelectItem>
                  </SelectGroup>
                </SelectContent>
              </Select>
            </div>

            <div className="sm:col-span-2">
              <Select value={priorityFilter} onValueChange={(v) => setPriorityFilter(v ?? 'ALL')}>
                <SelectTrigger className="h-9 text-xs w-full">
                  <SelectValue placeholder="All Priorities" />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    <SelectItem value="ALL">All Priorities</SelectItem>
                    <SelectItem value="URGENT">Urgent SLA</SelectItem>
                    <SelectItem value="HIGH">High Priority</SelectItem>
                    <SelectItem value="MEDIUM">Medium Priority</SelectItem>
                    <SelectItem value="LOW">Low Priority</SelectItem>
                  </SelectGroup>
                </SelectContent>
              </Select>
            </div>

            <div className="sm:col-span-3">
              <Select value={categoryFilter} onValueChange={(v) => setCategoryFilter(v ?? 'ALL')}>
                <SelectTrigger className="h-9 text-xs w-full">
                  <SelectValue placeholder="All Maintenance Categories" />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    <SelectItem value="ALL">All Maintenance Categories</SelectItem>
                    {categories.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.name}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Complaints Table */}
      <Card>
        <CardHeader className="p-4 pb-2">
          <CardTitle className="text-sm font-bold">Maintenance Tickets ({filteredComplaints.length})</CardTitle>
          <CardDescription>Click any row to open the complete timeline, assignment controls & comments</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto"><Table className="min-w-[760px]">
            <TableHeader>
              <TableRow>
                <TableHead>Ticket & Priority</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Resident / Room</TableHead>
                <TableHead>Issue Summary</TableHead>
                <TableHead>Assigned To</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={7} className="py-8">
                    <div className="space-y-2 px-4">
                      <Skeleton className="h-8 w-full" />
                      <Skeleton className="h-8 w-full" />
                      <Skeleton className="h-8 w-full" />
                    </div>
                  </TableCell>
                </TableRow>
              ) : loadError ? (
                <TableRow>
                  <TableCell colSpan={7} className="py-8 px-4">
                    <Alert variant="destructive">
                      <AlertDescription>
                        {loadError}{" "}
                        <button className="underline" onClick={reload}>
                          Retry
                        </button>
                      </AlertDescription>
                    </Alert>
                  </TableCell>
                </TableRow>
              ) : filteredComplaints.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="py-4 px-4">
                    <Empty
                      title="No complaint tickets found"
                      description="No complaint tickets found matching criteria."
                    />
                  </TableCell>
                </TableRow>
              ) : (
                filteredComplaints.map((cmp) => {
                  return (
                    <TableRow
                      key={cmp.id}
                      className="cursor-pointer hover:bg-muted/60"
                      onClick={() => handleOpenDrawer(cmp)}
                    >
                      <TableCell>
                        <div className="flex flex-col">
                          <span className="font-mono font-bold break-all text-foreground text-xs">{cmp.ticketNumber}</span>
                          <Badge
                            variant={
                              cmp.priority === "URGENT"
                                ? "destructive"
                                : cmp.priority === "HIGH"
                                ? "warning"
                                : "outline"
                            }
                            size="sm"
                            className="font-mono text-[9px] py-0 px-1 w-fit mt-0.5"
                          >
                            {cmp.priority}
                          </Badge>
                        </div>
                      </TableCell>

                      <TableCell>
                        <Badge variant="secondary" size="sm" className="text-[10px]">
                          {cmp.categoryName}
                        </Badge>
                      </TableCell>

                      <TableCell>
                        <div className="flex flex-col">
                          <span className="font-semibold text-foreground text-xs">{cmp.studentName}</span>
                          <span className="text-[10px] text-muted-foreground font-mono">
                            {cmp.roomNumber ? `Room ${cmp.roomNumber}` : "No Room"}
                          </span>
                        </div>
                      </TableCell>

                      <TableCell className="max-w-[240px]">
                        <p className="font-medium text-foreground text-xs truncate">{cmp.title}</p>
                        <p className="text-[11px] text-muted-foreground truncate">{cmp.description}</p>
                      </TableCell>

                      <TableCell className="text-xs text-muted-foreground">
                        {cmp.assignedToName ? (
                          <span className="font-medium text-foreground">{cmp.assignedToName}</span>
                        ) : (
                          <span className="text-muted-foreground italic">Unassigned</span>
                        )}
                      </TableCell>

                      <TableCell>
                        <Badge
                          variant={
                            cmp.status === "RESOLVED" || cmp.status === "CLOSED"
                              ? "success"
                              : cmp.status === "IN_PROGRESS"
                              ? "info"
                              : "warning"
                          }
                          size="sm"
                          className="font-mono text-[10px]"
                        >
                          {cmp.status}
                        </Badge>
                      </TableCell>

                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 text-xs"
                          onClick={(e) => {
                            e.stopPropagation()
                            handleOpenDrawer(cmp)
                          }}
                        >
                          Timeline ({cmp.commentsCount || 0})
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

      {/* Ticket Details & Triage Drawer */}
      <Sheet open={drawerOpen} onOpenChange={setDrawerOpen}>
        <SheetContent side="right" className="w-full sm:max-w-xl overflow-y-auto">
          {selectedComplaint && (
            <div className="space-y-5 pt-3">
              <SheetHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-bold break-all text-base text-foreground">
                      {selectedComplaint.ticketNumber}
                    </span>
                    <Badge
                      variant={
                        selectedComplaint.priority === "URGENT"
                          ? "destructive"
                          : selectedComplaint.priority === "HIGH"
                          ? "warning"
                          : "outline"
                      }
                      size="sm"
                      className="font-mono text-[10px]"
                    >
                      {selectedComplaint.priority}
                    </Badge>
                  </div>
                  <Badge
                    variant={
                      selectedComplaint.status === "RESOLVED" || selectedComplaint.status === "CLOSED"
                        ? "success"
                        : "info"
                    }
                  >
                    {selectedComplaint.status}
                  </Badge>
                </div>
                <SheetTitle className="text-base text-left">{selectedComplaint.title}</SheetTitle>
                <SheetDescription className="text-left text-xs">
                  Logged on {new Date(selectedComplaint.createdAt).toLocaleString()} by {selectedComplaint.studentName} (Room {selectedComplaint.roomNumber || "N/A"})
                </SheetDescription>
              </SheetHeader>

              {/* Description Block */}
              <div className="rounded-lg border border-border bg-muted/30 p-3 text-xs leading-relaxed text-foreground">
                <span className="font-semibold text-muted-foreground block text-[10px] uppercase mb-1">
                  Issue Description
                </span>
                {selectedComplaint.description}
              </div>

              {/* Staff Triage & Assignment Section (for Wardens, Caretakers, Admins) */}
              {can("complaints.assign") && (
                <div className="rounded-xl border border-border bg-card p-4 space-y-3 text-xs">
                  <div className="flex items-center justify-between">
                    <h4 className="font-bold text-foreground flex items-center gap-1.5">
                      <UserCheck className="size-4 text-primary" /> Staff Triage & Status Control
                    </h4>
                    <Button size="sm" className="h-7 text-[11px] px-2.5" onClick={handleUpdateStatusSubmit}>
                      Apply Updates
                    </Button>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <Field>
                      <FieldLabel>Update Lifecycle Status</FieldLabel>
                      <Select
                        value={updateStatus}
                        onValueChange={(v) => setUpdateStatus(v as ComplaintStatus)}
                      >
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Select status" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectGroup>
                            <SelectItem value="OPEN">OPEN</SelectItem>
                            <SelectItem value="ACKNOWLEDGED">ACKNOWLEDGED</SelectItem>
                            <SelectItem value="IN_PROGRESS">IN_PROGRESS</SelectItem>
                            <SelectItem value="RESOLVED">RESOLVED</SelectItem>
                            <SelectItem value="CLOSED">CLOSED</SelectItem>
                            <SelectItem value="REJECTED">REJECTED</SelectItem>
                          </SelectGroup>
                        </SelectContent>
                      </Select>
                    </Field>

                    <Field>
                      <FieldLabel>Assign Responsible Staff</FieldLabel>
                      <Select
                        value={assignedStaffId}
                        onValueChange={(v) => setAssignedStaffId(v ?? '')}
                      >
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="-- Select Staff --" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectGroup>
                            <SelectItem value="">-- Select Staff --</SelectItem>
                            {staffMembers.map((s) => (
                              <SelectItem key={s.id} value={s.id}>
                                {s.name} ({s.role})
                              </SelectItem>
                            ))}
                          </SelectGroup>
                        </SelectContent>
                      </Select>
                    </Field>
                  </div>

                  {updateStatus === "RESOLVED" && (
                    <Field>
                      <FieldLabel>
                        Resolution Notes / Actions Taken<span className="text-destructive"> *</span>
                      </FieldLabel>
                      <Input
                        placeholder="e.g. Electrician replaced capacitor & repaired socket wiring..."
                        value={resolutionNotes}
                        onChange={(e) => setResolutionNotes(e.target.value)}
                      />
                    </Field>
                  )}
                </div>
              )}

              {/* Student Resolution Feedback Box */}
              {selectedComplaint.status === "RESOLVED" && currentUser.role === "STUDENT" && (
                <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-4 space-y-3 text-xs">
                  <h4 className="font-bold text-emerald-800 dark:text-emerald-300 flex items-center gap-1.5">
                    <Star className="size-4 fill-amber-400 text-amber-400" /> Confirm Resolution & Rate Service
                  </h4>
                  <p className="text-muted-foreground text-[11px]">
                    The staff has marked this complaint as resolved. Please submit your confirmation rating to close the ticket.
                  </p>
                  <form onSubmit={handleStudentFeedbackSubmit}>
                    <FieldGroup className="space-y-2">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-foreground">Rating:</span>
                      <div className="flex gap-1">
                        {[1, 2, 3, 4, 5].map((star) => (
                          <button
                            key={star}
                            type="button"
                            onClick={() => setRatingVal(star)}
                            className="text-amber-400 hover:scale-110 transition-transform"
                          >
                            <Star className={`size-5 ${star <= ratingVal ? "fill-amber-400" : "text-muted-foreground"}`} />
                          </button>
                        ))}
                      </div>
                    </div>
                    <Input
                      placeholder="Optional feedback notes..."
                      value={ratingNotes}
                      onChange={(e) => setRatingNotes(e.target.value)}
                      className="text-xs bg-background"
                    />
                    <Button size="sm" type="submit" className="h-7 text-xs">
                      Submit Feedback & Close Ticket
                    </Button>
                    </FieldGroup>
                  </form>
                </div>
              )}

              {/* Resolution Info if closed */}
              {selectedComplaint.resolutionNotes && (
                <div className="rounded-lg border border-border bg-muted/40 p-3 text-xs space-y-1">
                  <span className="font-semibold text-foreground">Official Resolution Note</span>
                  <p className="text-muted-foreground">{selectedComplaint.resolutionNotes}</p>
                  {selectedComplaint.studentFeedbackRating && (
                    <div className="flex items-center gap-1 pt-1 text-amber-500 text-[11px] font-semibold">
                      <Star className="size-3.5 fill-amber-400" /> Rated {selectedComplaint.studentFeedbackRating}/5 Stars by Student
                    </div>
                  )}
                </div>
              )}

              {/* Timeline Discussion & Internal Staff Notes */}
              <div className="space-y-3 pt-2">
                <div className="flex items-center justify-between">
                  <h4 className="font-bold text-foreground text-xs flex items-center gap-1.5">
                    <MessageSquare className="size-4 text-primary" /> Timeline Discussion ({complaintComments.length})
                  </h4>
                  {currentUser.role !== "STUDENT" && (
                    <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                      <Lock className="size-3" /> Internal staff notes supported
                    </span>
                  )}
                </div>

                <MessageScroller className="border border-border rounded-xl bg-card/60">
                  {complaintComments.length === 0 ? (
                    <div className="py-6 text-center text-xs text-muted-foreground">
                      No comments yet. Post an update below.
                    </div>
                  ) : (
                    complaintComments.map((cmt) => (
                      <Message
                        key={cmt.id}
                        author={cmt.userName}
                        role={cmt.userRole}
                        avatarUrl={cmt.userAvatar}
                        timestamp={cmt.createdAt}
                        content={cmt.message}
                        isInternal={cmt.isInternal}
                        align={cmt.userId === currentUser.id ? "right" : "left"}
                      />
                    ))
                  )}
                </MessageScroller>

                {/* Post New Comment */}
                <form onSubmit={handleAddComment}>
                  <FieldGroup className="space-y-2 pt-1">
                  <div className="flex gap-2">
                    <Input
                      placeholder="Write comment or status update..."
                      value={commentText}
                      onChange={(e) => setCommentText(e.target.value)}
                      className="text-xs h-9"
                    />
                    <Button size="sm" type="submit" className="h-9 px-3 shrink-0" disabled={!commentText.trim()}>
                      <Send className="size-3.5" />
                    </Button>
                  </div>

                  {currentUser.role !== "STUDENT" && (
                    <label className="flex items-center gap-2 text-[11px] text-muted-foreground cursor-pointer">
                      <input
                        type="checkbox"
                        checked={isInternalComment}
                        onChange={(e) => setIsInternalComment(e.target.checked)}
                        className="rounded border-input size-3.5"
                      />
                      <span className="text-amber-700 dark:text-amber-400 font-medium flex items-center gap-1">
                        <Lock className="size-3" /> Mark as Internal Staff Note (hidden from resident student)
                      </span>
                    </label>
                  )}
                  </FieldGroup>
                </form>
              </div>
            </div>
          )}
        </SheetContent>
      </Sheet>

      {/* Log New Complaint Modal */}
      <Dialog open={newComplaintModalOpen} onOpenChange={setNewComplaintModalOpen}>
        <DialogContent className="sm:max-w-md max-w-[calc(100vw-2rem)]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <LifeBuoy className="size-5 text-primary" />
              Log Hostel Complaint Ticket
            </DialogTitle>
            <DialogDescription>
              Submit maintenance, electrical, plumbing, mess, or cleanliness issues for rapid resolution.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleCreateComplaintSubmit}>
            <FieldGroup className="space-y-4 py-2 text-xs">
            {currentUser.role !== "STUDENT" && (
              <Field>
                <FieldLabel>
                  Select Resident Student (On behalf of)<span className="text-destructive"> *</span>
                </FieldLabel>
                <StudentSelector
                  value={formStudentId}
                  onChange={(s) => setFormStudentId(s.id)}
                  filterApprovedOnly
                  placeholder="Search resident student..."
                />
              </Field>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Field>
                <FieldLabel>
                  Category<span className="text-destructive"> *</span>
                </FieldLabel>
                <Select
                  value={formCategoryEffective}
                  onValueChange={(v) => setFormCategory(v ?? '')}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      {categories.map((c) => (
                        <SelectItem key={c.id} value={c.id}>
                          {c.name}
                        </SelectItem>
                      ))}
                    </SelectGroup>
                  </SelectContent>
                </Select>
              </Field>

              <Field>
                <FieldLabel>
                  Priority Level<span className="text-destructive"> *</span>
                </FieldLabel>
                <Select
                  value={formPriority}
                  onValueChange={(v) => setFormPriority(v as ComplaintPriority)}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select priority" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      <SelectItem value="LOW">Low</SelectItem>
                      <SelectItem value="MEDIUM">Medium</SelectItem>
                      <SelectItem value="HIGH">High</SelectItem>
                      <SelectItem value="URGENT">Urgent SLA</SelectItem>
                    </SelectGroup>
                  </SelectContent>
                </Select>
              </Field>
            </div>

            <Field>
              <FieldLabel>
                Summary Title<span className="text-destructive"> *</span>
              </FieldLabel>
              <Input
                required
                placeholder="e.g. Ceiling fan regulator burnt in Room 102"
                value={formTitle}
                onChange={(e) => setFormTitle(e.target.value)}
              />
            </Field>

            <Field>
              <FieldLabel>
                Detailed Description<span className="text-destructive"> *</span>
              </FieldLabel>
              <Textarea
                required
                placeholder="Explain the problem in detail (location, when noticed, severity)..."
                value={formDescription}
                onChange={(e) => setFormDescription(e.target.value)}
                className="min-h-[80px]"
              />
            </Field>

            <DialogFooter className="pt-2">
              <Button variant="outline" size="sm" type="button" onClick={() => setNewComplaintModalOpen(false)}>
                Cancel
              </Button>
              <Button size="sm" type="submit" disabled={!formTitle.trim()}>
                Submit Ticket
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
        title="Hostel Complaint Register & SLA Report"
        filename="panyor_complaints_register"
        data={filteredComplaints.map((c) => ({
          ticketNumber: c.ticketNumber,
          category: c.categoryName,
          priority: c.priority,
          student: c.studentName,
          room: c.roomNumber || "N/A",
          title: c.title,
          status: c.status,
          assignedTo: c.assignedToName || "Unassigned",
          createdAt: new Date(c.createdAt).toLocaleDateString(),
        }))}
        columns={[
          { header: "Ticket #", key: "ticketNumber", width: 15 },
          { header: "Priority", key: "priority", width: 12 },
          { header: "Category", key: "category", width: 18 },
          { header: "Resident", key: "student", width: 22 },
          { header: "Room", key: "room", width: 10 },
          { header: "Title", key: "title", width: 30 },
          { header: "Status", key: "status", width: 14 },
          { header: "Assigned Staff", key: "assignedTo", width: 20 },
          { header: "Date Logged", key: "createdAt", width: 14 },
        ]}
        summaryStats={[
          { label: "Total Complaints", value: complaints.length },
          { label: "Open / Active", value: complaints.filter((c) => c.status !== "CLOSED" && c.status !== "RESOLVED").length },
          { label: "Resolved", value: complaints.filter((c) => c.status === "RESOLVED" || c.status === "CLOSED").length },
        ]}
        appliedFiltersText={`Status: ${statusFilter}, Priority: ${priorityFilter}`}
        currentRole={currentUser.role}
      />
    </div>
  )
}






