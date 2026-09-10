import { NextResponse } from "next/server"
import { getDb } from "@/db/server"
import { rooms, roomAssignments, studentProfiles } from "@/db/schema"
import { requirePermission, AuthError } from "@/lib/auth/server"
import { and, eq } from "drizzle-orm"
import { randomUUID } from "crypto"

function authStatus(error: unknown): number {
  if (error instanceof AuthError) return error.status
  const message = error instanceof Error ? error.message : ""
  if (message.includes("Permission")) return 403
  if (message.includes("Authentication")) return 401
  return 500
}

function statusFor(occupancy: number): "VACANT" | "AVAILABLE" | "FULL" {
  if (occupancy >= 2) return "FULL"
  if (occupancy === 1) return "AVAILABLE"
  return "VACANT"
}

/**
 * PATCH /api/rooms/[id] — requires rooms.assign.
 *
 * Assign: { action: "assign", studentProfileId: string, bedNumber?: 1 | 2 }
 *   Enforces max 2 occupants per room and bed-number conflicts. If the
 *   student already occupies another room, they are moved (old room status
 *   recomputed). Room status recomputed on every mutation.
 *
 * Vacate: { action: "vacate", studentProfileId: string }
 *   Clears the student's roomId/bedNumber and recomputes room status.
 */
export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const identity = await requirePermission("rooms.assign")
    const { id: roomId } = await params
    const body = await req.json().catch(() => ({}))
    const action = String(body.action ?? (body.studentProfileId && body.bedNumber !== undefined ? "assign" : body.studentProfileId ? "vacate" : ""))

    const db = getDb()
    const roomRows = await db.select().from(rooms).where(eq(rooms.id, roomId)).limit(1)
    const room = roomRows[0]
    if (!room) {
      return NextResponse.json({ error: "Room not found." }, { status: 404 })
    }

    if (action === "assign") {
      const studentProfileId = String(body.studentProfileId ?? "")
      let bedNumber = body.bedNumber !== undefined ? Number(body.bedNumber) : undefined
      if (!studentProfileId) {
        return NextResponse.json({ error: "studentProfileId is required." }, { status: 400 })
      }

      const studentRows = await db
        .select()
        .from(studentProfiles)
        .where(eq(studentProfiles.id, studentProfileId))
        .limit(1)
      const student = studentRows[0]
      if (!student) {
        return NextResponse.json({ error: "Student not found." }, { status: 404 })
      }
      if (student.approvalStatus !== "APPROVED") {
        return NextResponse.json(
          { error: "Only approved students can be assigned to a room." },
          { status: 400 }
        )
      }

      const occupants = await db
        .select()
        .from(studentProfiles)
        .where(eq(studentProfiles.roomId, roomId))

      // Student already in this room → just update bed (still check conflict)
      const others = occupants.filter((o) => o.id !== studentProfileId)
      if (others.length >= 2) {
        return NextResponse.json(
          { error: "Room is already at maximum capacity (Double Occupancy: 2/2)." },
          { status: 409 }
        )
      }

      const takenBeds = others.map((o) => o.bedNumber)
      if (bedNumber !== 1 && bedNumber !== 2) {
        bedNumber = takenBeds.includes(1) ? 2 : 1
      }
      if (takenBeds.includes(bedNumber)) {
        return NextResponse.json(
          { error: `Bed ${bedNumber} is already occupied in Room ${room.roomNumber}.` },
          { status: 409 }
        )
      }

      const prevRoomId = student.roomId
      await db
        .update(studentProfiles)
        .set({ roomId, bedNumber, updatedAt: new Date() })
        .where(eq(studentProfiles.id, studentProfileId))

      // Close any prior ACTIVE assignment for this student, open a new one
      const priorActive = await db
        .select()
        .from(roomAssignments)
        .where(
          and(
            eq(roomAssignments.studentProfileId, studentProfileId),
            eq(roomAssignments.status, "ACTIVE")
          )
        )
      for (const a of priorActive) {
        await db
          .update(roomAssignments)
          .set({ status: prevRoomId === roomId ? "TRANSFERRED" : "VACATED", assignedTo: new Date() })
          .where(eq(roomAssignments.id, a.id))
      }
      await db.insert(roomAssignments).values({
        id: randomUUID(),
        roomId,
        studentProfileId,
        bedNumber,
        assignedFrom: new Date(),
        status: "ACTIVE",
        assignedBy: identity.id,
      })

      // Recompute statuses for current + previous room
      const recount = async (rId: string) => {
        const occ = await db.select().from(studentProfiles).where(eq(studentProfiles.roomId, rId))
        await db
          .update(rooms)
          .set({ status: statusFor(occ.length), updatedAt: new Date() })
          .where(eq(rooms.id, rId))
        return occ.length
      }
      const occupancy = await recount(roomId)
      if (prevRoomId && prevRoomId !== roomId) await recount(prevRoomId)

      return NextResponse.json({
        success: true,
        roomId,
        occupancy,
        status: statusFor(occupancy),
        bedNumber,
      })
    }

    if (action === "vacate") {
      const studentProfileId = String(body.studentProfileId ?? "")
      if (!studentProfileId) {
        return NextResponse.json({ error: "studentProfileId is required." }, { status: 400 })
      }
      const studentRows = await db
        .select()
        .from(studentProfiles)
        .where(eq(studentProfiles.id, studentProfileId))
        .limit(1)
      const student = studentRows[0]
      if (!student || !student.roomId) {
        return NextResponse.json(
          { error: "Student does not have an active room assignment." },
          { status: 400 }
        )
      }
      const vacatedRoomId = student.roomId

      await db
        .update(studentProfiles)
        .set({ roomId: null, bedNumber: null, updatedAt: new Date() })
        .where(eq(studentProfiles.id, studentProfileId))

      const active = await db
        .select()
        .from(roomAssignments)
        .where(
          and(
            eq(roomAssignments.studentProfileId, studentProfileId),
            eq(roomAssignments.status, "ACTIVE")
          )
        )
      for (const a of active) {
        await db
          .update(roomAssignments)
          .set({ status: "VACATED", assignedTo: new Date() })
          .where(eq(roomAssignments.id, a.id))
      }

      const occ = await db
        .select()
        .from(studentProfiles)
        .where(eq(studentProfiles.roomId, vacatedRoomId))
      await db
        .update(rooms)
        .set({ status: statusFor(occ.length), updatedAt: new Date() })
        .where(eq(rooms.id, vacatedRoomId))

      return NextResponse.json({
        success: true,
        roomId: vacatedRoomId,
        occupancy: occ.length,
        status: statusFor(occ.length),
      })
    }

    return NextResponse.json(
      { error: 'action must be "assign" or "vacate".' },
      { status: 400 }
    )
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to update room."
    return NextResponse.json({ error: message }, { status: authStatus(error) })
  }
}
