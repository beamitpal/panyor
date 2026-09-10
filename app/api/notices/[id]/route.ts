import { NextResponse } from "next/server"
import { getDb } from "@/db/server"
import { notices } from "@/db/schema"
import { AuthError, requirePermission } from "@/lib/auth/server"
import { eq } from "drizzle-orm"

const iso = (d: unknown) => (d instanceof Date ? d.toISOString() : d ?? null)

function errStatus(error: unknown) {
  if (error instanceof AuthError) return error.status
  const msg = error instanceof Error ? error.message : ""
  if (msg.includes("Permission")) return 403
  if (msg.includes("Authentication")) return 401
  return 500
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requirePermission("notices.edit")
    const { id } = await params
    const body = await req.json()
    const allowed = ["title", "content", "category", "priority", "targetAudiences", "isPublished", "expiresAt", "attachmentUrls"] as const
    const patch: Record<string, unknown> = { updatedAt: new Date() }
    for (const k of allowed) {
      if (body[k] !== undefined) patch[k] = k === "expiresAt" && body[k] ? new Date(body[k]) : body[k]
    }
    const db = getDb()
    await db.update(notices).set(patch).where(eq(notices.id, id))
    const rows = await db.select().from(notices).where(eq(notices.id, id)).limit(1)
    if (!rows[0]) return NextResponse.json({ error: "Notice not found." }, { status: 404 })
    const n = rows[0]
    return NextResponse.json({
      notice: { ...n, publishedAt: iso(n.publishedAt), expiresAt: iso(n.expiresAt), createdAt: iso(n.createdAt), updatedAt: iso(n.updatedAt) },
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to update notice."
    return NextResponse.json({ error: message }, { status: errStatus(error) })
  }
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requirePermission("notices.delete")
    const { id } = await params
    const db = getDb()
    await db.delete(notices).where(eq(notices.id, id))
    return NextResponse.json({ ok: true })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to delete notice."
    return NextResponse.json({ error: message }, { status: errStatus(error) })
  }
}
