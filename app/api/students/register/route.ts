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

function postgresErrorDetails(error: unknown) {
  const value = error as { code?: string; constraint?: string; detail?: string; message?: string }
  return {
    code: value?.code,
    constraint: value?.constraint,
    detail: value?.detail,
    message: value?.message,
  }
}

export async function POST(request: Request) {
  try {
    const session = await auth.api.getSession({ headers: await headers() })
    if (!session?.user) return NextResponse.json({ error: "Authentication required." }, { status: 401 })

    const body = schema.parse(await request.json())
    const db = getDb()

    // A profile is uniquely owned by the authenticated user. This also makes
    // the endpoint safe to retry after a network timeout.
    const existing = await db
      .select({ id: studentProfiles.id })
      .from(studentProfiles)
      .where(eq(studentProfiles.userId, session.user.id))
      .limit(1)
    if (existing[0]) {
      return NextResponse.json({ success: true, profileId: existing[0].id, existing: true })
    }

    // Give the user a useful validation error instead of exposing a raw
    // PostgreSQL unique-constraint exception when the academic identifiers
    // have already been registered.
    const duplicateStudentId = await db
      .select({ id: studentProfiles.id })
      .from(studentProfiles)
      .where(eq(studentProfiles.studentId, body.studentId.trim()))
      .limit(1)
    if (duplicateStudentId[0]) {
      return NextResponse.json({ error: "This roll / student ID is already registered." }, { status: 409 })
    }

    const duplicateEnrollment = await db
      .select({ id: studentProfiles.id })
      .from(studentProfiles)
      .where(eq(studentProfiles.enrollmentNo, body.enrollmentNo.trim()))
      .limit(1)
    if (duplicateEnrollment[0]) {
      return NextResponse.json({ error: "This enrollment number is already registered." }, { status: 409 })
    }

    const profileId = crypto.randomUUID()
    const now = new Date()
    await db.insert(studentProfiles).values({
      id: profileId,
      userId: session.user.id,
      studentId: body.studentId.trim(),
      enrollmentNo: body.enrollmentNo.trim(),
      department: body.department.trim(),
      program: body.program.trim(),
      year: body.year,
      semester: body.semester,
      approvalStatus: "PENDING",
      emergencyContactName: body.emergencyContactName?.trim() || null,
      emergencyContactPhone: body.emergencyContactPhone?.trim() || null,
      bloodGroup: body.bloodGroup?.trim() || null,
      address: body.address?.trim() || null,
      avatarUrl: body.avatarUrl || session.user.image || null,
      createdAt: now,
      updatedAt: now,
    })

    return NextResponse.json({ success: true, profileId })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Invalid registration data.", details: error.flatten() }, { status: 400 })
    }

    const pg = postgresErrorDetails(error)
    console.error("Student registration failed", { ...pg, error })

    // Handle a race between the duplicate checks and the insert. PostgreSQL
    // uses 23505 for unique-constraint violations.
    if (pg.code === "23505") {
      if (pg.constraint?.includes("student_profiles_student_id")) {
        return NextResponse.json({ error: "This roll / student ID is already registered." }, { status: 409 })
      }
      if (pg.constraint?.includes("student_profiles_enrollment_no")) {
        return NextResponse.json({ error: "This enrollment number is already registered." }, { status: 409 })
      }
      if (pg.constraint?.includes("student_profiles_user_id")) {
        return NextResponse.json({ error: "A student profile already exists for this account." }, { status: 409 })
      }
    }

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
