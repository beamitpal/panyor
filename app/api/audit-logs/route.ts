import { NextResponse } from "next/server"
import { getDb } from "@/db/server"
import { auditLogs } from "@/db/schema"
import { AuthError, requirePermission } from "@/lib/auth/server"
import { desc } from "drizzle-orm"

const iso = (d: unknown) => (d instanceof Date ? d.toISOString() : d ?? null)

function errStatus(error: unknown) {
  if (error instanceof AuthError) return error.status
  const msg = error instanceof Error ? error.message : ""
  if (msg.includes("Permission")) return 403
  if (msg.includes("Authentication")) return 401
  return 500
}

export async function GET() {
  try {
    await requirePermission("audit_logs.view")
    const db = getDb()
    const rows = await db.select().from(auditLogs).orderBy(desc(auditLogs.createdAt)).limit(200)
    return NextResponse.json({
      logs: rows.map((l) => ({
        id: l.id,
        actorId: l.actorId,
        actorName: null,
        actorEmail: l.actorEmail,
        actorRole: l.actorRole,
        action: l.action,
        resource: l.resource,
        resourceType: l.resource,
        resourceId: l.resourceId,
        metadata: l.metadata ?? {},
        ipAddress: l.ipAddress,
        userAgent: l.userAgent,
        createdAt: iso(l.createdAt),
      })),
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to load audit logs."
    return NextResponse.json({ error: message }, { status: errStatus(error) })
  }
}
