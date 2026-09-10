import { headers } from "next/headers"
import { redirect } from "next/navigation"
import { and, eq, gt, ne } from "drizzle-orm"
import { auth } from "@/auth"
import { getDb } from "@/db/server"
import { equipment, equipmentCategories, equipmentTransactions, studentProfiles } from "@/db/schema"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Empty } from "@/components/ui/empty"
import RequestForm from "./request-form"

export default async function MyEquipmentPage() {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session?.user) redirect("/login")

  const db = getDb()
  const profileRows = await db
    .select()
    .from(studentProfiles)
    .where(eq(studentProfiles.userId, session.user.id))
    .limit(1)
  const profile = profileRows[0] ?? null

  if (!profile) {
    return (
      <div className="mx-auto w-full max-w-5xl space-y-6 px-4 sm:px-6">
        <div className="min-w-0">
          <h1 className="text-xl font-bold sm:text-2xl">My Equipment</h1>
          <p className="text-sm text-muted-foreground">
            Your active equipment and what is currently available to request.
          </p>
        </div>
        <Card>
          <CardContent className="p-4 sm:p-6">
            <Empty
              title="Your student profile is being prepared"
              description="We could not find a student profile for your account yet. Please contact the warden office."
            />
          </CardContent>
        </Card>
      </div>
    )
  }

  const txRows = await db
    .select({
      id: equipmentTransactions.id,
      quantity: equipmentTransactions.quantity,
      status: equipmentTransactions.status,
      expectedReturnDate: equipmentTransactions.expectedReturnDate,
      equipmentName: equipment.name,
      equipmentCode: equipment.code,
    })
    .from(equipmentTransactions)
    .innerJoin(equipment, eq(equipmentTransactions.equipmentId, equipment.id))
    .where(
      and(
        eq(equipmentTransactions.studentProfileId, profile.id),
        ne(equipmentTransactions.status, "RETURNED")
      )
    )

  const availRows = await db
    .select({
      id: equipment.id,
      name: equipment.name,
      code: equipment.code,
      availableQuantity: equipment.availableQuantity,
      categoryName: equipmentCategories.name,
    })
    .from(equipment)
    .leftJoin(equipmentCategories, eq(equipment.categoryId, equipmentCategories.id))
    .where(gt(equipment.availableQuantity, 0))

  const items = availRows.map((r) => ({
    id: r.id,
    name: r.name,
    availableQuantity: r.availableQuantity,
  }))

  return (
    <div className="mx-auto w-full max-w-5xl space-y-6 px-4 sm:px-6">
      <div className="min-w-0">
        <h1 className="text-xl font-bold sm:text-2xl">My Equipment</h1>
        <p className="text-sm text-muted-foreground">
          Your active equipment and what is currently available to request.
        </p>
      </div>

      <section className="rounded-xl border bg-card p-4 sm:p-5">
        <h2 className="font-semibold">Currently issued to you</h2>
        <div className="mt-4 space-y-3">
          {txRows.length ? (
            txRows.map((x) => (
              <div
                key={x.id}
                className="flex flex-col gap-1 border-b pb-3 text-sm sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="min-w-0">
                  <p className="break-words font-medium">
                    {x.equipmentName} <span className="text-xs text-muted-foreground">({x.equipmentCode})</span>
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Quantity {x.quantity} · Expected return{" "}
                    {new Date(x.expectedReturnDate).toLocaleDateString()}
                  </p>
                </div>
                <Badge className="w-fit shrink-0">{x.status}</Badge>
              </div>
            ))
          ) : (
            <p className="text-sm text-muted-foreground">You have no active equipment.</p>
          )}
        </div>
      </section>

      <section className="rounded-xl border bg-card p-4 sm:p-5">
        <h2 className="font-semibold">Available equipment</h2>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          {availRows.map((x) => (
            <div key={x.id} className="min-w-0 break-words rounded-lg border p-3">
              <p className="break-words font-medium text-sm">{x.name}</p>
              <p className="text-xs text-muted-foreground">{x.categoryName || "Equipment"}</p>
              <p className="mt-2 text-xs">{x.availableQuantity} available</p>
            </div>
          ))}
        </div>
      </section>

      <Card>
        <CardHeader>
          <CardTitle>Request equipment</CardTitle>
        </CardHeader>
        <CardContent>
          <RequestForm profileId={profile.id} items={items} />
        </CardContent>
      </Card>
    </div>
  )
}
