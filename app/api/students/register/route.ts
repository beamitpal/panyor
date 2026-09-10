import { NextResponse } from "next/server"
import { headers } from "next/headers"
import { z } from "zod"
import { auth } from "@/auth"
import { getDb } from "@/db/server"
import { studentProfiles, users } from "@/db/schema"
import { eq } from "drizzle-orm"

const schema = z.object({
  studentId: z.string().min(3),
  enrollmentNo: z.string().min(3),
  department: z.string().min(2),
  program: z.string().min(2),
  year: z.number().int().min(1).max(8),
  semester: z.number().int().min(1).max(16),
  emergencyContactName: z.string().optional(),
  emergencyContactPhone: z.string().optional(),
  bloodGroup: z.string().optional(),
  address: z.string().optional(),
  avatarUrl: z.string().url().optional(),
})

export async function POST(request: Request) {
  try {
    const session = await auth.api.getSession({ headers: await headers() })
    if (!session?.user) return NextResponse.json({ error: "Authentication required." }, { status: 401 })

    const body = schema.parse(await request.json())
    const db = getDb()
    const existing = await db.select({ id: studentProfiles.id }).from(studentProfiles).where(eq(studentProfiles.userId, session.user.id)).limit(1)
    // Idempotent: a retry (or an orphaned account whose profile write failed)
    // lands here with a profile already present — treat as success so the
    // user reaches /pending instead of a dead-end 409.
    if (existing[0]) return NextResponse.json({ success: true, profileId: existing[0].id, existing: true })

    const profileId = crypto.randomUUID()
    const now = new Date()
    await db.insert(studentProfiles).values({
      id: profileId,
      userId: session.user.id,
      studentId: body.studentId,
      enrollmentNo: body.enrollmentNo,
      department: body.department,
      program: body.program,
      year: body.year,
      semester: body.semester,
      approvalStatus: "PENDING",
      emergencyContactName: body.emergencyContactName || null,
      emergencyContactPhone: body.emergencyContactPhone || null,
      bloodGroup: body.bloodGroup || null,
      address: body.address || null,
      avatarUrl: body.avatarUrl || session.user.image || null,
      createdAt: now,
      updatedAt: now,
    })

    return NextResponse.json({ success: true, profileId })
  } catch (error) {
    if (error instanceof z.ZodError) return NextResponse.json({ error: "Invalid registration data.", details: error.flatten() }, { status: 400 })
    console.error("Student registration failed", error)
    return NextResponse.json({ error: "Unable to create student profile." }, { status: 500 })
  }
}

/**
 * Self-service rollback: delete the caller's own auth account (cascades to
 * sessions/accounts/profile). Used when signup succeeds but the profile
 * write fails, so a retry starts clean instead of hitting "email exists".
 */
export async function DELETE() {
  try {
    const session = await auth.api.getSession({ headers: await headers() })
    if (!session?.user) return NextResponse.json({ error: "Authentication required." }, { status: 401 })
    const db = getDb()
    await db.delete(users).where(eq(users.id, session.user.id))
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Student self-rollback failed", error)
    return NextResponse.json({ error: "Unable to remove partial account." }, { status: 500 })
  }
}
