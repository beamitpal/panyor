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

const recalc = (row: typeof equipment.$inferSelect) => {
  const available = Math.max(
    0,
    row.totalQuantity - row.issuedQuantity - row.damagedQuantity - row.lostQuantity - row.maintenanceQuantity
  )
  return {
    availableQuantity: available,
    status: (available > 0 ? "AVAILABLE" : row.issuedQuantity > 0 ? "ISSUED" : "MAINTENANCE") as
      | "AVAILABLE"
      | "ISSUED"
      | "MAINTENANCE",
  }
};

/**
 * PATCH /api/equipment/transactions/[id]
 * Body:
 *  - { action: "return", conditionAfter, damageNotes?, fineAmount? }
 *  - { action: "lost", fineAmount?, notes? }
 * Direct issue is POST /api/equipment/transactions (same file, exported below
 * via route.ts convention — see POST handler).
 */
export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const identity = await requirePermission("equipment.return")
    const { id } = await params
    const body = await req.json()
    const action = String(body?.action ?? "return").toLowerCase()
    if (!["return", "lost"].includes(action)) {
      return NextResponse.json({ error: "Action must be 'return' or 'lost'." }, { status: 400 })
    }

    const db = getDb()
    const txnRows = await db.select().from(equipmentTransactions).where(eq(equipmentTransactions.id, id)).limit(1)
    const txn = txnRows[0]
    if (!txn) return NextResponse.json({ error: "Transaction not found." }, { status: 404 })
    if (txn.status === "RETURNED") {
      return NextResponse.json({ error: "This item has already been marked as returned." }, { status: 409 })
    }

    await db.transaction(async (tx) => {
      const eqRows = await tx.select().from(equipment).where(eq(equipment.id, txn.equipmentId)).limit(1)
      const item = eqRows[0]
      if (!item) throw new Error("Associated equipment not found.")

      const issuedQuantity = Math.max(0, item.issuedQuantity - txn.quantity)

      if (action === "lost") {
        const lostQuantity = item.lostQuantity + txn.quantity
        const next = { ...item, issuedQuantity, lostQuantity }
        const { availableQuantity, status } = recalc(next)
        await tx
          .update(equipment)
          .set({ issuedQuantity, lostQuantity, availableQuantity, status, updatedAt: new Date() })
          .where(eq(equipment.id, item.id))
        await tx
          .update(equipmentTransactions)
          .set({
            status: "LOST",
            fineAmount: Number(body?.fineAmount ?? item.replacementCost ?? 0),
            notes: body?.notes ?? txn.notes,
            updatedAt: new Date(),
          })
          .where(eq(equipmentTransactions.id, id))
      } else {
        const conditionAfter = body?.conditionAfter ?? "GOOD"
        const isDamaged = conditionAfter === "DAMAGED"
        const damagedQuantity = isDamaged ? item.damagedQuantity + txn.quantity : item.damagedQuantity
        // Invariant: available = total - issued - damaged - lost - maintenance.
        // Good returns flow back to available; damaged units move to damagedQuantity.
        const base = { ...item, issuedQuantity, damagedQuantity }
        const { availableQuantity, status } = recalc(base)
        await tx
          .update(equipment)
          .set({
            issuedQuantity,
            damagedQuantity,
            availableQuantity: Math.max(0, availableQuantity),
            status,
            updatedAt: new Date(),
          })
          .where(eq(equipment.id, item.id))
        await tx
          .update(equipmentTransactions)
          .set({
            status: isDamaged ? "DAMAGED" : "RETURNED",
            actualReturnDate: new Date(),
            returnedTo: identity.id,
            conditionAfter,
            damageNotes: isDamaged ? (body?.damageNotes ?? null) : null,
            fineAmount: Number(body?.fineAmount ?? 0),
            updatedAt: new Date(),
          })
          .where(eq(equipmentTransactions.id, id))
      }

      if (txn.requestId) {
        await tx
          .update(equipmentRequests)
          .set({ status: "RETURNED", updatedAt: new Date() })
          .where(eq(equipmentRequests.id, txn.requestId))
      }
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to process return."
    const status = message.includes("Associated equipment") ? 400 : toStatus(error)
    return NextResponse.json({ error: message }, { status })
  }
}
