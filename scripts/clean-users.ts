import "dotenv/config"
import { getDb } from "../db/server"
import { users } from "../db/schema"
import { eq, ne } from "drizzle-orm"

const SUPER_ADMIN_EMAIL = "superadmin@rgu.ac.in"

const db = getDb()

// First, get the superadmin user ID
const superAdmin = await db.select().from(users).where(eq(users.email, SUPER_ADMIN_EMAIL)).limit(1)

if (superAdmin.length === 0) {
  console.error("Super admin not found!")
  process.exit(1)
}

const superAdminId = superAdmin[0].id
console.log(`Keeping super admin ID: ${superAdminId}`)

// Delete all users except superadmin
await db.delete(users).where(
  ne(users.id, superAdminId)
)

console.log("All other users deleted. Super admin preserved.")

process.exit(0)