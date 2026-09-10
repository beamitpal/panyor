import { NextResponse } from "next/server"
import { getDb } from "@/db/server"
import { rooms, studentProfiles, users } from "@/db/schema"
import { requirePermission, AuthError } from "@/lib/auth/server"
import { eq } from "drizzle-orm"
import { randomUUID } from "crypto"

function toIso(v: Date | string | null | undefined): string | undefined {
  if (!v) return undefined
  return v instanceof Date ? v.toISOString() : new Date(v).toISOString()
}

function statusFor(occupancy: number): "VACANT" | "AVAILABLE" | "FULL" {
  if (occupancy >= 2) return "FULL"
  if (occupancy === 1) return "AVAILABLE"
  return "VACANT"
}

function authStatus(error: unknown): number {
  if (error instanceof AuthError) return error.status
  const message = error instanceof Error ? error.message : ""
  if (message.includes("Permission")) return 403
  if (message.includes("Authentication")) return 401
  return 500
}

/**
 * GET /api/rooms — list rooms with occupancy computed from
 * studentProfiles where roomId matches, plus basic occupant info.
 * Requires rooms.view.
 */
export async function GET() {
  try {
    await requirePermission("rooms.view")
    const db = getDb()

    const allRooms = await db.select().from(rooms)
    const profiles = await db
      .select({ profile: studentProfiles, user: users })
      .from(studentProfiles)
      .leftJoin(users, eq(studentProfiles.userId, users.id))

    const byRoom = new Map<string, typeof profiles>()
    for (const row of profiles) {
      const roomId = row.profile.roomId
      if (!roomId) continue
      const list = byRoom.get(roomId) ?? []
      list.push(row)
      byRoom.set(roomId, list)
    }

    const data = allRooms.map((room) => {
      const occupants = (byRoom.get(room.id) ?? []).map(({ profile, user }) => ({
        id: profile.id,
        name: user?.name ?? "Unknown",
        studentId: profile.studentId,
        bedNumber: profile.bedNumber ?? 0,
        avatarUrl: profile.avatarUrl ?? user?.image ?? null,
        department: profile.department,
        email: user?.email ?? "",
        phone: user?.phone ?? "",
        program: profile.program,
        roomNumber: room.roomNumber,
      }))
      const occupancy = occupants.length
      return {
        id: room.id,
        roomNumber: room.roomNumber,
        block: room.block,
        floor: room.floor,
        capacity: Math.min(room.capacity, 2),
        occupancy,
        status: statusFor(occupancy),
        notes: room.notes ?? null,
        students: occupants,
        createdAt: toIso(room.createdAt),
        updatedAt: toIso(room.updatedAt),
      }
    })

    return NextResponse.json({ rooms: data })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to load rooms."
    return NextResponse.json({ error: message }, { status: authStatus(error) })
  }
}

/**
 * POST /api/rooms — create a room (double occupancy, capacity 2).
 * Requires rooms.create. Body: { roomNumber, floor, block, notes? }
 */
export async function POST(req: Request) {
  try {
    await requirePermission("rooms.create")
    const body = await req.json().catch(() => ({}))
    const roomNumber = String(body.roomNumber ?? "").trim()
    const floor = Number(body.floor ?? 1)
    const block = String(body.block ?? "Block A").trim() || "Block A"
    const notes = body.notes ? String(body.notes) : null

    if (!roomNumber) {
      return NextResponse.json({ error: "roomNumber is required." }, { status: 400 })
    }
    if (!Number.isInteger(floor)) {
      return NextResponse.json({ error: "floor must be an integer." }, { status: 400 })
    }

    const db = getDb()
    const existing = await db.select().from(rooms).where(eq(rooms.roomNumber, roomNumber)).limit(1)
    if (existing.length > 0) {
      return NextResponse.json({ error: `Room ${roomNumber} already exists.` }, { status: 409 })
    }

    const now = new Date()
    const row = {
      id: randomUUID(),
      roomNumber,
      floor,
      block,
      capacity: 2,
      status: "VACANT" as const,
      notes,
      createdAt: now,
      updatedAt: now,
    }
    await db.insert(rooms).values(row)

    return NextResponse.json(
      {
        room: {
          id: row.id,
          roomNumber: row.roomNumber,
          block: row.block,
          floor: row.floor,
          capacity: 2,
          occupancy: 0,
          status: "VACANT",
          notes: row.notes,
          students: [],
          createdAt: now.toISOString(),
          updatedAt: now.toISOString(),
        },
      },
      { status: 201 }
    )
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to create room."
    return NextResponse.json({ error: message }, { status: authStatus(error) })
  }
}
