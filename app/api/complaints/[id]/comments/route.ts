import { NextResponse } from "next/server"
import { getDb } from "@/db/server"
import { complaintComments, users } from "@/db/schema"
import { AuthError, requireAnyPermission, requirePermission } from "@/lib/auth/server"
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
    await requirePermission("complaints.view")
    const { id } = await params
    const db = getDb()
    const rows = await db
      .select({ comment: complaintComments, user: users })
      .from(complaintComments)
      .leftJoin(users, eq(complaintComments.userId, users.id))
      .where(eq(complaintComments.complaintId, id))
      .orderBy(asc(complaintComments.createdAt))

    return NextResponse.json({
      comments: rows.map(({ comment: c, user }) => ({
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
