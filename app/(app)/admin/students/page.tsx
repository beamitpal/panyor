"use client"

import * as React from "react"
import {
  Search,
  Check,
  X,
  UserPlus,
  Download,
  Eye,
  Building2,
  Phone,
  GraduationCap,
} from "lucide-react"
import { useApi } from "@/hooks/use-api"
import { useRole } from "@/components/layout/role-context"
import type { StudentProfileWithDetails } from "@/types"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
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
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Empty } from "@/components/ui/empty"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { ExportModal } from "@/components/shared/export-modal"
import { RoleManager } from "@/components/shared/role-manager"
import { RGU_DEPARTMENT_NAMES, programsFor } from "@/lib/data/rgu-programs"
import { toast } from "sonner"

export default function StudentsPage() {
  const { currentUser, can } = useRole()

  const [search, setSearch] = React.useState("")
  const [statusFilter, setStatusFilter] = React.useState<string>("ALL")
  const [departmentFilter, setDepartmentFilter] = React.useState<string>("ALL")

  // Selected student for drawer view
  const [selectedStudent, setSelectedStudent] = React.useState<StudentProfileWithDetails | null>(null)
  const [sheetOpen, setSheetOpen] = React.useState(false)

  // Modals
  const [registerModalOpen, setRegisterModalOpen] = React.useState(false)
  const [rejectModalOpen, setRejectModalOpen] = React.useState(false)
  const [targetStudent, setTargetStudent] = React.useState<StudentProfileWithDetails | null>(null)
  const [rejectionReason, setRejectionReason] = React.useState("")
  const [exportOpen, setExportOpen] = React.useState(false)

  // Live resident directory from PostgreSQL (authoritative — replaces the old mock store).
  const { data, error: loadError, loading, reload: loadStudents } = useApi<{ students: StudentProfileWithDetails[] }>("/api/students")
  const students = React.useMemo(() => data?.students ?? [], [data])

  // Registration form
  const [regForm, setRegForm] = React.useState({
    name: "",
    email: "",
    phone: "",
    password: "",
    studentId: "",
    enrollmentNo: "",
    department: "Computer Science & Engineering",
    program: "B.Tech",
    year: 1,
    semester: 1,
    emergencyContactName: "",
    emergencyContactPhone: "",
    bloodGroup: "O+",
    address: "",
  })

  const departments = React.useMemo(() => {
    const set = new Set(students.map((s) => s.department))
    return Array.from(set)
  }, [students])

  const filteredStudents = React.useMemo(() => {
    let list = [...students]

    if (search.trim()) {
      const q = search.toLowerCase()
      list = list.filter(
        (s) =>
          s.name.toLowerCase().includes(q) ||
          s.studentId.toLowerCase().includes(q) ||
          s.enrollmentNo.toLowerCase().includes(q) ||
          s.email.toLowerCase().includes(q) ||
          (s.roomNumber && s.roomNumber.toLowerCase().includes(q))
      )
    }

    if (statusFilter !== "ALL") {
      list = list.filter((s) => s.approvalStatus === statusFilter)
    }

    if (departmentFilter !== "ALL") {
      list = list.filter((s) => s.department === departmentFilter)
    }

    return list
  }, [search, statusFilter, departmentFilter, students])

  const runApprovalAction = React.useCallback(
    async (student: StudentProfileWithDetails, action: "APPROVE" | "REJECT" | "SUSPEND", reason?: string) => {
      const response = await fetch(`/api/students/${student.id}/approval`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, reason }),
      })
      const result = await response.json()
      if (!response.ok) throw new Error(result.error || "Approval action failed.")
    },
    []
  )

  const handleApprove = async (student: StudentProfileWithDetails) => {
    try {
      await runApprovalAction(student, "APPROVE")
      toast.success(`Student ${student.name} approved successfully.`)
      loadStudents()
    } catch (err: unknown) {
      toast.error(`Approval failed: ${err instanceof Error ? err.message : "Unknown error"}`)
    }
  }

  const handleRejectConfirm = async () => {
    if (!targetStudent) return
    if (!rejectionReason.trim()) {
      toast.error("Please provide a reason for rejection.")
      return
    }

    try {
      await runApprovalAction(targetStudent, "REJECT", rejectionReason.trim())
      toast.success(`Student registration rejected.`)
      setRejectModalOpen(false)
      setRejectionReason("")
      setTargetStudent(null)
      loadStudents()
    } catch (err: unknown) {
      toast.error(`Rejection failed: ${err instanceof Error ? err.message : "Unknown error"}`)
    }
  }

  const handleSuspend = async (student: StudentProfileWithDetails) => {
    const reason = prompt("Enter suspension reason:", "Hostel disciplinary review")
    if (!reason) return

    try {
      await runApprovalAction(student, "SUSPEND", reason)
      toast.warning(`Student ${student.name} suspended.`)
      loadStudents()
    } catch (err: unknown) {
      toast.error(`Suspension failed: ${err instanceof Error ? err.message : "Unknown error"}`)
    }
  }

  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!regForm.name || !regForm.email || !regForm.studentId) {
      toast.error("Please fill in all mandatory fields.")
      return
    }

    try {
      const response = await fetch("/api/students", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: regForm.name.trim(),
          email: regForm.email.trim(),
          phone: regForm.phone.trim() || undefined,
          password: regForm.password || undefined,
          studentId: regForm.studentId.trim(),
          enrollmentNo: (regForm.enrollmentNo || regForm.studentId).trim(),
          department: regForm.department,
          program: regForm.program,
          year: regForm.year,
          semester: regForm.semester,
          emergencyContactName: regForm.emergencyContactName || undefined,
          emergencyContactPhone: regForm.emergencyContactPhone || undefined,
          bloodGroup: regForm.bloodGroup || undefined,
          address: regForm.address || undefined,
        }),
      })
      const result = await response.json()
      if (!response.ok) throw new Error(result.error || "Unable to invite student.")
      toast.success(
        result.tempPassword
          ? `Account created (PENDING). Temporary password: ${result.tempPassword} — share it with the student.`
          : "Account created (PENDING). The student can sign in with the set password.",
        { duration: 10000 }
      )
      setRegisterModalOpen(false)
      setRegForm({
        name: "",
        email: "",
        phone: "",
        password: "",
        studentId: "",
        enrollmentNo: "",
        department: "Computer Science & Engineering",
        program: "B.Tech",
        year: 1,
        semester: 1,
        emergencyContactName: "",
        emergencyContactPhone: "",
        bloodGroup: "O+",
        address: "",
      })
      loadStudents()
    } catch (err: unknown) {
      toast.error(`Registration failed: ${err instanceof Error ? err.message : "Unknown error"}`)
    }
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Top Header & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">
            Student Resident Directory
          </h1>
          <p className="text-xs text-muted-foreground">
            Hostel enrollment, verification, double occupancy allocations & administrative approvals.
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
              Export Roster
            </Button>
          )}

          {can("students.create") && (
            <Button
              size="sm"
              onClick={() => setRegisterModalOpen(true)}
              className="h-9 gap-1.5 text-xs"
            >
              <UserPlus className="size-3.5" />
              Register Student
            </Button>
          )}
        </div>
      </div>

      {/* Filter Bar */}
      <Card>
        <CardContent className="p-4">
          <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
            <div className="sm:col-span-5 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
              <Input
                placeholder="Search by student name, ID (e.g. 042), enrollment, room..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9 h-9 text-xs"
              />
            </div>

            <div className="sm:col-span-3">
              <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v ?? 'ALL')}>
                <SelectTrigger className="h-9 text-xs w-full"><SelectValue placeholder="Filter by status" /></SelectTrigger>
                <SelectContent><SelectGroup>
                <SelectItem value="ALL">All Statuses ({students.length})</SelectItem>
                <SelectItem value="APPROVED">Approved ({students.filter((s) => s.approvalStatus === "APPROVED").length})</SelectItem>
                <SelectItem value="PENDING">Pending Approval ({students.filter((s) => s.approvalStatus === "PENDING").length})</SelectItem>
                <SelectItem value="REJECTED">Rejected</SelectItem>
                <SelectItem value="SUSPENDED">Suspended</SelectItem>
              </SelectGroup></SelectContent></Select>
            </div>

            <div className="sm:col-span-4">
              <Select value={departmentFilter} onValueChange={(v) => setDepartmentFilter(v ?? 'ALL')}>
                <SelectTrigger className="h-9 text-xs w-full"><SelectValue placeholder="Filter by department" /></SelectTrigger>
                <SelectContent><SelectGroup>
                <SelectItem value="ALL">All Academic Departments</SelectItem>
                {departments.map((dept) => (
                  <SelectItem key={dept} value={dept}>{dept}</SelectItem>
                ))}
              </SelectGroup></SelectContent></Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Students Data Table */}
      <Card>
        <CardHeader className="p-4 pb-2 flex flex-col gap-2 sm:flex-row sm:items-center justify-between">
          <div>
            <CardTitle className="text-sm font-bold">Resident Records ({filteredStudents.length})</CardTitle>
            <CardDescription className="text-xs">
              Panyor Hall Official Resident Registry
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto"><Table className="min-w-[760px]">
            <TableHeader>
              <TableRow>
                <TableHead>Student</TableHead>
                <TableHead>Student ID / Roll</TableHead>
                <TableHead>Department & Year</TableHead>
                <TableHead>Room / Bed</TableHead>
                <TableHead>Approval Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                    Loading resident records from the database…
                  </TableCell>
                </TableRow>
              ) : loadError ? (
                <TableRow>
                  <TableCell colSpan={6} className="py-4">
                    <Alert variant="destructive"><AlertDescription>{loadError}{" "}<button onClick={() => loadStudents()} className="underline font-medium">Retry</button></AlertDescription></Alert>
                  </TableCell>
                </TableRow>
              ) : filteredStudents.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="py-4">
                    <Empty title="No student records found" description="No student records match the search filter." />
                  </TableCell>
                </TableRow>
              ) : (
                filteredStudents.map((student) => {
                  const isApproved = student.approvalStatus === "APPROVED"
                  const isPending = student.approvalStatus === "PENDING"
                  const isSuspended = student.approvalStatus === "SUSPENDED"

                  return (
                    <TableRow key={student.id}>
                      <TableCell>
                        <div className="flex items-center gap-2.5">
                          <Avatar className="size-8">
                            {student.avatarUrl && <AvatarImage src={student.avatarUrl} alt={student.name} />}
                            <AvatarFallback className="text-[10px] font-bold">
                              {student.name.substring(0, 2)}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex flex-col min-w-0">
                            <span className="font-semibold text-foreground truncate">{student.name}</span>
                            <span className="text-[10px] text-muted-foreground truncate">{student.email}</span>
                          </div>
                        </div>
                      </TableCell>

                      <TableCell className="font-mono text-xs">
                        <div className="flex flex-col">
                          <span className="font-bold text-foreground">{student.studentId}</span>
                          <span className="text-[10px] text-muted-foreground">{student.enrollmentNo}</span>
                        </div>
                      </TableCell>

                      <TableCell>
                        <div className="flex flex-col">
                          <span className="text-foreground truncate max-w-[180px]">{student.department}</span>
                          <span className="text-[10px] text-muted-foreground">
                            {student.program} • Year {student.year} (Sem {student.semester})
                          </span>
                        </div>
                      </TableCell>

                      <TableCell>
                        {student.roomNumber ? (
                          <div className="flex items-center gap-1.5">
                            <Badge variant="secondary" className="font-mono text-xs">
                              Room {student.roomNumber}
                            </Badge>
                            {student.bedNumber && (
                              <span className="text-[10px] text-muted-foreground font-mono">
                                Bed {student.bedNumber}
                              </span>
                            )}
                          </div>
                        ) : (
                          <Badge variant="outline" className="text-muted-foreground text-[10px]">
                            Unassigned
                          </Badge>
                        )}
                      </TableCell>

                      <TableCell>
                        <Badge
                          variant={
                            isApproved
                              ? "success"
                              : isPending
                              ? "warning"
                              : isSuspended
                              ? "destructive"
                              : "secondary"
                          }
                          size="sm"
                          className="font-mono text-[10px]"
                        >
                          {student.approvalStatus}
                        </Badge>
                        {student.rejectionReason && (
                          <p className="text-[9px] text-destructive truncate max-w-[120px] mt-0.5" title={student.rejectionReason}>
                            {student.rejectionReason}
                          </p>
                        )}
                      </TableCell>

                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="size-7"
                            onClick={() => {
                              setSelectedStudent(student)
                              setSheetOpen(true)
                            }}
                            title="View Full Profile"
                          >
                            <Eye className="size-3.5 text-muted-foreground" />
                          </Button>

                          {(can("students.approve") || can("students.reject")) && isPending && (
                            <>
                              {can("students.approve") && (
                              <Button
                                variant="outline"
                                size="sm"
                                className="h-7 px-2 text-[11px] gap-1 border-emerald-500/30 text-emerald-700 hover:bg-emerald-500/10 dark:text-emerald-400"
                                onClick={() => handleApprove(student)}
                              >
                                <Check className="size-3" />
                                Approve
                              </Button>
                              )}
                              {can("students.reject") && (
                              <Button
                                variant="outline"
                                size="sm"
                                className="h-7 px-2 text-[11px] gap-1 border-destructive/30 text-destructive hover:bg-destructive/10"
                                onClick={() => {
                                  setTargetStudent(student)
                                  setRejectModalOpen(true)
                                }}
                              >
                                <X className="size-3" />
                                Reject
                              </Button>
                              )}
                            </>
                          )}

                          {can("students.suspend") && isApproved && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 px-2 text-[10px] text-muted-foreground hover:text-destructive"
                              onClick={() => handleSuspend(student)}
                            >
                              Suspend
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  )
                })
              )}
            </TableBody>
          </Table></div>
        </CardContent>
      </Card>

      {/* Student Profile Drawer */}
      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent side="right" className="w-full sm:max-w-md overflow-y-auto">
          {selectedStudent && (
            <div className="space-y-6 pt-4">
              <SheetHeader>
                <div className="flex items-center gap-3">
                  <Avatar className="size-12">
                    {selectedStudent.avatarUrl && <AvatarImage src={selectedStudent.avatarUrl} />}
                    <AvatarFallback className="font-bold text-sm">
                      {selectedStudent.name.substring(0, 2)}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <SheetTitle>{selectedStudent.name}</SheetTitle>
                    <SheetDescription className="font-mono">
                      {selectedStudent.studentId} • {selectedStudent.enrollmentNo}
                    </SheetDescription>
                  </div>
                </div>
              </SheetHeader>

              <div className="space-y-4 text-xs">
                {/* Status Badge Block */}
                <div className="rounded-lg border border-border p-3 bg-muted/30 flex items-center justify-between">
                  <span className="font-semibold text-foreground">Hostel Verification</span>
                  <Badge
                    variant={
                      selectedStudent.approvalStatus === "APPROVED"
                        ? "success"
                        : selectedStudent.approvalStatus === "PENDING"
                        ? "warning"
                        : "destructive"
                    }
                  >
                    {selectedStudent.approvalStatus}
                  </Badge>
                </div>

                {/* Academic Details */}
                <div className="space-y-2 rounded-lg border border-border p-3">
                  <h4 className="font-bold text-foreground flex items-center gap-1.5">
                    <GraduationCap className="size-4 text-primary" /> Academic Information
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-muted-foreground">
                    <div>
                      <p className="text-[10px] uppercase font-semibold">Department</p>
                      <p className="font-medium text-foreground">{selectedStudent.department}</p>
                    </div>
                    <div>
                      <p className="text-[10px] uppercase font-semibold">Program</p>
                      <p className="font-medium text-foreground">{selectedStudent.program}</p>
                    </div>
                    <div>
                      <p className="text-[10px] uppercase font-semibold">Year / Semester</p>
                      <p className="font-medium text-foreground">Year {selectedStudent.year} (Sem {selectedStudent.semester})</p>
                    </div>
                    <div>
                      <p className="text-[10px] uppercase font-semibold">Blood Group</p>
                      <p className="font-medium text-foreground">{selectedStudent.bloodGroup || "O+"}</p>
                    </div>
                  </div>
                </div>

                {/* Room Details */}
                <div className="space-y-2 rounded-lg border border-border p-3">
                  <h4 className="font-bold text-foreground flex items-center gap-1.5">
                    <Building2 className="size-4 text-primary" /> Room & Double Occupancy
                  </h4>
                  {selectedStudent.roomNumber ? (
                    <div className="flex justify-between items-center">
                      <div>
                        <p className="font-semibold text-foreground">Room {selectedStudent.roomNumber}</p>
                        <p className="text-[11px] text-muted-foreground">Double Occupancy (Bed {selectedStudent.bedNumber || "1"})</p>
                      </div>
                      <Badge variant="secondary">Allotted</Badge>
                    </div>
                  ) : (
                    <p className="text-muted-foreground">No room allotted yet. Visit Room Allocation to assign bed.</p>
                  )}
                </div>

                {/* Contact & Emergency */}
                <div className="space-y-2 rounded-lg border border-border p-3">
                  <h4 className="font-bold text-foreground flex items-center gap-1.5">
                    <Phone className="size-4 text-primary" /> Contact & Emergency
                  </h4>
                  <div className="space-y-1.5 text-muted-foreground">
                    <div className="flex justify-between">
                      <span>Phone:</span>
                      <span className="font-medium text-foreground">{selectedStudent.phone}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Email:</span>
                      <span className="font-medium text-foreground">{selectedStudent.email}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Emergency Contact:</span>
                      <span className="font-medium text-foreground">
                        {selectedStudent.emergencyContactName || "Parent / Guardian"} ({selectedStudent.emergencyContactPhone || selectedStudent.phone})
                      </span>
                    </div>
                    {selectedStudent.address && (
                      <div className="pt-1 border-t border-border/50">
                        <p className="text-[10px] uppercase font-semibold">Home Address</p>
                        <p className="text-foreground">{selectedStudent.address}</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Approval Audit Trail */}
                {selectedStudent.approvedByName && (
                  <div className="rounded-lg bg-muted/40 p-3 text-[11px] text-muted-foreground">
                    <p className="font-semibold text-foreground">Approved By</p>
                    <p>{selectedStudent.approvedByName} on {new Date(selectedStudent.approvedAt || "").toLocaleString()}</p>
                  </div>
                )}

                {/* Additional Roles — one account, many hats (President / committees) */}
                {can("users.manage") && selectedStudent.userId && (
                  <div className="space-y-2 rounded-lg border border-border p-3">
                    <h4 className="font-bold text-foreground">Committee & Leadership Roles</h4>
                    <p className="text-[11px] text-muted-foreground">
                      Grant President, Mess Committee, or Sports Committee without creating a second account.
                    </p>
                    <RoleManager userId={selectedStudent.userId} primaryRole="STUDENT" />
                  </div>
                )}
              </div>
            </div>
          )}
        </SheetContent>
      </Sheet>

      {/* Rejection Reason Modal */}
      <Dialog open={rejectModalOpen} onOpenChange={setRejectModalOpen}>
        <DialogContent className="sm:max-w-md max-w-[calc(100vw-2rem)]">
          <DialogHeader>
            <DialogTitle>Reject Student Registration</DialogTitle>
            <DialogDescription>
              Please enter the official reason for rejecting {targetStudent?.name}&apos;s application.
            </DialogDescription>
          </DialogHeader>

          <FieldGroup className="space-y-3 py-2">
            <Field><FieldLabel>Rejection Reason<span className="text-destructive"> *</span></FieldLabel>
              <Textarea
                placeholder="e.g. Incomplete department clearance / duplicate application..."
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                className="text-xs min-h-[90px]"
              />
            </Field>
          </FieldGroup>

          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setRejectModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="destructive" size="sm" onClick={handleRejectConfirm}>
              Confirm Rejection
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Student Registration Modal */}
      <Dialog open={registerModalOpen} onOpenChange={setRegisterModalOpen}>
        <DialogContent className="sm:max-w-xl max-h-[90vh] overflow-y-auto max-w-[calc(100vw-2rem)]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <UserPlus className="size-5 text-primary" />
              Register New Hostel Resident
            </DialogTitle>
            <DialogDescription>
              Enter student credentials for Panyor Hall of Residence admission review.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleRegisterSubmit} className="space-y-4 py-2 text-xs">
            <FieldGroup className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Field><FieldLabel>Full Name<span className="text-destructive"> *</span></FieldLabel>
                <Input
                  required
                  placeholder="e.g. Tana Tara"
                  value={regForm.name}
                  onChange={(e) => setRegForm({ ...regForm, name: e.target.value })}
                />
              </Field>

              <Field><FieldLabel>University Email<span className="text-destructive"> *</span></FieldLabel>
                <Input
                  required
                  type="email"
                  placeholder="e.g. tana.tara@rgu.ac.in"
                  value={regForm.email}
                  onChange={(e) => setRegForm({ ...regForm, email: e.target.value })}
                />
              </Field>

              <Field><FieldLabel>Temporary Password</FieldLabel>
                <Input
                  type="text"
                  placeholder="Auto-generated if left blank"
                  value={regForm.password}
                  onChange={(e) => setRegForm({ ...regForm, password: e.target.value })}
                />
              </Field>

              <Field><FieldLabel>Student ID / Roll No<span className="text-destructive"> *</span></FieldLabel>
                <Input
                  required
                  placeholder="e.g. 24/CSE/055"
                  value={regForm.studentId}
                  onChange={(e) => setRegForm({ ...regForm, studentId: e.target.value })}
                />
              </Field>

              <Field><FieldLabel>Enrollment Number<span className="text-destructive"> *</span></FieldLabel>
                <Input
                  required
                  placeholder="e.g. RGU-2024-8841"
                  value={regForm.enrollmentNo}
                  onChange={(e) => setRegForm({ ...regForm, enrollmentNo: e.target.value })}
                />
              </Field>

              <Field><FieldLabel>Phone Number<span className="text-destructive"> *</span></FieldLabel>
                <Input
                  required
                  placeholder="e.g. +91 94360 00000"
                  value={regForm.phone}
                  onChange={(e) => setRegForm({ ...regForm, phone: e.target.value })}
                />
              </Field>

              <Field><FieldLabel>Blood Group</FieldLabel>
                <Select value={regForm.bloodGroup} onValueChange={(v) => setRegForm({ ...regForm, bloodGroup: v ?? "O+" })}>
                  <SelectTrigger className="h-9 text-xs w-full"><SelectValue placeholder="Select blood group" /></SelectTrigger>
                  <SelectContent><SelectGroup>
                  <SelectItem value="A+">A+</SelectItem>
                  <SelectItem value="A-">A-</SelectItem>
                  <SelectItem value="B+">B+</SelectItem>
                  <SelectItem value="B-">B-</SelectItem>
                  <SelectItem value="O+">O+</SelectItem>
                  <SelectItem value="O-">O-</SelectItem>
                  <SelectItem value="AB+">AB+</SelectItem>
                  <SelectItem value="AB-">AB-</SelectItem>
                </SelectGroup></SelectContent></Select>
              </Field>

              <Field><FieldLabel>Academic Department<span className="text-destructive"> *</span></FieldLabel>
                <Select value={regForm.department} onValueChange={(v) => {
                  const dept = v ?? "Computer Science & Engineering"
                  const validPrograms = programsFor(dept)
                  setRegForm({
                    ...regForm,
                    department: dept,
                    program: validPrograms.includes(regForm.program) ? regForm.program : (validPrograms[0] ?? regForm.program),
                  })
                }}>
                  <SelectTrigger className="h-9 text-xs w-full"><SelectValue placeholder="Select department" /></SelectTrigger>
                  <SelectContent><SelectGroup>
                  {RGU_DEPARTMENT_NAMES.map((d) => (
                    <SelectItem key={d} value={d}>{d}</SelectItem>
                  ))}
                </SelectGroup></SelectContent></Select>
              </Field>

              <Field><FieldLabel>Program / Degree<span className="text-destructive"> *</span></FieldLabel>
                <Select value={regForm.program} onValueChange={(v) => setRegForm({ ...regForm, program: v ?? "B.Tech" })}>
                  <SelectTrigger className="h-9 text-xs w-full"><SelectValue placeholder="Select program" /></SelectTrigger>
                  <SelectContent><SelectGroup>
                  {programsFor(regForm.department).map((p) => (
                    <SelectItem key={p} value={p}>{p}</SelectItem>
                  ))}
                </SelectGroup></SelectContent></Select>
              </Field>

              <Field><FieldLabel>Emergency Contact Name</FieldLabel>
                <Input
                  placeholder="e.g. Parent / Guardian Name"
                  value={regForm.emergencyContactName}
                  onChange={(e) => setRegForm({ ...regForm, emergencyContactName: e.target.value })}
                />
              </Field>

              <Field><FieldLabel>Emergency Contact Phone</FieldLabel>
                <Input
                  placeholder="e.g. +91 94361 22222"
                  value={regForm.emergencyContactPhone}
                  onChange={(e) => setRegForm({ ...regForm, emergencyContactPhone: e.target.value })}
                />
              </Field>
            </FieldGroup>

            <Field><FieldLabel>Permanent Home Address</FieldLabel>
              <Textarea
                placeholder="Village / Town, District, State, PIN"
                value={regForm.address}
                onChange={(e) => setRegForm({ ...regForm, address: e.target.value })}
                className="text-xs"
              />
            </Field>

            <DialogFooter className="pt-2">
              <Button variant="outline" size="sm" type="button" onClick={() => setRegisterModalOpen(false)}>
                Cancel
              </Button>
              <Button size="sm" type="submit">
                Submit Registration
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Export Roster Modal */}
      <ExportModal
        open={exportOpen}
        onOpenChange={setExportOpen}
        title="Student Resident Master Roster"
        filename="panyor_students_roster"
        data={filteredStudents}
        columns={[
          { header: "Student Name", key: "name", width: 25 },
          { header: "Roll / ID", key: "studentId", width: 15 },
          { header: "Enrollment No", key: "enrollmentNo", width: 18 },
          { header: "Department", key: "department", width: 30 },
          { header: "Program", key: "program", width: 12 },
          { header: "Room", key: "roomNumber", width: 10 },
          { header: "Bed", key: "bedNumber", width: 8 },
          { header: "Status", key: "approvalStatus", width: 12 },
          { header: "Phone", key: "phone", width: 16 },
          { header: "Email", key: "email", width: 25 },
        ]}
        summaryStats={[
          { label: "Total Residents", value: filteredStudents.length },
          { label: "Approved", value: filteredStudents.filter((s) => s.approvalStatus === "APPROVED").length },
          { label: "Pending", value: filteredStudents.filter((s) => s.approvalStatus === "PENDING").length },
        ]}
        appliedFiltersText={`Status: ${statusFilter}, Department: ${departmentFilter}`}
        currentRole={currentUser.role}
      />
    </div>
  )
}




