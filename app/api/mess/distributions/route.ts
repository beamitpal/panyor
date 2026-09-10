import { NextResponse } from "next/server"
import { getDb } from "@/db/server"
import {
  messDistributions,
  messDistributionRecords,
  messItems,
  rooms,
  studentProfiles,
  users,
} from "@/db/schema"
import { AuthError, requirePermission } from "@/lib/auth/server"
import { desc, eq, sql } from "drizzle-orm"
import { randomUUID } from "crypto"

const VALID_MEALS = ["BREAKFAST", "LUNCH", "SNACKS", "DINNER"] as const

export async function GET(req: Request) {
  try {
    await requirePermission("mess.view")
    const db = getDb()
    const { searchParams } = new URL(req.url)
    const date = searchParams.get("date") ?? undefined
    const mealType = searchParams.get("mealType") ?? undefined

    const rows = await db
      .select({ dist: messDistributions, item: messItems, creator: users })
      .from(messDistributions)
      .leftJoin(messItems, eq(messDistributions.messItemId, messItems.id))
      .leftJoin(users, eq(messDistributions.createdBy, users.id))
      .orderBy(desc(messDistributions.createdAt))

    // Distributed counts computed from records
    const counts = await db
      .select({
        distributionId: messDistributionRecords.distributionId,
        count: sql<number>`count(*)::int`,
      })
      .from(messDistributionRecords)
      .groupBy(messDistributionRecords.distributionId)
    const countMap = new Map(counts.map((c) => [c.distributionId, Number(c.count)]))

    let distributions = rows.map(({ dist, item, creator }) => ({
      id: dist.id,
      mealType: dist.mealType,
      messItemId: dist.messItemId,
      messItemName: item?.name ?? "Unknown item",
      messCategory: item?.category ?? "VEG",
      distributionDate: dist.distributionDate,
      title: dist.title,
      description: dist.description,
      totalExpected: dist.totalExpected,
      totalDistributed: countMap.get(dist.id) ?? dist.totalDistributed ?? 0,
      status: dist.status,
      createdByName: creator?.name ?? null,
      createdAt: dist.createdAt.toISOString(),
    }))
    if (date) distributions = distributions.filter((d) => d.distributionDate === date)
    if (mealType && mealType !== "ALL") distributions = distributions.filter((d) => d.mealType === mealType)

    // Terminal data: rooms with resident occupants
    const roomRows = await db.select().from(rooms).orderBy(rooms.roomNumber)
    const profileRows = await db
      .select({ profile: studentProfiles, user: users, room: rooms })
      .from(studentProfiles)
      .leftJoin(users, eq(studentProfiles.userId, users.id))
      .leftJoin(rooms, eq(studentProfiles.roomId, rooms.id))

    const roomsOut = roomRows.map((r) => {
      const occupants = profileRows.filter((p) => p.profile.roomId === r.id)
      return {
        id: r.id,
        roomNumber: r.roomNumber,
        block: r.block,
        students: occupants.map((o) => ({
          id: o.profile.id,
          name: o.user?.name ?? "Unknown",
          studentId: o.profile.studentId,
          avatarUrl: o.profile.avatarUrl,
          bedNumber: o.profile.bedNumber ?? 1,
        })),
      }
    })

    const students = profileRows.map((p) => ({
      id: p.profile.id,
      name: p.user?.name ?? "Unknown",
      studentId: p.profile.studentId,
      roomNumber: p.room?.roomNumber ?? null,
      approvalStatus: p.profile.approvalStatus,
    }))

    return NextResponse.json({ distributions, rooms: roomsOut, students })
  } catch (error) {
    const status = error instanceof AuthError ? error.status : 500
    const message = error instanceof Error ? error.message : "Unable to load distributions."
    return NextResponse.json({ error: message }, { status })
  }
}

export async function POST(req: Request) {
  try {
    const actor = await requirePermission("mess.manage")
    const body = (await req.json()) as {
      title?: string
      mealType?: string
      distributionDate?: string
      messItemId?: string
      description?: string
    }
    const title = (body.title ?? "").trim()
    if (!title) return NextResponse.json({ error: "Session title is required." }, { status: 400 })
    const mealType = (body.mealType ?? "").toUpperCase()
    if (!VALID_MEALS.includes(mealType as (typeof VALID_MEALS)[number])) {
      return NextResponse.json({ error: "Invalid meal type." }, { status: 400 })
    }
    const distributionDate = (body.distributionDate ?? "").trim()
    if (!/^\d{4}-\d{2}-\d{2}$/.test(distributionDate)) {
      return NextResponse.json({ error: "distributionDate must be YYYY-MM-DD." }, { status: 400 })
    }
    if (!body.messItemId) return NextResponse.json({ error: "messItemId is required." }, { status: 400 })

    const db = getDb()
    const itemRows = await db.select().from(messItems).where(eq(messItems.id, body.messItemId)).limit(1)
    const item = itemRows[0]
    if (!item) return NextResponse.json({ error: "Mess food item not found." }, { status: 404 })

    const approved = await db
      .select({ id: studentProfiles.id })
      .from(studentProfiles)
      .where(eq(studentProfiles.approvalStatus, "APPROVED"))

    const [dist] = await db
      .insert(messDistributions)
      .values({
        id: randomUUID(),
        distributionDate,
        mealType: mealType as (typeof VALID_MEALS)[number],
        messItemId: item.id,
        title,
        description: body.description?.trim() || null,
        totalExpected: approved.length,
        totalDistributed: 0,
        status: "ACTIVE",
        createdBy: actor.id,
      })
      .returning()

    return NextResponse.json(
      {
        session: {
          id: dist.id,
          mealType: dist.mealType,
          messItemId: dist.messItemId,
          messItemName: item.name,
          messCategory: item.category,
          distributionDate: dist.distributionDate,
          title: dist.title,
          description: dist.description,
          totalExpected: dist.totalExpected,
          totalDistributed: 0,
          status: dist.status,
          createdByName: actor.name,
          createdAt: dist.createdAt.toISOString(),
        },
      },
      { status: 201 }
    )
  } catch (error) {
    const status = error instanceof AuthError ? error.status : 500
    const message = error instanceof Error ? error.message : "Unable to create session."
    return NextResponse.json({ error: message }, { status })
  }
}
