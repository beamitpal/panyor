import { NextResponse } from "next/server"
import { getDb } from "@/db/server"
import {
  equipment,
  equipmentCategories,
  equipmentRequests,
  equipmentTransactions,
  studentProfiles,
  users,
} from "@/db/schema"
import { AuthError, getEffectiveRoles, requirePermission } from "@/lib/auth/server"
import { eq, desc } from "drizzle-orm"

const iso = (d: Date | string | null | undefined) =>
  d == null ? null : d instanceof Date ? d.toISOString() : new Date(d).toISOString()

function toStatus(error: unknown): number {
  if (error instanceof AuthError) return error.status
  const message = error instanceof Error ? error.message : ""
  if (message.includes("Permission")) return 403
  if (message.includes("Authentication")) return 401
  return 500
}

/**
 * GET /api/equipment — full inventory desk payload.
 * Joins equipment -> category, requests/transactions -> student profile + user name.
 */
export async function GET() {
  try {
    const identity = await requirePermission("equipment.view")
    const db = getDb()
    const roles = await getEffectiveRoles(identity)
    const isResidentOnly = roles.includes("STUDENT") && !roles.some((r) => ["CARETAKER", "MESS_COMMITTEE", "SPORTS_COMMITTEE", "PRESIDENT", "DEPUTY_WARDEN", "WARDEN", "SUPER_ADMIN"].includes(r))

    const [eqRows, catRows, reqRows, txnRows] = await Promise.all([
      db
        .select({ item: equipment, categoryName: equipmentCategories.name })
        .from(equipment)
        .leftJoin(equipmentCategories, eq(equipment.categoryId, equipmentCategories.id))
        .orderBy(desc(equipment.createdAt)),
      db.select().from(equipmentCategories).orderBy(equipmentCategories.name),
      db
        .select({
          request: equipmentRequests,
          studentName: users.name,
          studentId: studentProfiles.studentId,
          equipmentName: equipment.name,
          equipmentCode: equipment.code,
        })
        .from(equipmentRequests)
        .leftJoin(studentProfiles, eq(equipmentRequests.studentProfileId, studentProfiles.id))
        .leftJoin(users, eq(studentProfiles.userId, users.id))
        .leftJoin(equipment, eq(equipmentRequests.equipmentId, equipment.id))
        .orderBy(desc(equipmentRequests.createdAt)),
      db
        .select({
          txn: equipmentTransactions,
          studentName: users.name,
          studentId: studentProfiles.studentId,
          equipmentName: equipment.name,
        })
        .from(equipmentTransactions)
        .leftJoin(studentProfiles, eq(equipmentTransactions.studentProfileId, studentProfiles.id))
        .leftJoin(users, eq(studentProfiles.userId, users.id))
        .leftJoin(equipment, eq(equipmentTransactions.equipmentId, equipment.id))
        .orderBy(desc(equipmentTransactions.createdAt)),
    ])

    let safeRequests = reqRows
    let safeTransactions = txnRows
    if (isResidentOnly) {
      const profile = await db.select({ id: studentProfiles.id })
        .from(studentProfiles).where(eq(studentProfiles.userId, identity.id)).limit(1)
      const profileId = profile[0]?.id
      safeRequests = profileId ? reqRows.filter((r) => r.request.studentProfileId === profileId) : []
      safeTransactions = profileId ? txnRows.filter((r) => r.txn.studentProfileId === profileId) : []
    }

    return NextResponse.json({
      equipment: eqRows.map(({ item, categoryName }) => ({
        ...item,
        categoryName: categoryName ?? "General",
        purchaseDate: iso(item.purchaseDate),
        createdAt: iso(item.createdAt),
        updatedAt: iso(item.updatedAt),
      })),
      categories: catRows.map((c) => ({
        ...c,
        createdAt: iso(c.createdAt),
      })),
      requests: safeRequests.map(({ request, studentName, studentId, equipmentName, equipmentCode }) => ({
        ...request,
        studentName: studentName ?? "Unknown",
        studentId: studentId ?? "",
        equipmentName: equipmentName ?? "Unknown",
        equipmentCode: equipmentCode ?? "",
        expectedReturnDate: iso(request.expectedReturnDate),
        reviewedAt: iso(request.reviewedAt),
        createdAt: iso(request.createdAt),
        updatedAt: iso(request.updatedAt),
        requestedAt: iso(request.createdAt),
      })),
      transactions: safeTransactions.map(({ txn, studentName, studentId, equipmentName }) => ({
        ...txn,
        studentName: studentName ?? "Unknown",
        studentId: studentId ?? "",
        equipmentName: equipmentName ?? "Unknown",
        issuedAt: iso(txn.issuedAt),
        expectedReturnDate: iso(txn.expectedReturnDate),
        actualReturnDate: iso(txn.actualReturnDate),
        createdAt: iso(txn.createdAt),
        updatedAt: iso(txn.updatedAt),
      })),
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to load equipment."
    return NextResponse.json({ error: message }, { status: toStatus(error) })
  }
}

/** POST /api/equipment — add a new inventory item. */
export async function POST(req: Request) {
  try {
    await requirePermission("equipment.create")
    const body = await req.json()
    const { name, code, categoryId, description, totalQuantity, condition, replacementCost } = body ?? {}

    if (!name || !code) {
      return NextResponse.json(
        { error: "Please provide equipment name and unique inventory code." },
        { status: 400 }
      )
    }
    if (!categoryId) {
      return NextResponse.json({ error: "Category is required." }, { status: 400 })
    }
    const total = Number(totalQuantity ?? 1)
    if (!Number.isInteger(total) || total < 1) {
      return NextResponse.json({ error: "Total quantity must be a positive integer." }, { status: 400 })
    }

    const db = getDb()
    const cats = await db
      .select()
      .from(equipmentCategories)
      .where(eq(equipmentCategories.id, String(categoryId)))
      .limit(1)
    if (!cats[0]) return NextResponse.json({ error: "Category not found." }, { status: 404 })

    const normalizedCode = String(code).toUpperCase()
    const existing = await db.select({ id: equipment.id }).from(equipment).where(eq(equipment.code, normalizedCode)).limit(1)
    if (existing[0]) {
      return NextResponse.json({ error: `Equipment code ${normalizedCode} already exists.` }, { status: 409 })
    }

    const id = `eq_${Date.now()}`
    await db.insert(equipment).values({
      id,
      categoryId: String(categoryId),
      name: String(name),
      code: normalizedCode,
      description: description ?? null,
      totalQuantity: total,
      availableQuantity: total,
      issuedQuantity: 0,
      damagedQuantity: 0,
      lostQuantity: 0,
      maintenanceQuantity: 0,
      condition: condition ?? "GOOD",
      status: "AVAILABLE",
      replacementCost: Number(replacementCost ?? 0),
    })

    return NextResponse.json({ success: true, id }, { status: 201 })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to create equipment."
    return NextResponse.json({ error: message }, { status: toStatus(error) })
  }
}
