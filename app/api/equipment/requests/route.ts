import { NextResponse } from "next/server"
import { getDb } from "@/db/server"
import { equipment, equipmentRequests, studentProfiles } from "@/db/schema"
import { AuthError, requireAuth } from "@/lib/auth/server"
import { eq } from "drizzle-orm"

function toStatus(error: unknown): number {
  if (error instanceof AuthError) return error.status
  const message = error instanceof Error ? error.message : ""
  if (message.includes("Permission")) return 403
  if (message.includes("Authentication")) return 401
  return 500
}

/** POST /api/equipment/requests — student submits a request (any signed-in user). */
export async function POST(req: Request) {
  try {
    await requireAuth()
    const body = await req.json()
    const { studentProfileId, equipmentId, quantity, purpose, expectedReturnDate } = body ?? {}
    if (!studentProfileId || !equipmentId) {
      return NextResponse.json({ error: "Student and equipment are required." }, { status: 400 })
    }
    const qty = Number(quantity ?? 1)
    if (!Number.isInteger(qty) || qty < 1) {
      return NextResponse.json({ error: "Quantity must be a positive integer." }, { status: 400 })
    }

    const db = getDb()
    const sRows = await db
      .select()
      .from(studentProfiles)
      .where(eq(studentProfiles.id, String(studentProfileId)))
      .limit(1)
    if (!sRows[0]) return NextResponse.json({ error: "Student profile not found." }, { status: 404 })
    if (sRows[0].approvalStatus !== "APPROVED") {
      return NextResponse.json({ error: "Only approved hostel students can request equipment." }, { status: 403 })
    }

    const eqRows = await db.select().from(equipment).where(eq(equipment.id, String(equipmentId))).limit(1)
    if (!eqRows[0]) return NextResponse.json({ error: "Equipment not found." }, { status: 404 })
    if (eqRows[0].availableQuantity < qty) {
      return NextResponse.json(
        { error: `Only ${eqRows[0].availableQuantity} units available right now.` },
        { status: 400 }
      )
    }

    const id = `req_${Date.now()}`
    await db.insert(equipmentRequests).values({
      id,
      studentProfileId: String(studentProfileId),
      equipmentId: String(equipmentId),
      quantity: qty,
      purpose: purpose ?? null,
      expectedReturnDate: expectedReturnDate ? new Date(expectedReturnDate) : new Date(Date.now() + 4 * 3600 * 1000),
      status: "PENDING",
    })

    return NextResponse.json({ success: true, requestId: id }, { status: 201 })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to submit request."
    return NextResponse.json({ error: message }, { status: toStatus(error) })
  }
}
