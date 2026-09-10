import { NextResponse } from "next/server"
import { getDb } from "@/db/server"
import { users } from "@/db/schema"
import { requireAnyPermission } from "@/lib/auth/server"

/**
 * Assignable maintenance staff for the complaints triage desk.
 * Visible to anyone who can assign tickets or manage users —
 * narrower than the full administrator directory.
 */
export async function GET() {
  try {
    await requireAnyPermission(["complaints.assign", "users.manage"])
    const db = getDb()
    const rows = await db.select().from(users)
    const staff = rows
      .filter((u) => ["CARETAKER", "WARDEN", "DEPUTY_WARDEN"].includes(u.role) && u.status === "APPROVED")
      .map((u) => ({ id: u.id, name: u.name, email: u.email, role: u.role }))
    return NextResponse.json({ staff })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to load staff."
    const status = message.includes("Permission") ? 403 : message.includes("Authentication") ? 401 : 500
    return NextResponse.json({ error: message }, { status })
  }
}
