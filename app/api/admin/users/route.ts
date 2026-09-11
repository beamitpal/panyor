import { NextResponse } from "next/server"
import { z } from "zod"
import { eq } from "drizzle-orm"
import { auth } from "@/auth"
import { getDb } from "@/db/server"
import { users, userRoles } from "@/db/schema"
import { requirePermission } from "@/lib/auth/server"
import { normalizeEmail, normalizePhone } from "@/lib/auth/normalize"

const roles = ["WARDEN","DEPUTY_WARDEN","PRESIDENT","CARETAKER","MESS_COMMITTEE","SPORTS_COMMITTEE","MESS_EMPLOYEE"] as const
const schema = z.object({ name: z.string().min(2), email: z.string().email(), password: z.string().min(8), role: z.enum(roles), phone: z.string().optional() })

export async function GET() {
  try {
    await requirePermission("users.manage")
    const db = getDb()
    const rows = await db.select().from(users)
    const extras = await db.select().from(userRoles)
    const extraByUser = new Map<string, string[]>()
    for (const r of extras) {
      const list = extraByUser.get(r.userId) ?? []
      if (!list.includes(r.role)) list.push(r.role)
      extraByUser.set(r.userId, list)
    }
    const staff = rows
      .filter((u) => u.role !== "STUDENT")
      .map((u) => ({
        id: u.id,
        name: u.name,
        email: u.email,
        phone: u.phone,
        role: u.role,
        roles: [u.role, ...(extraByUser.get(u.id) ?? []).filter((r) => r !== u.role)],
        status: u.status,
        createdAt: u.createdAt,
      }))
    return NextResponse.json({ users: staff })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to load administrator accounts."
    const status = message.includes("Permission") ? 403 : message.includes("Authentication") ? 401 : 500
    return NextResponse.json({ error: message }, { status })
  }
}

export async function POST(request: Request) {
  try {
    const actor = await requirePermission("users.manage")
    const raw = schema.parse(await request.json())
    const email = normalizeEmail(raw.email)
    const phone = raw.phone ? normalizePhone(raw.phone) : ""
    if (raw.phone && !phone) return NextResponse.json({ error: "Enter a valid phone number." }, { status: 400 })
    const body = { ...raw, email, phone }
    const db = getDb()
    const duplicate = await db.select({ id: users.id }).from(users).where(eq(users.email, body.email)).limit(1)
    if (duplicate[0]) return NextResponse.json({ error: "An account with this email already exists." }, { status: 409 })
    const created = await auth.api.signUpEmail({ body: { name: body.name, email: body.email, password: body.password } })
    if (!created?.user?.id) return NextResponse.json({ error: "Unable to create administrator account." }, { status: 400 })
    await db.update(users).set({ role: body.role, status: "APPROVED", phone: body.phone || null, updatedAt: new Date() }).where(eq(users.id, created.user.id))
    // The selected administrator role is the primary role in `users.role`.
    // Additional assignments only belong in `user_roles`.
    return NextResponse.json({ success: true, userId: created.user.id })
  } catch (error) {
    if (error instanceof z.ZodError) return NextResponse.json({ error: "Invalid administrator data.", details: error.flatten() }, { status: 400 })
    const message = error instanceof Error ? error.message : "Unable to create administrator account."
    const status = message.includes("Permission") ? 403 : 500
    console.error("Admin creation failed", error)
    return NextResponse.json({ error: message }, { status })
  }
}
