export type RoleName =
  | "STUDENT"
  | "CARETAKER"
  | "MESS_EMPLOYEE"
  | "MESS_COMMITTEE"
  | "SPORTS_COMMITTEE"
  | "PRESIDENT"
  | "DEPUTY_WARDEN"
  | "WARDEN"
  | "SUPER_ADMIN"

export type PermissionKey =
  | "students.view"
  | "students.create"
  | "students.edit"
  | "students.delete"
  | "students.approve"
  | "students.reject"
  | "students.suspend"
  | "students.export"
  | "rooms.view"
  | "rooms.create"
  | "rooms.manage"
  | "rooms.assign"
  | "rooms.edit"
  | "rooms.delete"
  | "rooms.export"
  | "equipment.view"
  | "equipment.create"
  | "equipment.manage"
  | "equipment.issue"
  | "equipment.return"
  | "equipment.export"
  | "equipment_requests.view"
  | "equipment_requests.create"
  | "equipment_requests.approve"
  | "equipment_requests.reject"
  | "complaints.view"
  | "complaints.create"
  | "complaints.edit"
  | "complaints.assign"
  | "complaints.resolve"
  | "complaints.delete"
  | "complaints.close_own"
  | "complaints.export"
  | "mess.view"
  | "mess.manage"
  | "mess.distribute"
  | "mess.export"
  | "notices.view"
  | "notices.create"
  | "notices.edit"
  | "notices.delete"
  | "notices.publish"
  | "notices.export"
  | "users.view"
  | "users.manage"
  | "roles.view"
  | "roles.manage"
  | "permissions.manage"
  | "reports.view"
  | "reports.export"
  | "audit_logs.view"
  | "audit_logs.export"
  | "system.settings"

export type PermissionName = PermissionKey

export interface RoleDefinition {
  name: RoleName
  label: string
  description: string
  permissions: PermissionKey[]
}

export const ROLE_DEFINITIONS: Record<RoleName, RoleDefinition> = {
  STUDENT: {
    name: "STUDENT",
    label: "Student / Resident",
    description: "Resident student of Panyor Hall of Residence",
    permissions: [
      "rooms.view",
      "equipment.view",
      "equipment_requests.view",
      "equipment_requests.create",
      "complaints.view",
      "complaints.create",
      "complaints.close_own",
      "mess.view",
      "notices.view",
      "reports.view",
    ],
  },
  CARETAKER: {
    name: "CARETAKER",
    label: "Hostel Caretaker",
    description: "Operational administrator for equipment, room checks, student triage, and physical inventory",
    permissions: [
      "students.view",
      "students.approve",
      "students.edit",
      "rooms.view",
      "rooms.create",
      "rooms.manage",
      "rooms.assign",
      "rooms.edit",
      "equipment.view",
      "equipment.create",
      "equipment.manage",
      "equipment.issue",
      "equipment.return",
      "equipment.export",
      "equipment_requests.view",
      "equipment_requests.approve",
      "equipment_requests.reject",
      "complaints.view",
      "complaints.create",
      "complaints.edit",
      "complaints.assign",
      "complaints.resolve",
      "complaints.export",
      "notices.view",
      "notices.create",
      "reports.view",
      "reports.export",
      "audit_logs.view",
    ],
  },
  MESS_EMPLOYEE: {
    name: "MESS_EMPLOYEE",
    label: "Mess Staff / Distribution Worker",
    description: "Front-desk distribution staff for daily meals tracking and student verification",
    permissions: [
      "rooms.view",
      "students.view",
      "mess.view",
      "mess.distribute",
      "reports.view",
    ],
  },
  MESS_COMMITTEE: {
    name: "MESS_COMMITTEE",
    label: "Mess Committee Member",
    description: "Student-faculty committee managing food quality, menu items, distribution schedules, and mess complaints",
    permissions: [
      "students.view",
      "rooms.view",
      "mess.view",
      "mess.manage",
      "mess.distribute",
      "mess.export",
      "complaints.view",
      "complaints.resolve",
      "notices.view",
      "notices.create",
      "notices.publish",
      "reports.view",
      "reports.export",
    ],
  },
  SPORTS_COMMITTEE: {
    name: "SPORTS_COMMITTEE",
    label: "Sports Committee Member",
    description: "Student committee managing sports inventory, equipment issue/return, and games events",
    permissions: [
      "students.view",
      "rooms.view",
      "equipment.view",
      "equipment.create",
      "equipment.issue",
      "equipment.return",
      "equipment.export",
      "equipment_requests.view",
      "equipment_requests.approve",
      "equipment_requests.reject",
      "complaints.view",
      "notices.view",
      "notices.create",
      "notices.publish",
      "reports.view",
      "reports.export",
    ],
  },
  PRESIDENT: {
    name: "PRESIDENT",    label: "Hall President",
    description: "Elected student representative overseeing hostel affairs, complaints, and student welfare",
    permissions: [
      "students.view",
      "students.approve",
      "students.export",
      "rooms.view",
      "rooms.export",
      "equipment.view",
      "equipment.export",
      "equipment_requests.view",
      "complaints.view",
      "complaints.assign",
      "complaints.resolve",
      "complaints.export",
      "mess.view",
      "mess.export",
      "notices.view",
      "notices.create",
      "notices.publish",
      "notices.export",
      "reports.view",
      "reports.export",
      "audit_logs.view",
    ],
  },
  DEPUTY_WARDEN: {
    name: "DEPUTY_WARDEN",
    label: "Deputy Warden",
    description: "Faculty officer assisting in administrative approvals, disciplinary actions, and hostel management",
    permissions: [
      "students.view",
      "students.create",
      "students.edit",
      "students.approve",
      "students.reject",
      "students.suspend",
      "students.export",
      "rooms.view",
      "rooms.create",
      "rooms.manage",
      "rooms.assign",
      "rooms.edit",
      "rooms.export",
      "equipment.view",
      "equipment.create",
      "equipment.manage",
      "equipment.issue",
      "equipment.return",
      "equipment.export",
      "equipment_requests.view",
      "equipment_requests.approve",
      "equipment_requests.reject",
      "complaints.view",
      "complaints.create",
      "complaints.edit",
      "complaints.assign",
      "complaints.resolve",
      "complaints.export",
      "mess.view",
      "mess.manage",
      "mess.distribute",
      "mess.export",
      "notices.view",
      "notices.create",
      "notices.publish",
      "notices.export",
      "reports.view",
      "reports.export",
      "audit_logs.view",
    ],
  },
  WARDEN: {
    name: "WARDEN",
    label: "Chief Warden",
    description: "Chief executive authority of Panyor Hall of Residence",
    permissions: [
      "students.view",
      "students.create",
      "students.edit",
      "students.delete",
      "students.approve",
      "students.reject",
      "students.suspend",
      "students.export",
      "rooms.view",
      "rooms.create",
      "rooms.manage",
      "rooms.assign",
      "rooms.edit",
      "rooms.delete",
      "rooms.export",
      "equipment.view",
      "equipment.create",
      "equipment.manage",
      "equipment.issue",
      "equipment.return",
      "equipment.export",
      "equipment_requests.view",
      "equipment_requests.approve",
      "equipment_requests.reject",
      "complaints.view",
      "complaints.create",
      "complaints.edit",
      "complaints.assign",
      "complaints.resolve",
      "complaints.export",
      "mess.view",
      "mess.manage",
      "mess.distribute",
      "mess.export",
      "notices.view",
      "notices.create",
      "notices.edit",
      "notices.delete",
      "notices.publish",
      "notices.export",
      "users.view",
      "users.manage",
      "reports.view",
      "reports.export",
      "audit_logs.view",
      "audit_logs.export",
    ],
  },
  SUPER_ADMIN: {
    name: "SUPER_ADMIN",
    label: "Super Administrator",
    description: "Complete system access including user management, role editing, permission assignment, and system configurations",
    permissions: [
      "students.view",
      "students.create",
      "students.edit",
      "students.delete",
      "students.approve",
      "students.reject",
      "students.suspend",
      "students.export",
      "rooms.view",
      "rooms.create",
      "rooms.manage",
      "rooms.assign",
      "rooms.edit",
      "rooms.delete",
      "rooms.export",
      "equipment.view",
      "equipment.create",
      "equipment.manage",
      "equipment.issue",
      "equipment.return",
      "equipment.export",
      "equipment_requests.view",
      "equipment_requests.approve",
      "equipment_requests.reject",
      "complaints.view",
      "complaints.create",
      "complaints.edit",
      "complaints.assign",
      "complaints.resolve",
      "complaints.delete",
      "complaints.export",
      "mess.view",
      "mess.manage",
      "mess.distribute",
      "mess.export",
      "notices.view",
      "notices.create",
      "notices.edit",
      "notices.delete",
      "notices.publish",
      "notices.export",
      "users.view",
      "users.manage",
      "roles.view",
      "roles.manage",
      "permissions.manage",
      "reports.view",
      "reports.export",
      "audit_logs.view",
      "audit_logs.export",
      "system.settings",
    ],
  },
}

export const ROLE_PERMISSIONS: Record<RoleName, PermissionKey[]> = {
  STUDENT: ROLE_DEFINITIONS.STUDENT.permissions,
  CARETAKER: ROLE_DEFINITIONS.CARETAKER.permissions,
  MESS_EMPLOYEE: ROLE_DEFINITIONS.MESS_EMPLOYEE.permissions,
  MESS_COMMITTEE: ROLE_DEFINITIONS.MESS_COMMITTEE.permissions,
  SPORTS_COMMITTEE: ROLE_DEFINITIONS.SPORTS_COMMITTEE.permissions,
  PRESIDENT: ROLE_DEFINITIONS.PRESIDENT.permissions,
  DEPUTY_WARDEN: ROLE_DEFINITIONS.DEPUTY_WARDEN.permissions,
  WARDEN: ROLE_DEFINITIONS.WARDEN.permissions,
  SUPER_ADMIN: ROLE_DEFINITIONS.SUPER_ADMIN.permissions,
}

export const ROLE_DESCRIPTIONS: Record<RoleName, string> = {
  STUDENT: ROLE_DEFINITIONS.STUDENT.description,
  CARETAKER: ROLE_DEFINITIONS.CARETAKER.description,
  MESS_EMPLOYEE: ROLE_DEFINITIONS.MESS_EMPLOYEE.description,
  MESS_COMMITTEE: ROLE_DEFINITIONS.MESS_COMMITTEE.description,
  SPORTS_COMMITTEE: ROLE_DEFINITIONS.SPORTS_COMMITTEE.description,
  PRESIDENT: ROLE_DEFINITIONS.PRESIDENT.description,
  DEPUTY_WARDEN: ROLE_DEFINITIONS.DEPUTY_WARDEN.description,
  WARDEN: ROLE_DEFINITIONS.WARDEN.description,
  SUPER_ADMIN: ROLE_DEFINITIONS.SUPER_ADMIN.description,
}

/**
 * Check if a role possesses a specific permission.
 */
export function hasPermission(role: RoleName, permission: PermissionKey): boolean {
  const def = ROLE_DEFINITIONS[role]
  if (!def) return false
  return def.permissions.includes(permission)
}

/**
 * Check if a user possesses any of the provided permissions.
 */
export function hasAnyPermission(role: RoleName, permissions: PermissionKey[]): boolean {
  return permissions.some((p) => hasPermission(role, p))
}

/**
 * Check if a user possesses all of the provided permissions.
 */
export function hasAllPermissions(role: RoleName, permissions: PermissionKey[]): boolean {
  return permissions.every((p) => hasPermission(role, p))
}
