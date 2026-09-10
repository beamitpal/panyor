import { NextResponse } from "next/server"
import { z } from "zod"
import { and, eq } from "drizzle-orm"
import { getDb } from "@/db/server"
import { userRoles, users } from "@/db/schema"
import { requirePermission } from "@/lib/auth/server"

const ALL_ROLES = [
  "STUDENT",
  "CARETAKER",
  "MESS_EMPLOYEE",
  "MESS_COMMITTEE",
  "SPORTS_COMMITTEE",
  "PRESIDENT",
  "DEPUTY_WARDEN",
  "WARDEN",
  "SUPER_ADMIN",
] as const

const bodySchema = z.object({ role: z.enum(ALL_ROLES) })

function errStatus(error: unknown) {
  const msg = error instanceof Error ? error.message : ""
  if (msg.includes("Permission")) return 403
  if (msg.includes("Authentication")) return 401
  return 500
}

/** Effective roles: primary + every additional user_roles assignment. */
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requirePermission("users.manage")
    const { id } = await params
    const db = getDb()
    const rows = await db.select().from(users).where(eq(users.id, id)).limit(1)
    const user = rows[0]
    if (!user) return NextResponse.json({ error: "User not found." }, { status: 404 })
    const extra = await db.select().from(userRoles).where(eq(userRoles.userId, id))
    const roles = [user.role, ...extra.map((r) => r.role).filter((r) => r !== user.role)]
    return NextResponse.json({ userId: id, primaryRole: user.role, roles })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to load roles."
    return NextResponse.json({ error: message }, { status: errStatus(error) })
  }
}

/** Grant an additional role (e.g. make a STUDENT also PRESIDENT). */
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const actor = await requirePermission("users.manage")
    const { id } = await params
    const { role } = bodySchema.parse(await request.json())
    const db = getDb()
    const rows = await db.select().from(users).where(eq(users.id, id)).limit(1)
    const user = rows[0]
    if (!user) return NextResponse.json({ error: "User not found." }, { status: 404 })
    if (role === user.role) return NextResponse.json({ error: "This is already the user's primary role." }, { status: 409 })
    if (role === "SUPER_ADMIN") return NextResponse.json({ error: "SUPER_ADMIN can only be granted as a primary role by another Super Admin via account creation." }, { status: 403 })
    await db.insert(userRoles).values({ id: crypto.randomUUID(), userId: id, role, assignedBy: actor.id }).onConflictDoNothing()
    return NextResponse.json({ success: true, role })
  } catch (error) {
    if (error instanceof z.ZodError) return NextResponse.json({ error: "Invalid role." }, { status: 400 })
    const message = error instanceof Error ? error.message : "Unable to grant role."
    return NextResponse.json({ error: message }, { status: errStatus(error) })
  }
}

/** Revoke an additional role. Primary roles and SUPER_ADMIN assignments are protected. */
export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const actor = await requirePermission("users.manage")
    const { id } = await params
    const { role } = bodySchema.parse(await request.json())
    if (id === actor.id) return NextResponse.json({ error: "You cannot revoke your own roles." }, { status: 403 })
    const db = getDb()
    const rows = await db.select().from(users).where(eq(users.id, id)).limit(1)
    const user = rows[0]
    if (!user) return NextResponse.json({ error: "User not found." }, { status: 404 })
    if (role === user.role) return NextResponse.json({ error: "The primary role cannot be revoked — change it instead." }, { status: 400 })
    if (user.role === "SUPER_ADMIN" || role === "SUPER_ADMIN") {
      return NextResponse.json({ error: "SUPER_ADMIN assignments are protected." }, { status: 403 })
    }
    await db.delete(userRoles).where(and(eq(userRoles.userId, id), eq(userRoles.role, role)))
    return NextResponse.json({ success: true, role })
  } catch (error) {
    if (error instanceof z.ZodError) return NextResponse.json({ error: "Invalid role." }, { status: 400 })
    const message = error instanceof Error ? error.message : "Unable to revoke role."
    return NextResponse.json({ error: message }, { status: errStatus(error) })
  }
}
