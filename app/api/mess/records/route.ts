import { NextResponse } from "next/server"
import { getDb } from "@/db/server"
import {
  mealPickupDelegations,
  messDistributionRecords,
  messDistributions,
  messItems,
  rooms,
  studentProfiles,
  users,
} from "@/db/schema"
import { AuthError, getEffectiveRoles, requirePermission } from "@/lib/auth/server"
import { and, desc, eq } from "drizzle-orm"
import { randomUUID } from "crypto"

function iso(d: Date | null | undefined) {
  return d ? new Date(d).toISOString() : new Date().toISOString()
}

export async function GET(req: Request) {
  try {
    const identity = await requirePermission("mess.view")
    const db = getDb()
    const roles = await getEffectiveRoles(identity)
    const residentOnly = roles.length === 1 && roles[0] === "STUDENT"
    const { searchParams } = new URL(req.url)
    const date = searchParams.get("date") ?? undefined
    const mealType = searchParams.get("mealType") ?? undefined

    const rows = await db
      .select({
        record: messDistributionRecords,
        item: messItems,
        recorder: users,
      })
      .from(messDistributionRecords)
      .leftJoin(messItems, eq(messDistributionRecords.messItemId, messItems.id))
      .leftJoin(users, eq(messDistributionRecords.recordedBy, users.id))
      .orderBy(desc(messDistributionRecords.distributedAt))

    const profileRows = await db
      .select({ profile: studentProfiles, user: users, room: rooms })
      .from(studentProfiles)
      .leftJoin(users, eq(studentProfiles.userId, users.id))
      .leftJoin(rooms, eq(studentProfiles.roomId, rooms.id))
    const profileMap = new Map(profileRows.map((p) => [p.profile.id, p]))

    let records = rows.map(({ record, item, recorder }) => {
      const p = profileMap.get(record.studentProfileId)
      return {
        id: record.id,
        distributionId: record.distributionId,
        studentProfileId: record.studentProfileId,
        studentName: p?.user?.name ?? "Unknown",
        studentId: p?.profile.studentId ?? "",
        roomId: record.roomId,
        roomNumber: p?.room?.roomNumber ?? null,
        mealType: record.mealType,
        messItemId: record.messItemId,
        messItemName: item?.name ?? "Unknown item",
        messCategory: item?.category ?? "VEG",
        distributionDate: record.distributionDate,
        status: record.status,
        distributedAt: iso(record.distributedAt),
        recordedBy: record.recordedBy,
        recordedByName: recorder?.name ?? "Unknown",
        notes: record.notes,
        createdAt: iso(record.createdAt),
        collectionType: record.collectionType,
        collectorStudentProfileId: record.collectorStudentProfileId,
        delegationId: record.delegationId,
      }
    })
    if (date) records = records.filter((r) => r.distributionDate === date)
    if (mealType && mealType !== "ALL") records = records.filter((r) => r.mealType === mealType)
    if (residentOnly) {
      const mine = await db.select({ id: studentProfiles.id })
        .from(studentProfiles).where(eq(studentProfiles.userId, identity.id)).limit(1)
      const profileId = mine[0]?.id
      records = profileId ? records.filter((r) => r.studentProfileId === profileId) : []
    }
    return NextResponse.json({ records })
  } catch (error) {
    const status = error instanceof AuthError ? error.status : 500
    const message = error instanceof Error ? error.message : "Unable to load records."
    return NextResponse.json({ error: message }, { status })
  }
}

type PostBody = {
  distributionId?: string
  studentProfileId?: string
  beneficiaryStudentProfileId?: string
  collectorStudentProfileId?: string
  status?: string
  notes?: string
}

export async function POST(req: Request) {
  try {
    const actor = await requirePermission("mess.distribute")
    const body = (await req.json()) as PostBody
    const distributionId = body.distributionId?.trim()
    if (!distributionId) return NextResponse.json({ error: "distributionId is required." }, { status: 400 })

    // Proxy if beneficiary fields present, else self handout
    const beneficiaryId = (body.beneficiaryStudentProfileId ?? body.studentProfileId ?? "").trim()
    if (!beneficiaryId) return NextResponse.json({ error: "studentProfileId is required." }, { status: 400 })
    const collectorId = body.collectorStudentProfileId?.trim() || null
    const isProxy = !!body.beneficiaryStudentProfileId || (!!collectorId && collectorId !== beneficiaryId)

    const db = getDb()
    const distRows = await db
      .select()
      .from(messDistributions)
      .where(eq(messDistributions.id, distributionId))
      .limit(1)
    const dist = distRows[0]
    if (!dist) return NextResponse.json({ error: "Mess session not found." }, { status: 404 })

    const benRows = await db
      .select({ profile: studentProfiles, user: users })
      .from(studentProfiles)
      .leftJoin(users, eq(studentProfiles.userId, users.id))
      .where(eq(studentProfiles.id, beneficiaryId))
      .limit(1)
    const ben = benRows[0]
    if (!ben) return NextResponse.json({ error: "Student not found." }, { status: 404 })

    let collector = null as { id: string; name: string } | null
    if (collectorId) {
      const colRows = await db
        .select({ profile: studentProfiles, user: users })
        .from(studentProfiles)
        .leftJoin(users, eq(studentProfiles.userId, users.id))
        .where(eq(studentProfiles.id, collectorId))
        .limit(1)
      const col = colRows[0]
      if (!col) return NextResponse.json({ error: "Collector student not found." }, { status: 404 })
      collector = { id: col.profile.id, name: col.user?.name ?? "Unknown" }
      if (isProxy && collector.id === beneficiaryId) {
        return NextResponse.json(
          { error: "Collector must be different from beneficiary for proxy pickup." },
          { status: 400 }
        )
      }
    }

    // Unique (distributionDate, mealType, messItemId, studentProfileId) — duplicate → 409
    const dup = await db
      .select({ id: messDistributionRecords.id, at: messDistributionRecords.distributedAt })
      .from(messDistributionRecords)
      .where(
        and(
          eq(messDistributionRecords.distributionDate, dist.distributionDate),
          eq(messDistributionRecords.mealType, dist.mealType),
          eq(messDistributionRecords.messItemId, dist.messItemId),
          eq(messDistributionRecords.studentProfileId, beneficiaryId)
        )
      )
      .limit(1)
    if (dup[0]) {
      return NextResponse.json(
        { error: `Meal already recorded for ${ben.user?.name ?? "student"} at ${iso(dup[0].at)}.`, duplicate: true },
        { status: 409 }
      )
    }

    let delegationId: string | null = null
    if (isProxy && collector) {
      // Prevent double delegation; find active one for this beneficiary+distribution
      const existing = await db
        .select()
        .from(mealPickupDelegations)
        .where(
          and(
            eq(mealPickupDelegations.distributionId, dist.id),
            eq(mealPickupDelegations.beneficiaryStudentProfileId, beneficiaryId),
            eq(mealPickupDelegations.status, "ACTIVE")
          )
        )
        .limit(1)
      if (existing[0] && existing[0].collectorStudentProfileId !== collector.id) {
        return NextResponse.json(
          { error: "An active pickup delegation already exists for this meal." },
          { status: 409 }
        )
      }
      if (existing[0]) {
        delegationId = existing[0].id
      } else {
        const [deleg] = await db
          .insert(mealPickupDelegations)
          .values({
            id: randomUUID(),
            beneficiaryStudentProfileId: beneficiaryId,
            collectorStudentProfileId: collector.id,
            distributionId: dist.id,
            distributionDate: dist.distributionDate,
            mealType: dist.mealType,
            status: "ACTIVE",
            requestedBy: actor.id,
            recordedBy: actor.id,
          })
          .returning()
        delegationId = deleg.id
      }
    }

    const collectionType = isProxy && collector ? "PROXY" : "SELF"
    let recordRow
    try {
      const [inserted] = await db
        .insert(messDistributionRecords)
        .values({
          id: randomUUID(),
          distributionId: dist.id,
          studentProfileId: beneficiaryId,
          roomId: ben.profile.roomId,
          messItemId: dist.messItemId,
          mealType: dist.mealType,
          distributionDate: dist.distributionDate,
          status: "RECEIVED",
          recordedBy: actor.id,
          collectionType: collectionType as "SELF" | "PROXY",
          collectorStudentProfileId: collector ? collector.id : beneficiaryId,
          delegationId,
          notes: isProxy && collector
            ? `Collected on behalf of ${ben.user?.name ?? "beneficiary"} by ${collector.name}.`
            : (body.notes ?? null),
        })
        .returning()
      recordRow = inserted
    } catch (e) {
      const msg = e instanceof Error ? e.message : ""
      if (/unique|duplicate/i.test(msg)) {
        return NextResponse.json({ error: "Meal already recorded for this student.", duplicate: true }, { status: 409 })
      }
      throw e
    }

    // Consume delegation on use; bump distributed counter
    if (delegationId) {
      await db
        .update(mealPickupDelegations)
        .set({ status: "CONSUMED", recordedBy: actor.id, collectedAt: new Date(), updatedAt: new Date() })
        .where(eq(mealPickupDelegations.id, delegationId))
    }
    await db
      .update(messDistributions)
      .set({ totalDistributed: (dist.totalDistributed ?? 0) + 1 })
      .where(eq(messDistributions.id, dist.id))

    const itemRows = await db.select().from(messItems).where(eq(messItems.id, dist.messItemId)).limit(1)
    const item = itemRows[0]
    return NextResponse.json(
      {
        record: {
          id: recordRow.id,
          distributionId: recordRow.distributionId,
          studentProfileId: recordRow.studentProfileId,
          studentName: ben.user?.name ?? "Unknown",
          studentId: ben.profile.studentId,
          mealType: recordRow.mealType,
          messItemId: recordRow.messItemId,
          messItemName: item?.name ?? "Unknown item",
          messCategory: item?.category ?? "VEG",
          distributionDate: recordRow.distributionDate,
          status: recordRow.status,
          distributedAt: iso(recordRow.distributedAt),
          recordedBy: recordRow.recordedBy,
          recordedByName: actor.name,
          collectionType: recordRow.collectionType,
          collectorStudentProfileId: recordRow.collectorStudentProfileId,
          delegationId: recordRow.delegationId,
        },
        delegationId,
      },
      { status: 201 }
    )
  } catch (error) {
    const status = error instanceof AuthError ? error.status : 500
    const message = error instanceof Error ? error.message : "Unable to record meal."
    return NextResponse.json({ error: message }, { status })
  }
}
