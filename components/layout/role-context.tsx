"use client"

import * as React from "react"
import type { NotificationItem, StudentProfileWithDetails, UserSession } from "@/types"
import { hasPermission } from "@/lib/permissions/rbac"
import type { RoleName } from "@/lib/permissions/rbac"

// Minimal structural type for the serialized server session passed from app/layout.tsx.
// The session is produced server-side from the authenticated identity — never from client input.
export interface ServerSessionUser {
  id: string
  name: string
  email: string
  role: RoleName
  roles?: RoleName[]
  status?: UserSession["status"]
  image?: string | null
  phone?: string | null
  studentProfile?: StudentProfileWithDetails | null
}

export interface ServerSession {
  user?: ServerSessionUser | null
}

const DEFAULT_USER: UserSession = {
  id: "",
  name: "",
  email: "",
  role: "STUDENT",
  roles: ["STUDENT"],
  status: "PENDING",
  image: undefined,
  phone: undefined,
  studentProfile: null,
}

function toUserSession(session: ServerSession | null | undefined): UserSession {
  if (!session?.user) return DEFAULT_USER
  const u = session.user
  return {
    id: u.id,
    name: u.name,
    email: u.email,
    role: u.role,
    roles: u.roles?.length ? u.roles : [u.role],
    status: u.status ?? "APPROVED",
    image: u.image,
    phone: u.phone,
    studentProfile: u.studentProfile ?? null,
  }
}

interface RoleContextValue {
  currentUser: UserSession
  can: (permission: Parameters<typeof hasPermission>[1]) => boolean
  notifications: NotificationItem[]
  unreadCount: number
  markAsRead: (id: string) => void
  markAllAsRead: () => void
  // session management
  refreshSession: () => Promise<void>
  refreshStore: () => void
  version: number
}

const RoleContext = React.createContext<RoleContextValue | null>(null)

export function RoleProvider({
  children,
  session,
}: {
  children: React.ReactNode
  session?: ServerSession | null
}) {
  // Derive the current user from the server-provided session prop (no client-side auth() call,
  // no setState inside effects). Notifications are placeholders until the DB-backed service lands.
  const currentUser = React.useMemo(() => toUserSession(session), [session])
  const [version, setVersion] = React.useState(0)

  const refreshStore = React.useCallback(() => {
    setVersion((v) => v + 1)
  }, [])

  const refreshSession = React.useCallback(async () => {
    // Placeholder — replaced by real session refresh once Better Auth is wired end-to-end.
    setVersion((v) => v + 1)
  }, [])

  const can = React.useCallback(
    (permission: Parameters<typeof hasPermission>[1]) => {
      const roles = currentUser.roles?.length ? currentUser.roles : [currentUser.role]
      return roles.some((role) => hasPermission(role, permission))
    },
    [currentUser.role, currentUser.roles]
  )

  const notifications = React.useMemo<NotificationItem[]>(() => [], [])
  const unreadCount = React.useMemo(() => 0, [])

  const markAsRead = React.useCallback(() => {
    // Placeholder — replaced by the DB-backed notification service.
  }, [])

  const markAllAsRead = React.useCallback(() => {
    // Placeholder — replaced by the DB-backed notification service.
  }, [])

  const value = React.useMemo<RoleContextValue>(
    () => ({
      currentUser,
      can,
      notifications,
      unreadCount,
      markAsRead,
      markAllAsRead,
      refreshSession,
      refreshStore,
      version,
    }),
    [currentUser, can, notifications, unreadCount, markAsRead, markAllAsRead, refreshSession, refreshStore, version]
  )

  return <RoleContext.Provider value={value}>{children}</RoleContext.Provider>
}

export function useRole() {
  const context = React.useContext(RoleContext)
  if (!context) {
    throw new Error("useRole must be used within a RoleProvider")
  }
  return context
}
