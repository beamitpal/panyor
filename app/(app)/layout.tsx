import { headers } from "next/headers"
import { redirect } from "next/navigation"
import { auth } from "@/auth"
import { Header } from "@/components/layout/header"
import { Sidebar } from "@/components/layout/sidebar"
import { RoleProvider, type ServerSession } from "@/components/layout/role-context"
import { Toaster } from "@/components/ui/toast"
import { getEffectiveRoles, getSessionIdentity } from "@/lib/auth/server"
import { getDb } from "@/db/server"
import { rooms, studentProfiles } from "@/db/schema"
import { eq } from "drizzle-orm"
import type { StudentProfileWithDetails } from "@/types"

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const identity = await getSessionIdentity()
  if (!identity) redirect("/login")

  const roles = await getEffectiveRoles(identity)
  if (identity.status === "PENDING") redirect("/pending")
  if (identity.status === "REJECTED" || identity.status === "SUSPENDED") redirect("/login?status=" + identity.status.toLowerCase())

  const result = await auth.api.getSession({ headers: await headers() })

  // Attach the resident profile (if any) so studentportal pages and the
  // role context render real data instead of mock placeholders.
  let studentProfile: StudentProfileWithDetails | null = null
  try {
    const db = getDb()
    const rows = await db
      .select({ profile: studentProfiles, room: rooms })
      .from(studentProfiles)
      .leftJoin(rooms, eq(studentProfiles.roomId, rooms.id))
      .where(eq(studentProfiles.userId, identity.id))
      .limit(1)
    const row = rows[0]
    if (row) {
      const p = row.profile
      studentProfile = {
        id: p.id,
        userId: p.userId,
        name: identity.name,
        email: identity.email,
        phone: identity.phone ?? "",
        studentId: p.studentId,
        enrollmentNo: p.enrollmentNo,
        department: p.department,
        program: p.program,
        semester: p.semester,
        year: p.year,
        academicYear: "",
        bloodGroup: p.bloodGroup ?? undefined,
        approvalStatus: p.approvalStatus,
        approvedBy: p.approvedBy,
        approvedAt: p.approvedAt ? p.approvedAt.toISOString() : null,
        rejectionReason: p.rejectionReason,
        avatarUrl: p.avatarUrl ?? undefined,
        roomId: p.roomId,
        roomNumber: row.room?.roomNumber ?? null,
        bedNumber: p.bedNumber,
        emergencyContactName: p.emergencyContactName ?? undefined,
        emergencyContactPhone: p.emergencyContactPhone ?? undefined,
        address: p.address ?? undefined,
        createdAt: p.createdAt.toISOString(),
        updatedAt: p.updatedAt.toISOString(),
      }
    }
  } catch {
    studentProfile = null
  }

  const session: ServerSession = {
    user: result?.user
      ? {
          id: result.user.id,
          name: result.user.name,
          email: result.user.email,
          role: identity.role,
          roles,
          status: identity.status,
          image: result.user.image,
          phone: identity.phone,
          studentProfile,
        }
      : null,
  }

  return (
    <RoleProvider session={session}>
      <div className="flex min-h-screen flex-col">
        <Header />
        <div className="flex flex-1">
          <Sidebar />
          <main className="min-w-0 flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">{children}</main>
        </div>
        <Toaster position="top-right" richColors />
      </div>
    </RoleProvider>
  )
}
