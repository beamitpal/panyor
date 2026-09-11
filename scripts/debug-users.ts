import "dotenv/config"
import { getDb } from "../db/server"
import { users } from "../db/schema"
import { studentProfiles } from "../db/schema"
import { eq, ne } from "drizzle-orm"

const db = getDb()

console.log("=== Users ===")
const allUsers = await db.select().from(users)
allUsers.forEach(u => console.log(`- ${u.email} | role: ${u.role} | status: ${u.status}`))

console.log("\n=== Student Profiles ===")
const allProfiles = await db.select().from(studentProfiles)
allProfiles.forEach(p => console.log(`- userId: ${p.userId} | studentId: ${p.studentId} | dept: ${p.department} | program: ${p.program} | year: ${p.year} | sem: ${p.semester} | approval: ${p.approvalStatus} | roomId: ${p.roomId}`))

console.log("\n=== Room Assignments ===")
const allAssignments = await db.select().from(db.schema.roomAssignments)
allAssignments.forEach(a => console.log(`- id: ${a.id} | roomId: ${a.roomId} | studentId: ${a.studentProfileId} | bed: ${a.bedNumber} | status: ${a.status}`))