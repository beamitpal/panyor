import { NextResponse } from "next/server"
import { headers } from "next/headers"
import { eq } from "drizzle-orm"
import { auth } from "@/auth"
import { getDb } from "@/db/server"
import { rooms, studentProfiles, users } from "@/db/schema"

/**
 * Minimal peer directory so a student can find a collector for proxy
 * meal pickup. Any authenticated user may read it; only approved
 * residents with a room label are listed, and contact details stay hidden.
 */
export async function GET() {
  try {
    const session = await auth.api.getSession({ headers: await headers() })
    if (!session?.user) return NextResponse.json({ error: "Authentication required." }, { status: 401 })
    const db = getDb()
    const rows = await db
      .select({ profile: studentProfiles, room: rooms, user: users })
      .from(studentProfiles)
      .leftJoin(rooms, eq(studentProfiles.roomId, rooms.id))
      .leftJoin(users, eq(studentProfiles.userId, users.id))
      .where(eq(studentProfiles.approvalStatus, "APPROVED"))
    return NextResponse.json({
      peers: rows.map(({ profile: p, room, user }) => ({
        id: p.id,
        name: user?.name ?? "Unknown",
        studentId: p.studentId,
        department: p.department,
        roomNumber: room?.roomNumber ?? null,
      })),
    })
  } catch {
    return NextResponse.json({ error: "Unable to load directory." }, { status: 500 })
  }
}
