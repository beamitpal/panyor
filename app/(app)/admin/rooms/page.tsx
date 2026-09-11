"use client"

import * as React from "react"
import {
  Building2,
  Search,
  UserPlus,
  UserMinus,
  Plus,
  Download,
  Users,
  Bed,
} from "lucide-react"
import { useApi } from "@/hooks/use-api"
import { useRole } from "@/components/layout/role-context"
import type { RoomWithOccupants } from "@/types"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardDescription, CardFooter } from "@/components/ui/card"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog"
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field"
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
import { StudentSelector } from "@/components/shared/student-selector"
import { ExportModal } from "@/components/shared/export-modal"
import { toast } from "sonner"

export default function RoomsPage() {
  const { can, currentUser } = useRole()

  const { data, error: loadError, loading, reload } = useApi<{ rooms: RoomWithOccupants[] }>("/api/rooms")
  const rooms = React.useMemo(() => data?.rooms ?? [], [data])

  const [search, setSearch] = React.useState("")
  const [floorFilter, setFloorFilter] = React.useState<string>("ALL")
  const [statusFilter, setStatusFilter] = React.useState<string>("ALL")

  // Modals
  const [assignModalOpen, setAssignModalOpen] = React.useState(false)
  const [selectedRoom, setSelectedRoom] = React.useState<RoomWithOccupants | null>(null)
  const [selectedStudentId, setSelectedStudentId] = React.useState<string>("")
  const [selectedBed, setSelectedBed] = React.useState<number>(1)
  const [isAssigning, setIsAssigning] = React.useState(false)

  const [addRoomModalOpen, setAddRoomModalOpen] = React.useState(false)
  const [newRoomNumber, setNewRoomNumber] = React.useState("")
  const [newRoomFloor, setNewRoomFloor] = React.useState<number>(1)
  const [newRoomBlock, setNewRoomBlock] = React.useState("Block A")

  const [exportOpen, setExportOpen] = React.useState(false)

  const fetchRooms = reload

  const filteredRooms = React.useMemo(() => {
    let list = [...rooms]

    if (search.trim()) {
      const q = search.toLowerCase()
      list = list.filter(
        (r) =>
          r.roomNumber.toLowerCase().includes(q) ||
          r.block.toLowerCase().includes(q) ||
          r.students.some((s) => s.name.toLowerCase().includes(q) || s.studentId.toLowerCase().includes(q))
      )
    }

    if (floorFilter !== "ALL") {
      list = list.filter((r) => r.floor === Number(floorFilter))
    }

    if (statusFilter !== "ALL") {
      list = list.filter((r) => r.status === statusFilter)
    }

    return list
  }, [search, floorFilter, statusFilter, rooms])

  // Aggregate stats
  const totalBeds = rooms.length * 2
  const occupiedBeds = rooms.reduce((acc, r) => acc + r.occupancy, 0)
  const availableBeds = totalBeds - occupiedBeds

  const handleOpenAssign = (room: RoomWithOccupants, bedNum?: number) => {
    setSelectedRoom(room)
    // Find available bed
    const takenBeds = room.students.map((s) => s.bedNumber)
    const targetBed = bedNum || (takenBeds.includes(1) ? 2 : 1)
    setSelectedBed(targetBed)
    setSelectedStudentId("")
    setAssignModalOpen(true)
  }

  const handleAssignSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedRoom || !selectedStudentId) {
      toast.error("Please select an approved student.")
      return
    }
    setIsAssigning(true)
    try {
      const res = await fetch(`/api/rooms/${selectedRoom.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "assign",
          studentProfileId: selectedStudentId,
          bedNumber: selectedBed,
        }),
      })
      const data = await res.json().catch(() => ({}))
      if (res.ok) {
        toast.success(`Bed ${selectedBed} in Room ${selectedRoom.roomNumber} assigned successfully.`)
        setAssignModalOpen(false)
        setSelectedRoom(null)
        setSelectedStudentId("")
        setIsAssigning(false)
        fetchRooms()
      } else {
        toast.error(data.error || "Failed to assign student.")
      }
    } catch (err) {
      toast.error("Error during assignment. Please try again.")
    } finally {
      setIsAssigning(false)
    }
  }

  const handleVacate = async (studentId: string, studentName: string, roomNum: string) => {
    if (!confirm(`Are you sure you want to vacate ${studentName} from Room ${roomNum}?`)) return

    const room = rooms.find((r) => r.students.some((s) => s.id === studentId))
    if (!room) {
      toast.error("Room not found for this student.")
      return
    }

    const res = await fetch(`/api/rooms/${room.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "vacate", studentProfileId: studentId }),
    })
    const data = await res.json().catch(() => ({}))

    if (res.ok) {
      toast.success(`${studentName} vacated from Room ${roomNum}.`)
      fetchRooms()
    } else {
      toast.error(data.error || "Failed to vacate student.")
    }
  }

  const handleCreateRoomSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newRoomNumber.trim()) {
      toast.error("Please enter a room number.")
      return
    }

    const res = await fetch("/api/rooms", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        roomNumber: newRoomNumber.trim(),
        floor: newRoomFloor,
        block: newRoomBlock,
      }),
    })
    const data = await res.json().catch(() => ({}))

    if (res.ok) {
      toast.success(`Room ${newRoomNumber} created successfully.`)
      setAddRoomModalOpen(false)
      setNewRoomNumber("")
      fetchRooms()
    } else {
      toast.error(data.error || "Failed to create room.")
    }
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">
            Room Occupancy & Bed Allocation
          </h1>
          <p className="text-xs text-muted-foreground">
            Strict Double Occupancy Enforcement (Max 2 students per room) • Panyor Hall of Residence
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
              Export Room Roster
            </Button>
          )}

          {can("rooms.create") && (
            <Button
              size="sm"
              onClick={() => setAddRoomModalOpen(true)}
              className="h-9 gap-1.5 text-xs"
            >
              <Plus className="size-3.5" />
              Add Room
            </Button>
          )}
        </div>
      </div>

      {/* KPI Overview */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground font-medium">Total Rooms</p>
              <h3 className="text-2xl font-bold text-foreground mt-0.5">{rooms.length} Rooms</h3>
              <p className="text-[11px] text-muted-foreground mt-1">
                {totalBeds} total bed spaces configured
              </p>
            </div>
            <div className="flex size-10 items-center justify-center rounded-xl bg-muted text-muted-foreground">
              <Building2 className="size-5" />
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground font-medium">Occupied Beds</p>
              <h3 className="text-2xl font-bold text-foreground mt-0.5">{occupiedBeds} Beds</h3>
              <p className="text-[11px] text-emerald-600 dark:text-emerald-400 font-medium mt-1">
                {Math.round((occupiedBeds / totalBeds) * 100)}% utilization
              </p>
            </div>
            <div className="flex size-10 items-center justify-center rounded-xl bg-muted text-muted-foreground">
              <Users className="size-5" />
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground font-medium">Available Beds</p>
              <h3 className="text-2xl font-bold text-foreground mt-0.5">{availableBeds} Vacant Slots</h3>
              <p className="text-[11px] text-amber-600 dark:text-amber-400 font-medium mt-1">
                Ready for resident allocation
              </p>
            </div>
            <div className="flex size-10 items-center justify-center rounded-xl bg-muted text-muted-foreground">
              <Bed className="size-5" />
            </div>
          </div>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
            <div className="sm:col-span-6 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
              <Input
                placeholder="Search by room number (e.g. 101), block, or occupant name..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9 h-9 text-xs"
              />
            </div>

            <div className="sm:col-span-3">
              <Select value={floorFilter} onValueChange={(v) => setFloorFilter(v ?? 'ALL')}>
                <SelectTrigger className="h-9 text-xs w-full">
                  <SelectValue placeholder="All Floors" />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    <SelectItem value="ALL">All Floors</SelectItem>
                    <SelectItem value="0">Ground Floor (Floor 0)</SelectItem>
                    <SelectItem value="1">1st Floor</SelectItem>
                    <SelectItem value="2">2nd Floor</SelectItem>
                  </SelectGroup>
                </SelectContent>
              </Select>
            </div>

            <div className="sm:col-span-3">
              <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v ?? 'ALL')}>
                <SelectTrigger className="h-9 text-xs w-full">
                  <SelectValue placeholder="All Occupancies" />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    <SelectItem value="ALL">All Occupancies</SelectItem>
                    <SelectItem value="VACANT">Vacant (0/2)</SelectItem>
                    <SelectItem value="AVAILABLE">Available (1/2)</SelectItem>
                    <SelectItem value="FULL">Full (2/2)</SelectItem>
                  </SelectGroup>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Double Occupancy Room Grid */}
      {loading ? (
        <Card>
          <CardContent className="p-4 space-y-3">
            <Skeleton className="h-16 w-full" />
            <Skeleton className="h-16 w-full" />
            <Skeleton className="h-16 w-full" />
          </CardContent>
        </Card>
      ) : loadError ? (
        <Card>
          <CardContent className="p-8 space-y-3">
            <Alert variant="destructive">
              <AlertDescription>{loadError}</AlertDescription>
            </Alert>
            <Button variant="outline" size="sm" onClick={fetchRooms}>
              Retry
            </Button>
          </CardContent>
        </Card>
      ) : filteredRooms.length === 0 ? (
        <Card>
          <CardContent className="p-8">
            <Empty
              title="No rooms found"
              description="Adjust your search or filters, or add a new room."
            />
          </CardContent>
        </Card>
      ) : (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredRooms.map((room) => {
          const bed1 = room.students.find((s) => s.bedNumber === 1) || room.students[0]
          const bed2 = room.students.find((s) => s.bedNumber === 2 && s.id !== bed1?.id) || (room.students.length > 1 ? room.students[1] : null)
          const isFull = room.occupancy >= 2

          return (
            <Card key={room.id} className="flex flex-col justify-between border-border/80">
              <CardHeader className="p-4 pb-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-base text-foreground font-mono">
                      Room {room.roomNumber}
                    </span>
                    <Badge variant="outline" size="sm" className="font-mono text-[10px]">
                      {room.block}
                    </Badge>
                  </div>

                  <Badge
                    variant={
                      room.status === "FULL"
                        ? "destructive"
                        : room.status === "AVAILABLE"
                        ? "warning"
                        : "success"
                    }
                    size="sm"
                    className="font-mono text-[10px]"
                  >
                    {room.occupancy}/2 Occupied
                  </Badge>
                </div>
                <CardDescription className="text-[11px]">
                  Floor {room.floor} • Double Occupancy
                </CardDescription>
              </CardHeader>

              <CardContent className="p-4 pt-2 space-y-2.5 text-xs flex-1">
                {/* Bed 1 Slot */}
                <div
                  className={`flex items-center justify-between p-2.5 rounded-lg border ${
                    bed1 ? "border-border bg-card" : "border-dashed border-border bg-muted/20"
                  }`}
                >
                  {bed1 ? (
                    <div className="flex items-center gap-2.5 min-w-0 flex-1">
                      <Avatar className="size-7 shrink-0">
                        {bed1.avatarUrl && <AvatarImage src={bed1.avatarUrl} />}
                        <AvatarFallback className="text-[9px] font-bold">
                          {bed1.name.substring(0, 2)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex flex-col min-w-0 pr-1">
                        <div className="flex items-center gap-1.5">
                          <span className="font-semibold text-foreground truncate">{bed1.name}</span>
                          <Badge variant="secondary" size="sm" className="text-[8px] py-0 px-1 font-mono">
                            Bed 1
                          </Badge>
                        </div>
                        <span className="text-[10px] text-muted-foreground font-mono truncate">
                          {bed1.studentId} • {bed1.department}
                        </span>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center justify-between w-full">
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Bed className="size-4" />
                        <span className="text-[11px] font-medium">Bed 1 Vacant</span>
                      </div>
                      {can("rooms.assign") && (
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-6 text-[10px] px-2"
                          onClick={() => handleOpenAssign(room, 1)}
                        >
                          Allot Bed 1
                        </Button>
                      )}
                    </div>
                  )}

                  {bed1 && can("rooms.assign") && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="size-6 text-muted-foreground hover:text-destructive shrink-0"
                      onClick={() => handleVacate(bed1.id, bed1.name, room.roomNumber)}
                      title="Vacate Bed 1"
                    >
                      <UserMinus className="size-3" />
                    </Button>
                  )}
                </div>

                {/* Bed 2 Slot */}
                <div
                  className={`flex items-center justify-between p-2.5 rounded-lg border ${
                    bed2 ? "border-border bg-card" : "border-dashed border-border bg-muted/20"
                  }`}
                >
                  {bed2 ? (
                    <div className="flex items-center gap-2.5 min-w-0 flex-1">
                      <Avatar className="size-7 shrink-0">
                        {bed2.avatarUrl && <AvatarImage src={bed2.avatarUrl} />}
                        <AvatarFallback className="text-[9px] font-bold">
                          {bed2.name.substring(0, 2)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex flex-col min-w-0 pr-1">
                        <div className="flex items-center gap-1.5">
                          <span className="font-semibold text-foreground truncate">{bed2.name}</span>
                          <Badge variant="secondary" size="sm" className="text-[8px] py-0 px-1 font-mono">
                            Bed 2
                          </Badge>
                        </div>
                        <span className="text-[10px] text-muted-foreground font-mono truncate">
                          {bed2.studentId} • {bed2.department}
                        </span>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center justify-between w-full">
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Bed className="size-4" />
                        <span className="text-[11px] font-medium">Bed 2 Vacant</span>
                      </div>
                      {can("rooms.assign") && (
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-6 text-[10px] px-2"
                          onClick={() => handleOpenAssign(room, 2)}
                        >
                          Allot Bed 2
                        </Button>
                      )}
                    </div>
                  )}

                  {bed2 && can("rooms.assign") && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="size-6 text-muted-foreground hover:text-destructive shrink-0"
                      onClick={() => handleVacate(bed2.id, bed2.name, room.roomNumber)}
                      title="Vacate Bed 2"
                    >
                      <UserMinus className="size-3" />
                    </Button>
                  )}
                </div>
              </CardContent>

              <CardFooter className="p-4 pt-0">
                {!isFull && can("rooms.assign") && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full text-xs h-7 gap-1"
                    onClick={() => handleOpenAssign(room)}
                  >
                    <UserPlus className="size-3" />
                    Assign Resident ({2 - room.occupancy} slot open)
                  </Button>
                )}
                {isFull && (
                  <div className="w-full text-center text-[10px] font-medium text-muted-foreground py-1 bg-muted/30 rounded-md">
                    Room Capacity Full (2/2)
                  </div>
                )}
              </CardFooter>
            </Card>
          )
        })}
      </div>
      )}

      {/* Bed Assignment Modal */}
      <Dialog open={assignModalOpen} onOpenChange={setAssignModalOpen}>
        <DialogContent className="sm:max-w-md max-w-[calc(100vw-2rem)]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Bed className="size-5 text-primary" />
              Allot Bed in Room {selectedRoom?.roomNumber}
            </DialogTitle>
            <DialogDescription>
              Strict Double Occupancy: Select an approved resident to assign to Bed {selectedBed}.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleAssignSubmit} className="py-2 text-xs">
            <FieldGroup className="space-y-4">
            <div className="rounded-lg border border-border bg-muted/30 p-3 space-y-1">
              <div className="flex justify-between">
                <span className="font-semibold text-foreground">Room:</span>
                <span className="font-mono">Room {selectedRoom?.roomNumber} ({selectedRoom?.block})</span>
              </div>
              <div className="flex justify-between">
                <span className="font-semibold text-foreground">Floor:</span>
                <span>Floor {selectedRoom?.floor}</span>
              </div>
              <div className="flex justify-between">
                <span className="font-semibold text-foreground">Current Occupancy:</span>
                <span className="font-mono font-bold">{selectedRoom?.occupancy}/2</span>
              </div>
            </div>

            <Field>
              <FieldLabel>Target Bed Number<span className="text-destructive"> *</span></FieldLabel>
              <Select
                value={String(selectedBed)}
                onValueChange={(v) => setSelectedBed(Number(v))}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select bed" />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    <SelectItem value="1">Bed 1</SelectItem>
                    <SelectItem value="2">Bed 2</SelectItem>
                  </SelectGroup>
                </SelectContent>
              </Select>
            </Field>

            <Field>
              <FieldLabel>Select Approved Student<span className="text-destructive"> *</span></FieldLabel>
              <StudentSelector
                value={selectedStudentId}
                onChange={(s) => setSelectedStudentId(s.id)}
                filterApprovedOnly
                placeholder="Search approved student without room..."
              />
            </Field>

<DialogFooter className="pt-2">
              <Button variant="outline" size="sm" type="button" onClick={() => setAssignModalOpen(false)}>
                Cancel
              </Button>
<Button size="sm" type="submit" disabled={!selectedStudentId || isAssigning}>
                  Confirm Allocation
                </Button>
            </DialogFooter>
            </FieldGroup>
          </form>
        </DialogContent>
      </Dialog>

      {/* Add Room Modal */}
      <Dialog open={addRoomModalOpen} onOpenChange={setAddRoomModalOpen}>
        <DialogContent className="sm:max-w-md max-w-[calc(100vw-2rem)]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Building2 className="size-5 text-primary" />
              Create Hostel Room
            </DialogTitle>
            <DialogDescription>
              Add a new double occupancy room to Panyor Hall of Residence.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleCreateRoomSubmit} className="py-2 text-xs">
            <FieldGroup className="space-y-4">
            <Field>
              <FieldLabel>Room Number<span className="text-destructive"> *</span></FieldLabel>
              <Input
                required
                placeholder="e.g. 106, 204"
                value={newRoomNumber}
                onChange={(e) => setNewRoomNumber(e.target.value)}
              />
            </Field>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Field>
                <FieldLabel>Floor Level<span className="text-destructive"> *</span></FieldLabel>
                <Select
                  value={String(newRoomFloor)}
                  onValueChange={(v) => setNewRoomFloor(Number(v))}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select floor" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      <SelectItem value="0">Ground Floor (0)</SelectItem>
                      <SelectItem value="1">1st Floor (1)</SelectItem>
                      <SelectItem value="2">2nd Floor (2)</SelectItem>
                      <SelectItem value="3">3rd Floor (3)</SelectItem>
                    </SelectGroup>
                  </SelectContent>
                </Select>
              </Field>

              <Field>
                <FieldLabel>Hostel Block<span className="text-destructive"> *</span></FieldLabel>
                <Select value={newRoomBlock} onValueChange={(v) => setNewRoomBlock(v ?? 'Block A')}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select block" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      <SelectItem value="Block A">Block A</SelectItem>
                      <SelectItem value="Block B">Block B</SelectItem>
                      <SelectItem value="Block C">Block C</SelectItem>
                    </SelectGroup>
                  </SelectContent>
                </Select>
              </Field>
            </div>

            <div className="rounded-lg bg-muted/40 p-3 text-[11px] text-muted-foreground space-y-1">
              <p className="font-semibold text-foreground">Occupancy Standard</p>
              <p>All rooms in Panyor Hall are strictly configured for Double Occupancy (Max 2 beds).</p>
            </div>

            <DialogFooter>
              <Button variant="outline" size="sm" type="button" onClick={() => setAddRoomModalOpen(false)}>
                Cancel
              </Button>
              <Button size="sm" type="submit">
                Create Room
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
        title="Hostel Room Occupancy & Bed Allocation Report"
        filename="panyor_room_occupancy"
        data={filteredRooms.map((r) => ({
          roomNumber: r.roomNumber,
          block: r.block,
          floor: r.floor,
          occupancy: `${r.occupancy}/2`,
          status: r.status,
          bed1Student: r.students.find((s) => s.bedNumber === 1)?.name || "-",
          bed1Roll: r.students.find((s) => s.bedNumber === 1)?.studentId || "-",
          bed2Student: r.students.find((s) => s.bedNumber === 2)?.name || "-",
          bed2Roll: r.students.find((s) => s.bedNumber === 2)?.studentId || "-",
        }))}
        columns={[
          { header: "Room", key: "roomNumber", width: 10 },
          { header: "Block", key: "block", width: 12 },
          { header: "Floor", key: "floor", width: 8 },
          { header: "Occupancy", key: "occupancy", width: 12 },
          { header: "Status", key: "status", width: 12 },
          { header: "Bed 1 Occupant", key: "bed1Student", width: 22 },
          { header: "Bed 1 Roll", key: "bed1Roll", width: 14 },
          { header: "Bed 2 Occupant", key: "bed2Student", width: 22 },
          { header: "Bed 2 Roll", key: "bed2Roll", width: 14 },
        ]}
        summaryStats={[
          { label: "Total Rooms", value: rooms.length },
          { label: "Total Beds", value: totalBeds },
          { label: "Occupied Beds", value: occupiedBeds },
          { label: "Available Beds", value: availableBeds },
        ]}
        appliedFiltersText={`Floor: ${floorFilter}, Status: ${statusFilter}`}
        currentRole={currentUser.role}
      />
    </div>
  )
}




