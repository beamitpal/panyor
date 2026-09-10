import { NextResponse } from "next/server"
import { headers } from "next/headers"
import { z } from "zod"
import { and, eq } from "drizzle-orm"
import { auth } from "@/auth"
import { getDb } from "@/db/server"
import { mealPickupDelegations, messDistributionRecords, messDistributions, studentProfiles } from "@/db/schema"
import { requireApprovedAuth } from "@/lib/auth/server"

const createSchema = z.object({
  distributionId: z.string().min(1),
  collectorStudentProfileId: z.string().min(1),
})

function errStatus(error: unknown) {
  const msg = error instanceof Error ? error.message : ""
  if (msg.includes("Permission")) return 403
  if (msg.includes("Authentication")) return 401
  return 500
}

/** My delegations (as beneficiary): active + history. */
export async function GET() {
  try {
    await requireApprovedAuth()
    const session = await auth.api.getSession({ headers: await headers() })
    if (!session?.user) return NextResponse.json({ error: "Authentication required." }, { status: 401 })
    const db = getDb()
    const mine = await db
      .select({ id: studentProfiles.id })
      .from(studentProfiles)
      .where(eq(studentProfiles.userId, session.user.id))
      .limit(1)
    if (!mine[0]) return NextResponse.json({ delegations: [] })
    const rows = await db
      .select()
      .from(mealPickupDelegations)
      .where(eq(mealPickupDelegations.beneficiaryStudentProfileId, mine[0].id))
    return NextResponse.json({ delegations: rows, profileId: mine[0].id })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to load delegations."
    return NextResponse.json({ error: message }, { status: errStatus(error) })
  }
}

/**
 * Student books a proxy collector in advance (prior delegation).
 * Staff recording same-day proxy pickups go through /api/mess/records.
 */
export async function POST(request: Request) {
  try {
    await requireApprovedAuth()
    const session = await auth.api.getSession({ headers: await headers() })
    if (!session?.user) return NextResponse.json({ error: "Authentication required." }, { status: 401 })
    const body = createSchema.parse(await request.json())
    const db = getDb()

    const dist = await db.select().from(messDistributions).where(eq(messDistributions.id, body.distributionId)).limit(1)
    const distRow = dist[0]
    if (!distRow) return NextResponse.json({ error: "Meal session not found." }, { status: 404 })

    const mine = await db.select().from(studentProfiles).where(eq(studentProfiles.userId, session.user.id)).limit(1)
    const beneficiary = mine[0]
    if (!beneficiary) return NextResponse.json({ error: "Student profile not found." }, { status: 404 })
    if (beneficiary.approvalStatus !== "APPROVED") {
      return NextResponse.json({ error: "Only approved residents can delegate pickup." }, { status: 403 })
    }
    if (beneficiary.id === body.collectorStudentProfileId) {
      return NextResponse.json({ error: "For self collection, just collect normally." }, { status: 400 })
    }
    const collectors = await db
      .select()
      .from(studentProfiles)
      .where(eq(studentProfiles.id, body.collectorStudentProfileId))
      .limit(1)
    if (!collectors[0] || collectors[0].approvalStatus !== "APPROVED") {
      return NextResponse.json({ error: "Collector must be an approved resident." }, { status: 400 })
    }

    const already = await db
      .select({ id: messDistributionRecords.id })
      .from(messDistributionRecords)
      .where(
        and(
          eq(messDistributionRecords.distributionId, body.distributionId),
          eq(messDistributionRecords.studentProfileId, beneficiary.id)
        )
      )
      .limit(1)
    if (already[0]) return NextResponse.json({ error: "You have already collected this meal." }, { status: 409 })

    const active = await db
      .select({ id: mealPickupDelegations.id })
      .from(mealPickupDelegations)
      .where(
        and(
          eq(mealPickupDelegations.distributionId, body.distributionId),
          eq(mealPickupDelegations.beneficiaryStudentProfileId, beneficiary.id),
          eq(mealPickupDelegations.status, "ACTIVE")
        )
      )
      .limit(1)
    if (active[0]) return NextResponse.json({ error: "An active delegation already exists for this meal." }, { status: 409 })

    const now = new Date()
    const [created] = await db
      .insert(mealPickupDelegations)
      .values({
        id: crypto.randomUUID(),
        beneficiaryStudentProfileId: beneficiary.id,
        collectorStudentProfileId: body.collectorStudentProfileId,
        distributionId: body.distributionId,
        distributionDate: distRow.distributionDate,
        mealType: distRow.mealType,
        status: "ACTIVE",
        requestedBy: session.user.id,
        createdAt: now,
        updatedAt: now,
      })
      .returning()
    return NextResponse.json({ success: true, delegation: created }, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) return NextResponse.json({ error: "Invalid delegation data." }, { status: 400 })
    const message = error instanceof Error ? error.message : "Unable to create delegation."
    return NextResponse.json({ error: message }, { status: errStatus(error) })
  }
}
