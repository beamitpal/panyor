import { NextResponse } from "next/server"
import { headers } from "next/headers"
import { eq } from "drizzle-orm"
import { auth } from "@/auth"
import { getDb } from "@/db/server"
import { rooms, studentProfiles, users } from "@/db/schema"

/** Own resident profile for the logged-in student (plus room label). */
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
      .where(eq(studentProfiles.userId, session.user.id))
      .limit(1)
    const row = rows[0]
    if (!row) return NextResponse.json({ profile: null })
    const p = row.profile
    return NextResponse.json({
      profile: {
        id: p.id,
        userId: p.userId,
        name: row.user?.name ?? session.user.name,
        email: row.user?.email ?? session.user.email,
        phone: row.user?.phone ?? "",
        studentId: p.studentId,
        enrollmentNo: p.enrollmentNo,
        department: p.department,
        program: p.program,
        year: p.year,
        semester: p.semester,
        roomId: p.roomId,
        roomNumber: row.room?.roomNumber ?? null,
        bedNumber: p.bedNumber,
        approvalStatus: p.approvalStatus,
        rejectionReason: p.rejectionReason,
        emergencyContactName: p.emergencyContactName,
        emergencyContactPhone: p.emergencyContactPhone,
        bloodGroup: p.bloodGroup,
        address: p.address,
        avatarUrl: p.avatarUrl ?? row.user?.image ?? null,
        createdAt: p.createdAt,
      },
    })
  } catch {
    return NextResponse.json({ error: "Unable to load profile." }, { status: 500 })
  }
}
