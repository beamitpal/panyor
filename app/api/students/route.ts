import { NextResponse } from "next/server"
import { z } from "zod"
import { getDb } from "@/db/server"
import { rooms, studentProfiles, users } from "@/db/schema"
import { requirePermission } from "@/lib/auth/server"
import { normalizeEmail, normalizePhone } from "@/lib/auth/normalize"
import { findIdConflict, normalizeStudentId } from "@/lib/students/ids"
import { auth } from "@/auth"
import { eq } from "drizzle-orm"

/**
 * Real resident directory for the Super Admin / Warden portal.
 * Joins student_profiles -> users (identity + account status) -> rooms (bed label).
 */
export async function GET() {
  try {
    await requirePermission("students.view")
    const db = getDb()
    const rows = await db
      .select({
        profile: studentProfiles,
        user: users,
        room: rooms,
      })
      .from(studentProfiles)
      .leftJoin(users, eq(studentProfiles.userId, users.id))
      .leftJoin(rooms, eq(studentProfiles.roomId, rooms.id))

    const students = rows.map(({ profile, user, room }) => ({
      id: profile.id,
      userId: profile.userId,
      name: user?.name ?? "Unknown",
      email: user?.email ?? "",
      phone: user?.phone ?? "",
      image: user?.image ?? null,
      accountStatus: user?.status ?? profile.approvalStatus,
      studentId: profile.studentId,
      enrollmentNo: profile.enrollmentNo,
      department: profile.department,
      program: profile.program,
      year: profile.year,
      semester: profile.semester,
      roomId: profile.roomId,
      roomNumber: room?.roomNumber ?? null,
      bedNumber: profile.bedNumber,
      approvalStatus: profile.approvalStatus,
      approvedBy: profile.approvedBy,
      approvedAt: profile.approvedAt,
      rejectionReason: profile.rejectionReason,
      emergencyContactName: profile.emergencyContactName,
      emergencyContactPhone: profile.emergencyContactPhone,
      bloodGroup: profile.bloodGroup,
      address: profile.address,
      avatarUrl: profile.avatarUrl,
      createdAt: profile.createdAt,
    }))

    return NextResponse.json({ students })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to load students."
    const status = message.includes("Permission") ? 403 : message.includes("Authentication") ? 401 : 500
    return NextResponse.json({ error: message }, { status })
  }
}

const inviteSchema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  password: z.string().min(8).optional(),
  phone: z.string().optional(),
  studentId: z.string().min(3),
  enrollmentNo: z.string().min(3),
  department: z.string().min(2),
  program: z.string().min(2),
  year: z.number().int().min(1).max(8).default(1),
  semester: z.number().int().min(1).max(16).default(1),
  emergencyContactName: z.string().optional(),
  emergencyContactPhone: z.string().optional(),
  bloodGroup: z.string().optional(),
  address: z.string().optional(),
})

/**
 * Staff invites a resident: creates a real STUDENT/PENDING login plus the
 * student profile in one call. When no password is supplied a temporary one
 * is generated and returned ONCE for staff to share with the student.
 */
export async function POST(request: Request) {
  try {
    await requirePermission("students.create")
    const raw = inviteSchema.parse(await request.json())
    // Normalize BEFORE the duplicate check: "Amit@Gmail.Com " and
    // "amit@gmail.com" are the same mailbox; casing/spacing must never
    // cause a false "already exists" — or a missed duplicate.
    const email = normalizeEmail(raw.email)
    const phone = raw.phone ? normalizePhone(raw.phone) : ""
    if (raw.phone && !phone) return NextResponse.json({ error: "Enter a valid phone number." }, { status: 400 })
    const body = { ...raw, email, phone }
    const studentId = normalizeStudentId(raw.studentId)
    const enrollmentNo = normalizeStudentId(raw.enrollmentNo)
    const rollConflict = await findIdConflict(studentId)
    if (rollConflict) {
      return NextResponse.json({ error: "This roll / student ID is already registered to another student. Use A/F if not issued yet." }, { status: 409 })
    }
    const enrollConflict = await findIdConflict(enrollmentNo)
    if (enrollConflict) {
      return NextResponse.json({ error: "This enrollment number is already registered to another student. Use A/F if not issued yet." }, { status: 409 })
    }
    const db = getDb()

    const duplicate = await db.select({ id: users.id }).from(users).where(eq(users.email, body.email)).limit(1)
    if (duplicate[0]) return NextResponse.json({ error: "An account with this email already exists." }, { status: 409 })

    const tempPassword = body.password ?? crypto.randomUUID().replace(/-/g, "").slice(0, 12)
    const created = await auth.api.signUpEmail({
      body: { name: body.name, email: body.email, password: tempPassword },
    })
    if (!created?.user?.id) return NextResponse.json({ error: "Unable to create student account." }, { status: 400 })

    const now = new Date()
    const profileId = crypto.randomUUID()
    await db.insert(studentProfiles).values({
      id: profileId,
      userId: created.user.id,
      studentId,
      enrollmentNo,
      department: body.department,
      program: body.program,
      year: body.year,
      semester: body.semester,
      approvalStatus: "PENDING",
      emergencyContactName: body.emergencyContactName || null,
      emergencyContactPhone: body.emergencyContactPhone || null,
      bloodGroup: body.bloodGroup || null,
      address: body.address || null,
      createdAt: now,
      updatedAt: now,
    })
    if (body.phone) {
      await db.update(users).set({ phone: body.phone, updatedAt: now }).where(eq(users.id, created.user.id))
    }
    return NextResponse.json(
      { success: true, userId: created.user.id, profileId, tempPassword: body.password ? undefined : tempPassword },
      { status: 201 }
    )
  } catch (error) {
    if (error instanceof z.ZodError) return NextResponse.json({ error: "Invalid student data.", details: error.flatten() }, { status: 400 })
    const message = error instanceof Error ? error.message : "Unable to invite student."
    const status = message.includes("Permission") ? 403 : message.includes("Authentication") ? 401 : 500
    return NextResponse.json({ error: message }, { status })
  }
}
