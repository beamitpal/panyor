import "server-only"

import { headers } from "next/headers"
import { auth } from "@/auth"
import { getDb } from "@/db/server"
import { eq } from "drizzle-orm"
import { userRoles, users } from "@/db/schema"
import {
  hasAllPermissions,
  hasAnyPermission,
  hasPermission,
  type PermissionKey,
  type RoleName,
} from "@/lib/permissions/rbac"

export interface AuthenticatedIdentity {
  id: string
  name: string
  email: string
  role: RoleName
  status: "APPROVED" | "PENDING" | "SUSPENDED" | "REJECTED"
  image?: string | null
  phone?: string | null
}

export class AuthError extends Error {
  status: 401 | 403
  constructor(message: string, status: 401 | 403 = 401) {
    super(message)
    this.status = status
  }
}

const VALID_ROLES: RoleName[] = [
  "STUDENT",
  "CARETAKER",
  "MESS_EMPLOYEE",
  "MESS_COMMITTEE",
  "SPORTS_COMMITTEE",
  "PRESIDENT",
  "DEPUTY_WARDEN",
  "WARDEN",
  "SUPER_ADMIN",
]

function toIdentity(raw: {
  id: string
  name: string
  email: string
  role?: unknown
  status?: unknown
  image?: string | null
  phone?: string | null
}): AuthenticatedIdentity {
  const role: RoleName = VALID_ROLES.includes(raw.role as RoleName)
    ? (raw.role as RoleName)
    : "STUDENT"
  const status =
    raw.status === "APPROVED" ||
    raw.status === "PENDING" ||
    raw.status === "SUSPENDED" ||
    raw.status === "REJECTED"
      ? raw.status
      : "PENDING"
  return {
    id: raw.id,
    name: raw.name,
    email: raw.email,
    role,
    status,
    image: raw.image ?? null,
    phone: raw.phone ?? null,
  }
}

/**
 * Validate the request session against PostgreSQL and return the
 * authenticated identity. Never trust client-provided role values:
 * role + status always come from the server-side session record.
 */
export async function getSessionIdentity(): Promise<AuthenticatedIdentity | null> {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session?.user) return null
  return toIdentity({
    id: session.user.id,
    name: session.user.name,
    email: session.user.email,
    role: (session.user as Record<string, unknown>).role,
    status: (session.user as Record<string, unknown>).status,
    image: session.user.image,
    phone: (session.user as Record<string, unknown>).phone as string | null | undefined,
  })
}

/** Require any authenticated user; throws AuthError(401) otherwise. */
export async function requireAuth(): Promise<AuthenticatedIdentity> {
  const identity = await getSessionIdentity()
  if (!identity) {
    throw new AuthError("Authentication required. Please sign in.", 401)
  }
  return identity
}

/**
 * Require an authenticated user whose account is approved.
 * PENDING / SUSPENDED / REJECTED accounts cannot perform protected mutations.
 */
export async function requireApprovedAuth(): Promise<AuthenticatedIdentity> {
  const identity = await requireAuth()
  if (identity.status !== "APPROVED") {
    throw new AuthError(
      `Account status "${identity.status}" cannot perform this action. Contact the warden's office.`,
      403
    )
  }
  return identity
}

/**
 * Effective roles for server-side authorization: the primary role plus every
 * additional assignment from user_roles (e.g. STUDENT + PRESIDENT). A person
 * is never split across duplicate accounts — permissions are the union.
 */
export async function getEffectiveRoles(identity: AuthenticatedIdentity): Promise<RoleName[]> {
  const roles: RoleName[] = [identity.role]
  try {
    const db = getDb()
    const rows = await db
      .select({ role: userRoles.role })
      .from(userRoles)
      .where(eq(userRoles.userId, identity.id))
    for (const row of rows) {
      if (!roles.includes(row.role)) roles.push(row.role)
    }
  } catch {
    throw new AuthError("Unable to verify role assignments. Please try again.", 403)
  }
  return roles
}

function rolesHave(roles: RoleName[], permission: PermissionKey): boolean {
  return roles.some((role) => hasPermission(role, permission))
}

/** Require a single permission (server-side security boundary). */
export async function requirePermission(permission: PermissionKey): Promise<AuthenticatedIdentity> {
  const identity = await requireApprovedAuth()
  const roles = await getEffectiveRoles(identity)
  if (!rolesHave(roles, permission)) {
    throw new AuthError(`Permission "${permission}" required.`, 403)
  }
  return identity
}

/** Require at least one of the given permissions. */
export async function requireAnyPermission(
  permissions: PermissionKey[]
): Promise<AuthenticatedIdentity> {
  const identity = await requireApprovedAuth()
  const roles = await getEffectiveRoles(identity)
  if (!permissions.some((p) => rolesHave(roles, p))) {
    throw new AuthError(`One of [${permissions.join(", ")}] required.`, 403)
  }
  return identity
}

/** Require all of the given permissions. */
export async function requireAllPermissions(
  permissions: PermissionKey[]
): Promise<AuthenticatedIdentity> {
  const identity = await requireApprovedAuth()
  const roles = await getEffectiveRoles(identity)
  if (!permissions.every((p) => rolesHave(roles, p))) {
    throw new AuthError(`All of [${permissions.join(", ")}] required.`, 403)
  }
  return identity
}

// Re-export the static single-role helpers for UI gating (navigation only —
// never a security boundary).
export { hasAnyPermission, hasAllPermissions }

/**
 * Re-read the authoritative user row from PostgreSQL (role/status source of
 * truth for administrative screens). Returns null when the user no longer exists.
 */
export async function getAuthoritativeUser(userId: string) {
  const db = getDb()
  const rows = await db.select().from(users).where(eq(users.id, userId)).limit(1)
  return rows[0] ?? null
}
