import { getDb } from "@/db/server"
import { notices } from "@/db/schema"
import { desc, eq } from "drizzle-orm"
import { Badge } from "@/components/ui/badge"
import { Empty } from "@/components/ui/empty"

export default async function StudentNoticesPage() {
  const db = getDb()

  const published = await db
    .select()
    .from(notices)
    .where(eq(notices.isPublished, true))
    .orderBy(desc(notices.publishedAt))

  const now = new Date()
  const visible = published.filter((n) => {
    if (n.expiresAt && new Date(n.expiresAt) <= now) return false
    const audiences = (n.targetAudiences ?? []) as string[]
    return audiences.includes("ALL") || audiences.includes("STUDENTS")
  })

  return (
    <div className="mx-auto w-full max-w-5xl space-y-6 px-4 sm:px-6">
      <div className="min-w-0">
        <h1 className="text-xl font-bold sm:text-2xl">Notices for Students</h1>
        <p className="text-sm text-muted-foreground">
          Only active notices targeted to students are shown.
        </p>
      </div>
      <div className="space-y-3">
        {visible.length > 0 ? (
          visible.map((n) => (
            <article
              key={n.id}
              className="min-w-0 break-words rounded-xl border bg-card p-4 sm:p-5"
            >
              <div className="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
                <h2 className="min-w-0 break-words font-semibold">{n.title}</h2>
                <span className="flex shrink-0 items-center gap-2">
                  <Badge variant="outline">{n.priority}</Badge>
                  <Badge variant="secondary">{n.category}</Badge>
                </span>
              </div>
              <p className="mt-2 break-words text-sm text-muted-foreground">{n.content}</p>
            </article>
          ))
        ) : (
          <Empty title="No notices" description="No active notices." />
        )}
      </div>
    </div>
  )
}
