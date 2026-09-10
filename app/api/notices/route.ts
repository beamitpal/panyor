import { NextResponse } from "next/server"
import { getDb } from "@/db/server"
import { notices, users } from "@/db/schema"
import { AuthError, requirePermission } from "@/lib/auth/server"
import { desc, eq } from "drizzle-orm"
import { randomUUID } from "crypto"

const iso = (d: unknown) => (d instanceof Date ? d.toISOString() : d ?? null)

function slugify(title: string) {
  const base =
    title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 60) || "notice"
  const suffix = Math.random().toString(36).slice(2, 8)
  return `${base}-${suffix}`
}

function mapNotice(n: typeof notices.$inferSelect, author?: { name: string; role: string } | null) {
  return {
    id: n.id,
    title: n.title,
    slug: n.slug,
    content: n.content,
    category: n.category,
    priority: n.priority,
    targetAudiences: n.targetAudiences,
    authorId: n.authorId,
    authorName: author?.name ?? "Unknown",
    authorRole: author?.role ?? "STAFF",
    isPublished: n.isPublished,
    attachmentUrls: n.attachmentUrls ?? [],
    expiresAt: iso(n.expiresAt),
    viewCount: n.viewCount,
    publishedAt: iso(n.publishedAt),
    createdAt: iso(n.createdAt),
    updatedAt: iso(n.updatedAt),
  }
}

function errStatus(error: unknown) {
  if (error instanceof AuthError) return error.status
  const msg = error instanceof Error ? error.message : ""
  if (msg.includes("Permission")) return 403
  if (msg.includes("Authentication")) return 401
  return 500
}

export async function GET() {
  try {
    await requirePermission("notices.view")
    const db = getDb()
    const rows = await db
      .select({ notice: notices, author: users })
      .from(notices)
      .leftJoin(users, eq(notices.authorId, users.id))
      .orderBy(desc(notices.publishedAt))
    return NextResponse.json({
      notices: rows.map(({ notice, author }) =>
        mapNotice(notice, author ? { name: author.name, role: author.role } : null)
      ),
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to load notices."
    return NextResponse.json({ error: message }, { status: errStatus(error) })
  }
}

export async function POST(req: Request) {
  try {
    const actor = await requirePermission("notices.create")
    const body = await req.json()
    const { title, content, category = "GENERAL", priority = "NORMAL", targetAudiences = ["ALL"], expiresAt = null } = body
    if (!title?.trim() || !content?.trim()) {
      return NextResponse.json({ error: "Title and content are required." }, { status: 400 })
    }
    const db = getDb()
    const now = new Date()
    const row = {
      id: randomUUID(),
      title: title.trim(),
      slug: slugify(title.trim()),
      content: content.trim(),
      category,
      priority,
      targetAudiences,
      isPublished: true,
      publishedAt: now,
      expiresAt: expiresAt ? new Date(expiresAt) : null,
      attachmentUrls: body.attachmentUrls ?? [],
      authorId: actor.id,
      viewCount: 0,
      createdAt: now,
      updatedAt: now,
    }
    await db.insert(notices).values(row)
    return NextResponse.json(
      { notice: mapNotice(row as typeof notices.$inferSelect, { name: actor.name, role: actor.role }) },
      { status: 201 }
    )
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to create notice."
    return NextResponse.json({ error: message }, { status: errStatus(error) })
  }
}
