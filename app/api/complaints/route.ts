import { NextResponse } from "next/server"
import { headers } from "next/headers"
import { auth } from "@/auth"
import { getDb } from "@/db/server"
import { complaintCategories, complaintComments, complaints, rooms, studentProfiles, users } from "@/db/schema"
import { AuthError, requirePermission } from "@/lib/auth/server"
import { desc, eq, sql } from "drizzle-orm"

function errStatus(error: unknown): number {
  if (error instanceof AuthError) return error.status
  const msg = error instanceof Error ? error.message : ""
  if (msg.includes("Permission")) return 403
  if (msg.includes("Authentication")) return 401
  return 500
}

function serialize(c: typeof complaints.$inferSelect, extra: Record<string, unknown>) {
  return {
    ...extra,
    id: c.id,
    ticketNumber: c.ticketNumber,
    studentProfileId: c.studentProfileId,
    title: c.title,
    description: c.description,
    categoryId: c.categoryId,
    roomId: c.roomId,
    priority: c.priority,
    status: c.status,
    assignedTo: c.assignedTo,
    assignedAt: c.assignedAt?.toISOString() ?? null,
    resolvedAt: c.resolvedAt?.toISOString() ?? null,
    closedAt: c.closedAt?.toISOString() ?? null,
    resolutionNotes: c.resolutionNotes,
    studentFeedbackRating: c.studentFeedbackRating,
    studentFeedbackNotes: c.studentFeedbackNotes,
    attachmentUrls: c.attachmentUrls ?? [],
    createdAt: c.createdAt.toISOString(),
    updatedAt: c.updatedAt.toISOString(),
  }
}

export async function GET() {
  try {
    await requirePermission("complaints.view")
    const db = getDb()
    const rows = await db
      .select({
        complaint: complaints,
        category: complaintCategories,
        profile: studentProfiles,
        user: users,
        room: rooms,
      })
      .from(complaints)
      .leftJoin(complaintCategories, eq(complaints.categoryId, complaintCategories.id))
      .leftJoin(studentProfiles, eq(complaints.studentProfileId, studentProfiles.id))
      .leftJoin(users, eq(studentProfiles.userId, users.id))
      .leftJoin(rooms, eq(complaints.roomId, rooms.id))
      .orderBy(desc(complaints.createdAt))

    // NOTE: self-join of users (student + assignee) isn't expressible in one
    // drizzle select; resolve assignee names with a lookup.
    const assigneeIds = [...new Set(rows.map((r) => r.complaint.assignedTo).filter(Boolean))] as string[]
    const assigneeMap = new Map<string, string>()
    if (assigneeIds.length > 0) {
      const staff = await db.select({ id: users.id, name: users.name }).from(users)
      for (const s of staff) if (assigneeIds.includes(s.id)) assigneeMap.set(s.id, s.name)
    }

    const commentCounts = await db
      .select({ complaintId: complaintComments.complaintId, count: sql<number>`count(*)::int` })
      .from(complaintComments)
      .groupBy(complaintComments.complaintId)
    const countMap = new Map(commentCounts.map((c) => [c.complaintId, Number(c.count)]))

    const data = rows.map(({ complaint: c, category, profile, user, room }) => {
      void profile
      return serialize(c, {
        studentName: user?.name ?? "Unknown",
        studentId: profile?.studentId ?? null,
        studentEmail: user?.email ?? "",
        studentPhone: user?.phone ?? "",
        roomNumber: room?.roomNumber ?? null,
        categoryName: category?.name ?? "General",
        categoryIcon: category?.icon ?? null,
        assignedToName: c.assignedTo ? (assigneeMap.get(c.assignedTo) ?? null) : null,
        commentsCount: countMap.get(c.id) ?? 0,
      })
    })

    const categories = await db.select().from(complaintCategories)

    return NextResponse.json({ complaints: data, categories })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to load complaints."
    return NextResponse.json({ error: message }, { status: errStatus(error) })
  }
}

export async function POST(req: Request) {
  try {
    await requirePermission("complaints.create")
    const db = getDb()
    const body = await req.json()
    const { studentProfileId, categoryId, priority, title, description } = body as {
      studentProfileId?: string
      categoryId?: string
      priority?: "LOW" | "MEDIUM" | "HIGH" | "URGENT"
      title?: string
      description?: string
    }
    if (!studentProfileId || !categoryId || !title?.trim() || !description?.trim()) {
      return NextResponse.json({ error: "studentProfileId, categoryId, title and description are required." }, { status: 400 })
    }
    const profileRows = await db.select().from(studentProfiles).where(eq(studentProfiles.id, studentProfileId)).limit(1)
    const profile = profileRows[0]
    if (!profile) return NextResponse.json({ error: "Student profile not found." }, { status: 404 })

    // Students may only file for themselves; staff (edit/assign) may file on behalf.
    const session = await auth.api.getSession({ headers: await headers() })
    if (profile.userId !== session?.user.id) {
      try {
        await requirePermission("complaints.edit")
      } catch {
        await requirePermission("complaints.assign")
      }
    }

    const year = new Date().getFullYear()
    const countRows = await db.select({ id: complaints.id }).from(complaints)
    const ticketNumber = `CMP-${year}-${String(countRows.length + 1).padStart(3, "0")}`
    const id = `cmp_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`

    await db.insert(complaints).values({
      id,
      ticketNumber,
      studentProfileId,
      categoryId,
      roomId: profile.roomId,
      title: title.trim(),
      description: description.trim(),
      priority: priority ?? "MEDIUM",
      status: "OPEN",
    })

    const [created] = await db.select().from(complaints).where(eq(complaints.id, id)).limit(1)
    const [cat] = await db.select().from(complaintCategories).where(eq(complaintCategories.id, created.categoryId)).limit(1)
    const [user] = profile.userId ? await db.select().from(users).where(eq(users.id, profile.userId)).limit(1) : [undefined]
    const [room] = created.roomId ? await db.select().from(rooms).where(eq(rooms.id, created.roomId)).limit(1) : [undefined]

    return NextResponse.json(
      {
        complaint: serialize(created, {
          studentName: user?.name ?? "Unknown",
          studentId: profile.studentId,
          studentEmail: user?.email ?? "",
          studentPhone: user?.phone ?? "",
          roomNumber: room?.roomNumber ?? null,
          categoryName: cat?.name ?? "General",
          categoryIcon: cat?.icon ?? null,
          assignedToName: null,
          commentsCount: 0,
        }),
      },
      { status: 201 }
    )
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to create complaint."
    return NextResponse.json({ error: message }, { status: errStatus(error) })
  }
}
