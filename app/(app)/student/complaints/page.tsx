import { headers } from "next/headers"
import { redirect } from "next/navigation"
import { auth } from "@/auth"
import { getDb } from "@/db/server"
import {
  complaintCategories,
  complaintComments,
  complaints,
  rooms,
  studentProfiles,
} from "@/db/schema"
import { desc, eq, sql } from "drizzle-orm"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Empty } from "@/components/ui/empty"
import ComplaintForm from "./complaint-form"

export default async function MyComplaintsPage() {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session?.user) redirect("/login")

  const db = getDb()

  const profileRows = await db
    .select()
    .from(studentProfiles)
    .where(eq(studentProfiles.userId, session.user.id))
    .limit(1)
  const profile = profileRows[0]
  if (!profile) {
    return <p className="text-sm text-muted-foreground">Your student profile is not available yet.</p>
  }

  const rows = await db
    .select({ complaint: complaints, category: complaintCategories, room: rooms })
    .from(complaints)
    .leftJoin(complaintCategories, eq(complaints.categoryId, complaintCategories.id))
    .leftJoin(rooms, eq(complaints.roomId, rooms.id))
    .where(eq(complaints.studentProfileId, profile.id))
    .orderBy(desc(complaints.createdAt))

  const commentCounts = await db
    .select({ complaintId: complaintComments.complaintId, value: sql<number>`count(*)::int` })
    .from(complaintComments)
    .groupBy(complaintComments.complaintId)
  const countMap = new Map<string, number>(
    commentCounts.map((c) => [c.complaintId, Number(c.value)])
  )

  return (
    <div className="mx-auto w-full max-w-5xl space-y-6 px-4 sm:px-6">
      <div className="min-w-0">
        <h1 className="text-xl font-bold sm:text-2xl">My Complaints</h1>
        <p className="text-sm text-muted-foreground">
          Only complaints submitted from your student account are shown here.
        </p>
      </div>

      <ComplaintForm profileId={profile.id} />

      <Card>
        <CardHeader>
          <CardTitle>Submitted complaints</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {rows.length > 0 ? (
            rows.map(({ complaint: c, category, room }) => (
              <div key={c.id} className="min-w-0 border-b pb-3 last:border-0">
                <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between sm:gap-3">
                  <p className="min-w-0 break-words text-sm font-medium">
                    {c.title}{" "}
                    <span className="text-xs font-normal text-muted-foreground">{c.ticketNumber}</span>
                  </p>
                  <span className="flex shrink-0 items-center gap-2">
                    <Badge variant="outline">{c.status}</Badge>
                    <Badge variant="secondary">{c.priority}</Badge>
                  </span>
                </div>
                <p className="mt-1 break-words text-xs text-muted-foreground">
                  {category?.name ?? "General"}
                  {room?.roomNumber ? ` · Room ${room.roomNumber}` : ""}
                  {` · ${countMap.get(c.id) ?? 0} comments`}
                </p>
                <p className="mt-1 break-words text-sm text-muted-foreground">{c.description}</p>
              </div>
            ))
          ) : (
            <Empty title="No complaints" description="You have not submitted any complaints." />
          )}
        </CardContent>
      </Card>
    </div>
  )
}
