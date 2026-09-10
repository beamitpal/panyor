import { headers } from "next/headers"
import { redirect } from "next/navigation"
import { auth } from "@/auth"
import { getDb } from "@/db/server"
import {
  complaints,
  equipmentTransactions,
  messDistributionRecords,
  messDistributions,
  notices,
  rooms,
  studentProfiles,
  users,
} from "@/db/schema"
import { and, count, desc, eq } from "drizzle-orm"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Empty } from "@/components/ui/empty"

export default async function StudentPortalPage() {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session?.user) redirect("/login")

  const db = getDb()

  const profileRows = await db
    .select({ profile: studentProfiles, room: rooms, user: users })
    .from(studentProfiles)
    .leftJoin(rooms, eq(studentProfiles.roomId, rooms.id))
    .leftJoin(users, eq(studentProfiles.userId, users.id))
    .where(eq(studentProfiles.userId, session.user.id))
    .limit(1)

  const row = profileRows[0]
  if (!row) {
    return (
      <div className="mx-auto max-w-3xl rounded-lg border p-6">
        <h1 className="text-xl font-semibold">Student profile</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Your account is approved, but your hostel student profile is still being prepared.
        </p>
      </div>
    )
  }

  const { profile, room, user } = row

  const [equipmentCountRows, complaintsCountRows] = await Promise.all([
    db
      .select({ value: count() })
      .from(equipmentTransactions)
      .where(
        and(
          eq(equipmentTransactions.studentProfileId, profile.id),
          eq(equipmentTransactions.status, "ISSUED")
        )
      ),
    db.select({ value: count() }).from(complaints).where(eq(complaints.studentProfileId, profile.id)),
  ])
  const activeEquipmentCount = equipmentCountRows[0]?.value ?? 0
  const complaintsCount = complaintsCountRows[0]?.value ?? 0

  const mealRows = await db
    .select({ record: messDistributionRecords, distribution: messDistributions })
    .from(messDistributionRecords)
    .leftJoin(messDistributions, eq(messDistributionRecords.distributionId, messDistributions.id))
    .where(eq(messDistributionRecords.studentProfileId, profile.id))
    .orderBy(desc(messDistributionRecords.distributedAt))
    .limit(5)

  const noticeRows = await db
    .select()
    .from(notices)
    .where(eq(notices.isPublished, true))
    .orderBy(desc(notices.publishedAt))
    .limit(5)

  const displayName = user?.name ?? "Student"

  return (
    <div className="mx-auto w-full max-w-6xl space-y-6 px-4 sm:px-6">
      <div className="min-w-0">
        <h1 className="truncate text-xl font-bold sm:text-2xl">Welcome, {displayName}</h1>
        <p className="text-sm text-muted-foreground">Your Panyor Hall student portal.</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-xs font-medium text-muted-foreground">Room</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-lg font-semibold">{room?.roomNumber ?? "Not allotted"}</p>
            <p className="text-xs text-muted-foreground">Bed {profile.bedNumber ?? "—"}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-xs font-medium text-muted-foreground">Active equipment</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-lg font-semibold">{activeEquipmentCount}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-xs font-medium text-muted-foreground">My complaints</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-lg font-semibold">{complaintsCount}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-xs font-medium text-muted-foreground">Approval</CardTitle>
          </CardHeader>
          <CardContent>
            <Badge variant={profile.approvalStatus === "APPROVED" ? "default" : "secondary"}>
              {profile.approvalStatus}
            </Badge>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="min-w-0 break-words">
          <CardHeader>
            <CardTitle>My recent meals</CardTitle>
          </CardHeader>
          <CardContent>
            {mealRows.length > 0 ? (
              <div className="space-y-3">
                {mealRows.map(({ record, distribution }) => (
                  <div
                    key={record.id}
                    className="flex flex-col gap-1 border-b pb-2 text-sm last:border-0 sm:flex-row sm:justify-between"
                  >
                    <span className="min-w-0 truncate">
                      {distribution?.title ?? record.mealType} · {record.mealType}
                    </span>
                    <span className="shrink-0 text-muted-foreground">
                      <Badge variant="outline">{record.status}</Badge>
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <Empty title="No meal records" description="No meal records yet." />
            )}
          </CardContent>
        </Card>

        <Card className="min-w-0 break-words">
          <CardHeader>
            <CardTitle>Current notices</CardTitle>
          </CardHeader>
          <CardContent>
            {noticeRows.length > 0 ? (
              <div className="space-y-3">
                {noticeRows.map((n) => (
                  <div key={n.id} className="border-b pb-2 text-sm last:border-0">
                    <p className="font-medium">{n.title}</p>
                    <p className="text-xs text-muted-foreground">{n.category}</p>
                  </div>
                ))}
              </div>
            ) : (
              <Empty title="No notices" description="No active notices." />
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
