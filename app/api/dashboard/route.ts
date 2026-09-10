import { NextResponse } from "next/server"
import { getDb } from "@/db/server"
import {
  auditLogs,
  complaints,
  complaintCategories,
  equipment,
  equipmentRequests,
  equipmentTransactions,
  messDistributions,
  notices,
  rooms,
  studentProfiles,
  users,
} from "@/db/schema"
import { AuthError, requireAnyPermission } from "@/lib/auth/server"
import { desc, eq } from "drizzle-orm"

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
    await requireAnyPermission(["students.view", "rooms.view", "reports.view"])
    const db = getDb()

    // Sequential reads: the shared pooler chokes when many dashboard
    // requests each burst 8 parallel queries at once. Each table here is
    // tiny, so sequential still resolves in ~1s with zero pool pressure.
    const profiles = await db.select().from(studentProfiles)
    const roomRows = await db.select().from(rooms)
    const equipRows = await db.select().from(equipment)
    const reqRows = await db.select().from(equipmentRequests)
    const txnRows = await db
      .select({ txn: equipmentTransactions, equip: equipment, profile: studentProfiles, user: users })
      .from(equipmentTransactions)
      .leftJoin(equipment, eq(equipmentTransactions.equipmentId, equipment.id))
      .leftJoin(studentProfiles, eq(equipmentTransactions.studentProfileId, studentProfiles.id))
      .leftJoin(users, eq(studentProfiles.userId, users.id))
      .orderBy(desc(equipmentTransactions.issuedAt))
      .limit(10)
    const complaintRows = await db
      .select({ complaint: complaints, category: complaintCategories, profile: studentProfiles, user: users, room: rooms })
      .from(complaints)
      .leftJoin(complaintCategories, eq(complaints.categoryId, complaintCategories.id))
      .leftJoin(studentProfiles, eq(complaints.studentProfileId, studentProfiles.id))
      .leftJoin(users, eq(studentProfiles.userId, users.id))
      .leftJoin(rooms, eq(complaints.roomId, rooms.id))
      .orderBy(desc(complaints.createdAt))
      .limit(10)
    const distRows = await db.select().from(messDistributions).orderBy(desc(messDistributions.createdAt)).limit(10)
    const noticeRows = await db
      .select({ notice: notices, author: users })
      .from(notices)
      .leftJoin(users, eq(notices.authorId, users.id))
      .orderBy(desc(notices.publishedAt))
      .limit(5)

    const byStatus: Record<string, number> = {}
    for (const p of profiles) byStatus[p.approvalStatus] = (byStatus[p.approvalStatus] ?? 0) + 1

    const occupancyByRoom: Record<string, number> = {}
    for (const p of profiles) {
      if (p.roomId) occupancyByRoom[p.roomId] = (occupancyByRoom[p.roomId] ?? 0) + 1
    }
    const occupiedBeds = Object.values(occupancyByRoom).reduce((a, b) => a + b, 0)
    const capacity = roomRows.reduce((a, r) => a + (r.capacity ?? 2), 0)

    const totalEquipment = equipRows.reduce((a, e) => a + (e.totalQuantity ?? 0), 0)
    const issuedEquipment = equipRows.reduce((a, e) => a + (e.issuedQuantity ?? 0), 0)
    const pendingRequests = reqRows.filter((r) => r.status === "PENDING").length

    const today = new Date().toISOString().split("T")[0]
    const todayDistributions = distRows
      .filter((d) => d.distributionDate === today)
      .map((d) => ({
        id: d.id,
        title: d.title,
        mealType: d.mealType,
        distributionDate: d.distributionDate,
        totalExpected: d.totalExpected,
        totalDistributed: d.totalDistributed,
        status: d.status,
      }))

    const openStatuses = ["OPEN", "ACKNOWLEDGED", "IN_PROGRESS"]
    const allComplaints = complaintRows.map(({ complaint: c, category, user, room }) => ({
      id: c.id,
      ticketNumber: c.ticketNumber,
      title: c.title,
      description: c.description,
      priority: c.priority,
      status: c.status,
      categoryName: category?.name ?? "General",
      studentName: user?.name ?? "Unknown",
      studentId: "",
      roomNumber: room?.roomNumber ?? null,
      createdAt: iso(c.createdAt),
    }))

    return NextResponse.json({
      students: {
        total: profiles.length,
        approved: byStatus.APPROVED ?? 0,
        pending: byStatus.PENDING ?? 0,
        rejected: byStatus.REJECTED ?? 0,
        suspended: byStatus.SUSPENDED ?? 0,
      },
      rooms: {
        total: roomRows.length,
        capacity,
        occupied: occupiedBeds,
        rate: capacity ? Math.round((occupiedBeds / capacity) * 100) : 0,
        list: roomRows.map((r) => ({
          id: r.id,
          roomNumber: r.roomNumber,
          block: r.block,
          floor: r.floor,
          capacity: r.capacity,
          occupancy: occupancyByRoom[r.id] ?? 0,
          status: r.status,
        })),
      },
      equipment: {
        totalUnits: totalEquipment,
        issued: issuedEquipment,
        pendingRequests,
        transactions: txnRows.map(({ txn, equip, user }) => ({
          id: txn.id,
          equipmentName: equip?.name ?? "Unknown",
          quantity: txn.quantity,
          studentName: user?.name ?? "Unknown",
          studentId: "",
          roomNumber: null,
          status: txn.status,
          issuedAt: iso(txn.issuedAt),
          expectedReturnDate: iso(txn.expectedReturnDate),
          actualReturnDate: iso(txn.actualReturnDate),
          conditionAfter: txn.conditionAfter,
          fineAmount: txn.fineAmount,
        })),
      },
      complaints: {
        total: allComplaints.length,
        open: allComplaints.filter((c) => openStatuses.includes(c.status)).length,
        urgent: allComplaints.filter((c) => c.priority === "URGENT" && c.status !== "CLOSED").length,
        list: allComplaints,
      },
      mess: { today: todayDistributions, totalToday: todayDistributions.length },
      notices: noticeRows.map(({ notice: n }) => ({
        id: n.id,
        title: n.title,
        content: n.content,
        category: n.category,
        priority: n.priority,
        publishedAt: iso(n.publishedAt),
      })),
      transactions: txnRows.map(({ txn, equip, user }) => ({
        id: txn.id,
        equipmentName: equip?.name ?? "Unknown",
        quantity: txn.quantity,
        studentName: user?.name ?? "Unknown",
        studentId: "",
        roomNumber: null,
        status: txn.status,
        issuedAt: iso(txn.issuedAt),
        expectedReturnDate: iso(txn.expectedReturnDate),
      })),
      auditCount: (await db.select({ id: auditLogs.id }).from(auditLogs).limit(1)).length,
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to load dashboard."
    return NextResponse.json({ error: message }, { status: errStatus(error) })
  }
}
