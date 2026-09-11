import "dotenv/config"
import { getDb } from "../db/server"
import { studentProfiles, users } from "../db/schema"

async function main() {
  const db = getDb()
  const profiles = await db.select().from(studentProfiles)
  const usersData = await db.select().from(users)
  
  console.log('=== Students ===')
  profiles.forEach(p => console.log('Profile:', p.id, 'userId:', p.userId, 'studentId:', p.studentId, 'approvalStatus:', p.approvalStatus, 'roomId:', p.roomId))
  
  console.log('=== Users ===')
  usersData.forEach(u => console.log('User:', u.id, 'email:', u.email, 'role:', u.role, 'status:', u.status))
}

main()