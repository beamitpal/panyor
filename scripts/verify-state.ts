import "dotenv/config"
import { getDb } from "../db/server"
import { users } from "../db/schema"
import { eq } from "drizzle-orm"

const SUPER_ADMIN_EMAIL = "superadmin@rgu.ac.in"

const db = getDb()

// Get all users
const allUsers = await db.select().from(users)

console.log("=== Database State ===")
console.log("Total users:", allUsers.length)

allUsers.forEach(u => {
  console.log(`- Email: ${u.email}, Role: ${u.role}, Status: ${u.status}`)
})

// Verify superadmin is APPROVED
const superAdmin = allUsers.find(u => u.email === SUPER_ADMIN_EMAIL)
if (superAdmin) {
  console.log("\nSuper Admin found:")
  console.log(`  Email: ${superAdmin.email}`)
  console.log(`  Role: ${superAdmin.role}`)
  console.log(`  Status: ${superAdmin.status}`)
  console.log(`  Email Verified: ${superAdmin.emailVerified}`)
  
  if (superAdmin.role === "SUPER_ADMIN" && superAdmin.status === "APPROVED") {
    console.log("\n✅ Super admin is properly configured and APPROVED!")
    console.log("🔑 Super admin can now login and approve new accounts")
  } else {
    console.log("\n⚠️  Super admin role/status needs adjustment")
  }
} else {
  console.error("Super admin not found in database!")
}