"use client"

import * as React from "react"
import { Search, Check } from "lucide-react"
import type { StudentProfileWithDetails } from "@/types"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { cn } from "@/lib/utils"
import { InputGroup, InputGroupAddon } from "@/components/ui/input-group"
import { Empty } from "@/components/ui/empty"

export interface StudentSelectorProps {
  value?: string // studentProfileId
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

  // Live directory from PostgreSQL — the old in-memory mock store is gone.
  const fetchStudents = React.useCallback(async () => {
    try {
      const response = await fetch("/api/students", { cache: "no-store" })
      const result = await response.json()
      if (response.ok) setAllStudents((result.students ?? []) as StudentProfileWithDetails[])
    } catch {
      // Keep previous results on transient failures.
    }
  }, [])

  const students = React.useMemo(() => {
    let list = [...allStudents]
    if (filterApprovedOnly) {
      list = list.filter((s) => s.approvalStatus === "APPROVED")
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

  return (
    <Popover open={open} onOpenChange={(o) => { setOpen(o); if (o) void fetchStudents() }}>
      <PopoverTrigger
        render={
          <Button
            variant="outline"
            role="combobox"
            disabled={disabled}
            className={cn("w-full justify-between text-xs h-10 px-3 font-normal", className)}
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
            <Search className="ml-2 size-3.5 shrink-0 opacity-50" />
          </Button>
        }
      />
      <PopoverContent className="w-[360px] max-w-[calc(100vw-2rem)] p-2 bg-popover text-popover-foreground shadow-xl border rounded-xl" align="start">
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

        <div className="max-h-[260px] overflow-y-auto space-y-1 pr-1">
          {students.length === 0 ? (
            <Empty title="No matching students" description="Try a different name, ID, or room number." />
          ) : (
            students.map((student) => {
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
            })
          )}
        </div>
      </PopoverContent>
    </Popover>
  )
}
