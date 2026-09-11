"use client"

import * as React from "react"
import { Search, Check, Loader2, AlertTriangle, RefreshCw, ChevronDown, ChevronUp } from "lucide-react"
import type { StudentProfileWithDetails } from "@/types"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { cn } from "@/lib/utils"
import { InputGroup, InputGroupAddon } from "@/components/ui/input-group"
import { Empty } from "@/components/ui/empty"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { ScrollArea } from "@/components/ui/scroll-area"

export interface StudentSelectorProps {
  value?: string
  onChange: (student: StudentProfileWithDetails) => void
  placeholder?: string
  filterApprovedOnly?: boolean
  className?: string
  disabled?: boolean
}

export function StudentSelector({
  value,
  onChange,
  placeholder = "Search student by name, ID, room, or email...",
  filterApprovedOnly = false,
  className,
  disabled,
}: StudentSelectorProps) {
  const [open, setOpen] = React.useState(false)
  const [search, setSearch] = React.useState("")
  const [allStudents, setAllStudents] = React.useState<StudentProfileWithDetails[]>([])
  const [loading, setLoading] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)
  const triggerRef = React.useRef<HTMLButtonElement>(null)
  const contentRef = React.useRef<HTMLDivElement>(null)

  const fetchStudents = React.useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const response = await fetch("/api/students", { cache: "no-store" })
      if (!response.ok) {
        const errData = await response.json().catch(() => ({}))
        throw new Error(errData.error || `Failed to load students: ${response.status}`)
      }
      const result = await response.json()
      setAllStudents((result.students ?? []) as StudentProfileWithDetails[])
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load students")
    } finally {
      setLoading(false)
    }
  }, [])

  const students = React.useMemo(() => {
    let list = [...allStudents]
    if (filterApprovedOnly) {
      // Assignment must only be possible for students whose application has
      // actually been approved. Be strict here so PENDING/SUSPENDED records
      // can never appear in the room-allocation selector.
      list = list.filter((s) => String(s.approvalStatus).toUpperCase() === "APPROVED")
    }
    if (!search.trim()) return list

    const q = search.toLowerCase()
    return list.filter(
      (s) =>
        s.name.toLowerCase().includes(q) ||
        s.studentId.toLowerCase().includes(q) ||
        s.enrollmentNo.toLowerCase().includes(q) ||
        s.email.toLowerCase().includes(q) ||
        (s.roomNumber && s.roomNumber.toLowerCase().includes(q)) ||
        s.department.toLowerCase().includes(q)
    )
  }, [search, filterApprovedOnly, allStudents])

  const selectedStudent = allStudents.find((s) => s.id === value)

  const handleClickOutside = (event: MouseEvent) => {
    if (triggerRef.current && triggerRef.current.contains(event.target as Node)) return
    if (contentRef.current && contentRef.current.contains(event.target as Node)) return
    setOpen(false)
  }

  // Load the authoritative student list whenever the selector is opened.
  // The previous implementation defined fetchStudents but never called it,
  // leaving the assignment dropdown empty/stale.
  React.useEffect(() => {
    if (!open) return

    void fetchStudents()
    document.addEventListener("mousedown", handleClickOutside)

    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [open, fetchStudents])

  // Keep the selector useful after an assignment/approval changes elsewhere.
  // A manual refresh is still available when the API returns an error.

  return (
    <div className={cn("relative w-full", className)}>
      <Button
        ref={triggerRef}
        variant="outline"
        role="combobox"
        aria-expanded={open}
        aria-haspopup="listbox"
        disabled={disabled}
        className={cn("w-full justify-between text-xs h-10 px-3 font-normal", className)}
        onClick={() => !disabled && setOpen((o) => !o)}
      >
        {selectedStudent ? (
          <div className="flex items-center gap-2 truncate">
            <Avatar className="size-6 shrink-0">
              {selectedStudent.avatarUrl && <AvatarImage src={selectedStudent.avatarUrl} />}
              <AvatarFallback className="text-[9px]">{selectedStudent.name.substring(0, 2)}</AvatarFallback>
            </Avatar>
            <div className="flex items-center gap-1.5 truncate">
              <span className="font-medium text-foreground">{selectedStudent.name}</span>
              <span className="font-mono text-muted-foreground text-[11px]">({selectedStudent.studentId})</span>
              {selectedStudent.roomNumber && (
                <Badge variant="secondary" size="sm" className="text-[10px] py-0 px-1">
                  Room {selectedStudent.roomNumber}
                </Badge>
              )}
            </div>
          </div>
        ) : (
          <span className="text-muted-foreground">{placeholder}</span>
        )}
        {open ? <ChevronUp className="ml-2 size-3.5 shrink-0 opacity-50" /> : <ChevronDown className="ml-2 size-3.5 shrink-0 opacity-50" />}
      </Button>

      {open && (
        <div
          ref={contentRef}
          className="absolute z-[100] w-full mt-1.5 max-h-[320px] bg-popover text-popover-foreground shadow-xl border rounded-xl shadow-lg"
          style={{ minWidth: "360px", maxWidth: "calc(100vw - 2rem)" }}
        >
          <InputGroup className="border-0 border-b border-border rounded-none shadow-none focus-within:ring-0 focus-within:border-border px-2.5 pb-2 mb-1.5">
            <InputGroupAddon align="left">
              <Search className="size-3.5 shrink-0 opacity-50" />
            </InputGroupAddon>
            <input
              type="text"
              className="w-full bg-transparent text-xs outline-none placeholder:text-muted-foreground"
              placeholder="Type name, ID (e.g. 042), room (101)..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              autoFocus
            />
          </InputGroup>

          {error && (
            <Alert variant="destructive" className="mb-2 text-xs mx-2">
              <AlertDescription className="flex items-center gap-2">
                <AlertTriangle className="size-3 shrink-0" />
                <span>{error}</span>
                <Button variant="ghost" size="icon" className="ml-auto h-6 w-6" onClick={fetchStudents}>
                  <RefreshCw className="size-3" />
                </Button>
              </AlertDescription>
            </Alert>
          )}

          <div className="max-h-[260px] overflow-hidden">
            {loading ? (
              <div className="flex items-center justify-center py-4">
                <Loader2 className="size-5 animate-spin text-muted-foreground" />
              </div>
            ) : students.length === 0 ? (
              <Empty
                title={allStudents.length === 0 ? "No students found" : "No matching students"}
                description={
                  allStudents.length === 0
                    ? "No approved students in the system. Please approve students first."
                    : "Try a different name, ID, or room number."
                }
              />
            ) : (
              <ScrollArea className="h-[260px]">
                <div className="space-y-1 pr-1">
                  {students.map((student) => {
                    const isSelected = student.id === value
                    return (
                      <div
                        key={student.id}
                        onClick={() => {
                          onChange(student)
                          setOpen(false)
                        }}
                        className={cn(
                          "flex cursor-pointer select-none items-center justify-between rounded-lg p-2 text-xs transition-colors hover:bg-accent hover:text-accent-foreground",
                          isSelected && "bg-accent/70 font-medium"
                        )}
                      >
                        <div className="flex items-center gap-2.5 min-w-0 pr-2">
                          <Avatar className="size-7 shrink-0">
                            {student.avatarUrl && <AvatarImage src={student.avatarUrl} />}
                            <AvatarFallback className="text-[10px]">{student.name.substring(0, 2)}</AvatarFallback>
                          </Avatar>
                          <div className="flex flex-col min-w-0">
                            <div className="flex items-center gap-1.5 truncate">
                              <span className="font-semibold text-foreground truncate">{student.name}</span>
                              {student.roomNumber ? (
                                <Badge variant="outline" size="sm" className="text-[9px] py-0 px-1 font-mono">
                                  Rm {student.roomNumber}
                                </Badge>
                              ) : (
                                <Badge variant="secondary" size="sm" className="text-[9px] py-0 px-1 text-muted-foreground">
                                  No Room
                                </Badge>
                              )}
                            </div>
                            <div className="flex items-center gap-2 text-[10px] text-muted-foreground font-mono truncate">
                              <span>{student.studentId}</span>
                              <span>•</span>
                              <span className="truncate">{student.department}</span>
                            </div>
                          </div>
                        </div>
                        {isSelected && <Check className="size-4 shrink-0 text-primary" />}
                      </div>
                    )
                  })}
                </div>
              </ScrollArea>
            )}
          </div>
        </div>
      )}
    </div>
  )
}