import { NextResponse } from "next/server"
import { getDb } from "@/db/server"
import { equipment, equipmentRequests, equipmentTransactions } from "@/db/schema"
import { AuthError, requirePermission } from "@/lib/auth/server"
import { eq } from "drizzle-orm"

function toStatus(error: unknown): number {
  if (error instanceof AuthError) return error.status
  const message = error instanceof Error ? error.message : ""
  if (message.includes("Permission")) return 403
  if (message.includes("Authentication")) return 401
  return 500
}

const recalc = (row: typeof equipment.$inferSelect) => ({
  availableQuantity: Math.max(
    0,
    row.totalQuantity - row.issuedQuantity - row.damagedQuantity - row.lostQuantity - row.maintenanceQuantity
  ),
  status:
    Math.max(
      0,
      row.totalQuantity - row.issuedQuantity - row.damagedQuantity - row.lostQuantity - row.maintenanceQuantity
    ) > 0
      ? ("AVAILABLE" as const)
      : row.issuedQuantity > 0
        ? ("ISSUED" as const)
        : ("MAINTENANCE" as const),
})

/**
 * PATCH /api/equipment/requests/[id]
 * Body: { action: "approve" | "reject", reviewNotes?: string }
 * Approve path runs inside a db.transaction: request -> ISSUED,
 * transaction row created, availability decremented + invariant recalculated.
 */
export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const identity = await requirePermission("equipment.issue")
    const { id } = await params
    const body = await req.json()
    const action = String(body?.action ?? "").toLowerCase()
    if (!["approve", "reject"].includes(action)) {
      return NextResponse.json({ error: "Action must be 'approve' or 'reject'." }, { status: 400 })
    }

    const db = getDb()
    const reqRows = await db.select().from(equipmentRequests).where(eq(equipmentRequests.id, id)).limit(1)
    const existing = reqRows[0]
    if (!existing) return NextResponse.json({ error: "Request not found." }, { status: 404 })
    if (existing.status !== "PENDING") {
      return NextResponse.json({ error: `Request is already ${existing.status}.` }, { status: 409 })
    }

    if (action === "reject") {
      await db
        .update(equipmentRequests)
        .set({
          status: "REJECTED",
          reviewedBy: identity.id,
          reviewNotes: body?.reviewNotes ?? null,
          reviewedAt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(equipmentRequests.id, id))
      return NextResponse.json({ success: true, status: "REJECTED" })
    }

    // Approve + issue atomically.
    const result = await db.transaction(async (tx) => {
      const eqRows = await tx.select().from(equipment).where(eq(equipment.id, existing.equipmentId)).limit(1)
      const item = eqRows[0]
      if (!item) throw new Error("Associated equipment not found.")
      if (item.availableQuantity < existing.quantity) {
        throw new Error(`Insufficient stock. Only ${item.availableQuantity} available.`)
      }

      const issuedQuantity = item.issuedQuantity + existing.quantity
      const next = { ...item, issuedQuantity }
      const { availableQuantity, status } = recalc(next)
      await tx
        .update(equipment)
        .set({ issuedQuantity, availableQuantity, status, updatedAt: new Date() })
        .where(eq(equipment.id, item.id))

      const txnId = `txn_${Date.now()}`
      await tx.insert(equipmentTransactions).values({
        id: txnId,
        equipmentId: item.id,
        studentProfileId: existing.studentProfileId,
        requestId: existing.id,
        quantity: existing.quantity,
        issuedBy: identity.id,
        expectedReturnDate: existing.expectedReturnDate,
        conditionBefore: item.condition ?? "GOOD",
        status: "ISSUED",
      })

      await tx
        .update(equipmentRequests)
        .set({
          status: "ISSUED",
          reviewedBy: identity.id,
          reviewNotes: body?.reviewNotes ?? null,
          reviewedAt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(equipmentRequests.id, id))

      return txnId
    })

    return NextResponse.json({ success: true, status: "ISSUED", transactionId: result })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to review request."
    const status =
      message.includes("Insufficient stock") || message.includes("Associated equipment")
        ? 400
        : toStatus(error)
    return NextResponse.json({ error: message }, { status })
  }
}
