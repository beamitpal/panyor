import { NextResponse } from "next/server"
import { getDb } from "@/db/server"
import { complaintComments, complaints, studentProfiles, users } from "@/db/schema"
import { AuthError, getEffectiveRoles, requireAnyPermission, requirePermission } from "@/lib/auth/server"
import { asc, eq } from "drizzle-orm"

function errStatus(error: unknown): number {
  if (error instanceof AuthError) return error.status
  const msg = error instanceof Error ? error.message : ""
  if (msg.includes("Permission")) return 403
  if (msg.includes("Authentication")) return 401
  return 500
}

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const identity = await requirePermission("complaints.view")
    const { id } = await params
    const db = getDb()
    const roles = await getEffectiveRoles(identity)
    const residentOnly = roles.length === 1 && roles[0] === "STUDENT"
    const canViewInternal = roles.some((role) => ["CARETAKER", "MESS_COMMITTEE", "DEPUTY_WARDEN", "WARDEN", "SUPER_ADMIN"].includes(role))
    const rows = await db
      .select({ comment: complaintComments, user: users })
      .from(complaintComments)
      .leftJoin(users, eq(complaintComments.userId, users.id))
      .where(eq(complaintComments.complaintId, id))
      .orderBy(asc(complaintComments.createdAt))

    let visibleRows = canViewInternal ? rows : rows.filter(({ comment }) => !comment.isInternal)
    if (residentOnly) {
      const [complaint] = await db.select({ studentProfileId: complaints.studentProfileId })
        .from(complaints).where(eq(complaints.id, id)).limit(1)
      if (!complaint) return NextResponse.json({ error: "Complaint not found." }, { status: 404 })
      const [profile] = await db.select({ userId: studentProfiles.userId })
        .from(studentProfiles).where(eq(studentProfiles.id, complaint.studentProfileId)).limit(1)
      if (!profile || profile.userId !== identity.id) return NextResponse.json({ error: "Forbidden." }, { status: 403 })
      visibleRows = visibleRows.filter(({ comment }) => !comment.isInternal)
    }
    return NextResponse.json({
      comments: visibleRows.map(({ comment: c, user }) => ({
        id: c.id,
        complaintId: c.complaintId,
        userId: c.userId,
        userName: user?.name ?? "Unknown",
        userRole: user?.role ?? "STUDENT",
        userAvatar: user?.image ?? null,
        message: c.message,
        isInternal: c.isInternal,
        attachmentUrls: c.attachmentUrls ?? [],
        createdAt: c.createdAt.toISOString(),
      })),
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to load comments."
    return NextResponse.json({ error: message }, { status: errStatus(error) })
  }
}

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const identity = await requireAnyPermission(["complaints.edit", "complaints.create"])
    const { id } = await params
    const db = getDb()
    const body = await req.json()

    let operationalStaff = false
    try {
      await requireAnyPermission(["complaints.edit", "complaints.assign", "complaints.resolve"])
      operationalStaff = true
    } catch {
      operationalStaff = false
    }
    if (!operationalStaff) {
      const [complaint] = await db.select({ studentProfileId: complaints.studentProfileId })
        .from(complaints).where(eq(complaints.id, id)).limit(1)
      if (!complaint) return NextResponse.json({ error: "Complaint not found." }, { status: 404 })
      const [profile] = await db.select({ userId: studentProfiles.userId })
        .from(studentProfiles).where(eq(studentProfiles.id, complaint.studentProfileId)).limit(1)
      if (!profile || profile.userId !== identity.id) {
        return NextResponse.json({ error: "You may only comment on your own complaint." }, { status: 403 })
      }
      if (body.isInternal === true) {
        return NextResponse.json({ error: "Residents cannot create internal staff notes." }, { status: 403 })
      }
    }

    if (!body.message?.trim()) {
      return NextResponse.json({ error: "Message is required." }, { status: 400 })
    }
    const commentId = `cmt_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`
    await db.insert(complaintComments).values({
      id: commentId,
      complaintId: id,
      userId: identity.id,
      message: body.message.trim(),
      isInternal: Boolean(body.isInternal),
    })
    const [created] = await db.select().from(complaintComments).where(eq(complaintComments.id, commentId)).limit(1)
    return NextResponse.json(
      {
        comment: {
          id: created.id,
          complaintId: created.complaintId,
          userId: created.userId,
          userName: identity.name,
          userRole: identity.role,
          userAvatar: identity.image ?? null,
          message: created.message,
          isInternal: created.isInternal,
          attachmentUrls: created.attachmentUrls ?? [],
          createdAt: created.createdAt.toISOString(),
        },
      },
      { status: 201 }
    )
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to post comment."
    return NextResponse.json({ error: message }, { status: errStatus(error) })
  }
}
