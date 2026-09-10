import { getDb } from "@/db/server"
import { studentProfiles } from "@/db/schema"
import { eq, or } from "drizzle-orm"

/** Sentinel for roll / enrollment numbers not yet issued by the university. */
export const PENDING_ID = "A/F"

/** Normalize an ID field: trim, and collapse any casing of a/f to "A/F". */
export function normalizeStudentId(value: string | null | undefined): string {
  const v = (value ?? "").trim()
  return v.toUpperCase() === "A/F" ? PENDING_ID : v
}

/**
 * Which field (if any) already uses this ID on another profile.
 * The A/F sentinel is never a conflict — many applicants share it.
 */
export async function findIdConflict(
  value: string,
  excludeProfileId?: string
): Promise<"studentId" | "enrollmentNo" | null> {
  const v = normalizeStudentId(value)
  if (v === PENDING_ID || !v) return null
  const db = getDb()
  const rows = await db
    .select({
      id: studentProfiles.id,
      studentId: studentProfiles.studentId,
      enrollmentNo: studentProfiles.enrollmentNo,
    })
    .from(studentProfiles)
    .where(or(eq(studentProfiles.studentId, v), eq(studentProfiles.enrollmentNo, v)))
    .limit(5)
  for (const r of rows) {
    if (r.id === excludeProfileId) continue
    if (normalizeStudentId(r.studentId) === v) return "studentId"
    if (normalizeStudentId(r.enrollmentNo) === v) return "enrollmentNo"
  }
  return null
}
