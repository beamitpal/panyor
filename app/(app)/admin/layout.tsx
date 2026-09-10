import { redirect } from "next/navigation"
import { getEffectiveRoles, getSessionIdentity } from "@/lib/auth/server"

/**
 * Admin desk guard: pure STUDENT accounts (no additional staff roles)
 * belong in the student portal. Everyone else passes through to the
 * permission-gated desks below (each API still enforces its own RBAC).
 */
export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const identity = await getSessionIdentity()
  if (!identity) redirect("/login")
  let roles: string[] = [identity.role]
  try {
    roles = await getEffectiveRoles(identity)
  } catch {
    roles = [identity.role]
  }
  if (roles.length === 1 && roles[0] === "STUDENT") redirect("/student")
  return <>{children}</>
}
