import { redirect } from "next/navigation"
import { getEffectiveRoles, getSessionIdentity } from "@/lib/auth/server"

/** Student workspace guard. Committee members keep STUDENT as an effective role,
 * while non-resident staff cannot enter resident self-service pages. */
export default async function StudentLayout({ children }: { children: React.ReactNode }) {
  const identity = await getSessionIdentity()
  if (!identity) redirect("/login")
  if (identity.status === "PENDING") redirect("/pending")
  if (identity.status === "REJECTED" || identity.status === "SUSPENDED") redirect("/login?status=" + identity.status.toLowerCase())
  const roles = await getEffectiveRoles(identity)
  if (!roles.includes("STUDENT")) redirect("/admin")
  return <>{children}</>
}
