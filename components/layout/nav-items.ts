"use client"

import {
  LayoutDashboard,
  Users,
  Building2,
  Gamepad2,
  LifeBuoy,
  UtensilsCrossed,
  BellRing,
  FileSpreadsheet,
  ShieldCheck,
  Settings2,
} from "lucide-react"
import { useRole } from "./role-context"

export interface NavItem {
  title: string
  href: string
  icon: React.ComponentType<{ className?: string }>
  permission?: Parameters<ReturnType<typeof useRole>["can"]>[0]
  badge?: string
}

/** Single source of truth for app navigation (sidebar + mobile menu). */
export function useNavItems() {
  const { can, currentUser } = useRole()

  const studentOnly =
    (currentUser.roles?.length ?? 1) === 1 &&
    (currentUser.roles?.[0] ?? currentUser.role) === "STUDENT"

  const adminItems: NavItem[] = [
    { title: "Overview", href: "/", icon: LayoutDashboard },
    { title: "Students", href: "/admin/students", icon: Users, permission: "students.view" },
    { title: "Room Occupancy", href: "/admin/rooms", icon: Building2, permission: "rooms.view" },
    { title: "Equipment & Sports", href: "/admin/equipment", icon: Gamepad2, permission: "equipment.view" },
    { title: "Complaints Desk", href: "/admin/complaints", icon: LifeBuoy, permission: "complaints.view" },
    { title: "Mess Operations", href: "/admin/mess", icon: UtensilsCrossed, permission: "mess.view" },
    { title: "Hostel Notices", href: "/admin/notices", icon: BellRing, permission: "notices.view" },
    { title: "Reports & Exports", href: "/admin/reports", icon: FileSpreadsheet, permission: "reports.view" },
    { title: "Audit Trail", href: "/admin/audit-logs", icon: ShieldCheck, permission: "audit_logs.view" },
    { title: "System & RBAC", href: "/admin/system", icon: Settings2, permission: "system.settings" },
  ]

  const studentItems: NavItem[] = [
    { title: "My Portal", href: "/student", icon: LayoutDashboard },
    { title: "My Equipment", href: "/student/equipment", icon: Gamepad2 },
    { title: "My Complaints", href: "/student/complaints", icon: LifeBuoy },
    { title: "My Mess", href: "/student/mess", icon: UtensilsCrossed },
    { title: "Notices", href: "/student/notices", icon: BellRing },
  ]

  const items = (studentOnly ? studentItems : adminItems).filter((item) => {
    if (!item.permission) return true
    return can(item.permission)
  })

  // Multi-role residents (STUDENT + PRESIDENT / committees) keep their
  // student self-service links alongside the admin desks. Pure students
  // see only the student portal (as before).
  const isStudent = (currentUser.roles?.length ? currentUser.roles : [currentUser.role]).includes("STUDENT")
  const studentSection = !studentOnly && (isStudent || !!currentUser.studentProfile)
    ? studentItems
    : []

  return { items, studentOnly, currentUser, studentSection }
}
