import { NextResponse } from "next/server"
import { getDb } from "@/db/server"
import { complaints, studentProfiles } from "@/db/schema"
import { AuthError, requireAnyPermission, requirePermission } from "@/lib/auth/server"
import { eq } from "drizzle-orm"

function errStatus(error: unknown): number {
  if (error instanceof AuthError) return error.status
  const msg = error instanceof Error ? error.message : ""
  if (msg.includes("Permission")) return 403
  if (msg.includes("Authentication")) return 401
  return 500
}

const STATUSES = ["OPEN", "ACKNOWLEDGED", "IN_PROGRESS", "RESOLVED", "CLOSED", "REJECTED"] as const

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const db = getDb()
    const body = await req.json()

    let mutationMode: "staff" | "own_feedback" = "staff"
    try {
      await requireAnyPermission(["complaints.edit", "complaints.assign", "complaints.resolve"])
    } catch {
      const identity = await requirePermission("complaints.close_own")
      mutationMode = "own_feedback"
      const [complaint] = await db.select({ studentProfileId: complaints.studentProfileId, status: complaints.status })
        .from(complaints).where(eq(complaints.id, id)).limit(1)
      if (!complaint) return NextResponse.json({ error: "Complaint not found." }, { status: 404 })
      const [profile] = await db.select({ userId: studentProfiles.userId })
        .from(studentProfiles).where(eq(studentProfiles.id, complaint.studentProfileId)).limit(1)
      if (!profile || profile.userId !== identity.id) {
        return NextResponse.json({ error: "You may only close and rate your own complaint." }, { status: 403 })
      }
      if (complaint.status !== "RESOLVED" || body.status !== "CLOSED" || body.rating === undefined) {
        return NextResponse.json({ error: "Residents may only close their own resolved complaint with a rating." }, { status: 403 })
      }
    }
    const patch: Partial<typeof complaints.$inferInsert> = { updatedAt: new Date() }

    if (body.status !== undefined) {
      if (!STATUSES.includes(body.status)) {
        return NextResponse.json({ error: "Invalid status." }, { status: 400 })
      }
      patch.status = body.status
      const now = new Date()
      if (body.status === "RESOLVED") {
        patch.resolvedAt = now
        if (body.resolutionNotes !== undefined) patch.resolutionNotes = body.resolutionNotes
      }
      if (body.status === "CLOSED") {
        patch.closedAt = now
        if (body.resolutionNotes !== undefined) patch.resolutionNotes = body.resolutionNotes
        if (body.rating !== undefined) {
          patch.studentFeedbackRating = body.rating
          if (body.feedbackNotes !== undefined) patch.studentFeedbackNotes = body.feedbackNotes
        }
      }
      if (body.status === "OPEN" || body.status === "ACKNOWLEDGED" || body.status === "IN_PROGRESS") {
        patch.resolvedAt = null
        patch.closedAt = null
      }
    }
    if (body.assignedTo !== undefined) {
      patch.assignedTo = body.assignedTo || null
      patch.assignedAt = body.assignedTo ? new Date() : null
    }
    if (body.resolutionNotes !== undefined && patch.resolutionNotes === undefined) {
      patch.resolutionNotes = body.resolutionNotes
    }

    if (mutationMode === "own_feedback") {
      if (body.assignedTo !== undefined || body.resolutionNotes !== undefined) {
        return NextResponse.json({ error: "Residents cannot change assignment or resolution details." }, { status: 403 })
      }
      patch.status = "CLOSED"
      patch.closedAt = new Date()
    }

    await db.update(complaints).set(patch).where(eq(complaints.id, id))
    const [updated] = await db.select().from(complaints).where(eq(complaints.id, id)).limit(1)
    if (!updated) return NextResponse.json({ error: "Complaint not found." }, { status: 404 })

    return NextResponse.json({
      complaint: {
        ...updated,
        assignedAt: updated.assignedAt?.toISOString() ?? null,
        resolvedAt: updated.resolvedAt?.toISOString() ?? null,
        closedAt: updated.closedAt?.toISOString() ?? null,
        createdAt: updated.createdAt.toISOString(),
        updatedAt: updated.updatedAt.toISOString(),
      },
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to update complaint."
    return NextResponse.json({ error: message }, { status: errStatus(error) })
  }
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { requirePermission } = await import("@/lib/auth/server")
    await requirePermission("complaints.delete")
    const { id } = await params
    const db = getDb()
    await db.delete(complaints).where(eq(complaints.id, id))
    return NextResponse.json({ success: true })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to delete complaint."
    return NextResponse.json({ error: message }, { status: errStatus(error) })
  }
}
