import { NextResponse } from "next/server"
import { getDb } from "@/db/server"
import { equipment, equipmentRequests, equipmentTransactions, studentProfiles } from "@/db/schema"
import { AuthError, requirePermission } from "@/lib/auth/server"
import { eq } from "drizzle-orm"

function toStatus(error: unknown): number {
  if (error instanceof AuthError) return error.status
  const message = error instanceof Error ? error.message : ""
  if (message.includes("Permission")) return 403
  if (message.includes("Authentication")) return 401
  return 500
}

/** POST /api/equipment/transactions — direct issue (no prior request). */
export async function POST(req: Request) {
  try {
    const identity = await requirePermission("equipment.issue")
    const body = await req.json()
    const { studentProfileId, equipmentId, quantity, expectedReturnDate, notes, requestId } = body ?? {}
    if (!studentProfileId || !equipmentId) {
      return NextResponse.json({ error: "Student and equipment are required." }, { status: 400 })
    }
    const qty = Number(quantity ?? 1)
    if (!Number.isInteger(qty) || qty < 1) {
      return NextResponse.json({ error: "Quantity must be a positive integer." }, { status: 400 })
    }

    const db = getDb()
    const txnId = await db.transaction(async (tx) => {
      const sRows = await tx
        .select()
        .from(studentProfiles)
        .where(eq(studentProfiles.id, String(studentProfileId)))
        .limit(1)
      if (!sRows[0]) throw new Error("Student profile not found.")

      const eqRows = await tx.select().from(equipment).where(eq(equipment.id, String(equipmentId))).limit(1)
      const item = eqRows[0]
      if (!item) throw new Error("Equipment not found.")
      if (item.availableQuantity < qty) {
        throw new Error(`Insufficient stock. Only ${item.availableQuantity} available, requested ${qty}.`)
      }

      const issuedQuantity = item.issuedQuantity + qty
      const availableQuantity = Math.max(
        0,
        item.totalQuantity - issuedQuantity - item.damagedQuantity - item.lostQuantity - item.maintenanceQuantity
      )
      await tx
        .update(equipment)
        .set({
          issuedQuantity,
          availableQuantity,
          status: availableQuantity === 0 ? "ISSUED" : "AVAILABLE",
          updatedAt: new Date(),
        })
        .where(eq(equipment.id, item.id))

      const id = `txn_${Date.now()}`
      await tx.insert(equipmentTransactions).values({
        id,
        equipmentId: item.id,
        studentProfileId: String(studentProfileId),
        requestId: requestId ?? null,
        quantity: qty,
        issuedBy: identity.id,
        expectedReturnDate: expectedReturnDate ? new Date(expectedReturnDate) : new Date(Date.now() + 4 * 3600 * 1000),
        conditionBefore: item.condition ?? "GOOD",
        status: "ISSUED",
        notes: notes ?? null,
      })

      if (requestId) {
        await tx
          .update(equipmentRequests)
          .set({ status: "ISSUED", reviewedBy: identity.id, reviewedAt: new Date(), updatedAt: new Date() })
          .where(eq(equipmentRequests.id, String(requestId)))
      }
      return id
    })

    return NextResponse.json({ success: true, transactionId: txnId }, { status: 201 })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to issue equipment."
    const status =
      message.includes("not found") || message.includes("Insufficient stock") ? 400 : toStatus(error)
    return NextResponse.json({ error: message }, { status })
  }
}
