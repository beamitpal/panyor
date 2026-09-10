import "dotenv/config"
import { auth } from "../auth"
import { getDb } from "../db/server"
import { users, userRoles } from "../db/schema"
import { eq } from "drizzle-orm"

const email = process.env.SUPER_ADMIN_EMAIL
const password = process.env.SUPER_ADMIN_PASSWORD
const name = process.env.SUPER_ADMIN_NAME || "Panyor Super Admin"

if (!email || !password) {
  throw new Error("Set SUPER_ADMIN_EMAIL and SUPER_ADMIN_PASSWORD before running the seed.")
}

let userId: string
const db = getDb()
const existing = await db.select().from(users).where(eq(users.email, email)).limit(1)
if (existing.length > 0) {
  userId = existing[0].id
  console.log(`Super Admin exists, updating: ${email}`)
} else {
  const created = await auth.api.signUpEmail({
    body: { name, email, password },
  })

  if (!created?.user?.id) {
    throw new Error("Better Auth did not return a created user.")
  }
  userId = created.user.id
}

await db.update(users).set({ role: "SUPER_ADMIN", status: "APPROVED", emailVerified: true, updatedAt: new Date() }).where(eq(users.id, userId))
await db.insert(userRoles).values({ id: crypto.randomUUID(), userId, role: "SUPER_ADMIN", assignedBy: userId }).onConflictDoNothing()

console.log(`Super Admin ready: ${email}`)
process.exit(0)
