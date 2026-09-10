import { NextResponse } from "next/server"
import { z } from "zod"
import { eq } from "drizzle-orm"
import { getDb } from "@/db/server"
import { studentProfiles, users } from "@/db/schema"
import { requirePermission } from "@/lib/auth/server"

const schema = z.object({ action: z.enum(["APPROVE", "REJECT", "SUSPEND"]), reason: z.string().max(1000).optional() })

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const body = schema.parse(await request.json())
    // Each lifecycle action enforces its own RBAC string — approving must
    // not implicitly grant reject/suspend rights (or vice versa).
    const permission =
      body.action === "APPROVE" ? "students.approve" : body.action === "REJECT" ? "students.reject" : "students.suspend"
    const actor = await requirePermission(permission)
    const db = getDb()
    const rows = await db.select().from(studentProfiles).where(eq(studentProfiles.id, id)).limit(1)
    const student = rows[0]
    if (!student) return NextResponse.json({ error: "Student profile not found." }, { status: 404 })

    if (body.action !== "APPROVE" && !body.reason?.trim()) {
      return NextResponse.json({ error: "A reason is required for rejection or suspension." }, { status: 400 })
    }

    const now = new Date()
    const status = body.action === "APPROVE" ? "APPROVED" : body.action === "REJECT" ? "REJECTED" : "SUSPENDED"
    await db.transaction(async (tx) => {
      await tx.update(studentProfiles).set({ approvalStatus: status, approvedBy: actor.id, approvedAt: now, rejectionReason: body.action === "APPROVE" ? null : body.reason!.trim(), updatedAt: now }).where(eq(studentProfiles.id, id))
      await tx.update(users).set({ status, updatedAt: now }).where(eq(users.id, student.userId))
    })
    return NextResponse.json({ success: true, status })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to update student status."
    const status = message.includes("Permission") ? 403 : message.includes("Authentication") ? 401 : 500
    console.error("Student approval failed", error)
    return NextResponse.json({ error: message }, { status })
  }
}
