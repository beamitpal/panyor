import { pgTable, text, integer, timestamp, boolean, pgEnum, jsonb, uniqueIndex, index } from "drizzle-orm/pg-core"
import { relations } from "drizzle-orm"

// ==========================================
// ENUMS & CONSTANTS
// ==========================================

export const roleEnum = pgEnum("user_role", [
  "STUDENT",
  "CARETAKER",
  "MESS_EMPLOYEE",
  "MESS_COMMITTEE",
  "SPORTS_COMMITTEE",
  "PRESIDENT",
  "DEPUTY_WARDEN",
  "WARDEN",
  "SUPER_ADMIN",
])

export const accountStatusEnum = pgEnum("account_status", [
  "PENDING",
  "APPROVED",
  "REJECTED",
  "SUSPENDED",
])

export const roomStatusEnum = pgEnum("room_status", [
  "VACANT",
  "AVAILABLE",
  "FULL",
  "MAINTENANCE",
])

export const equipmentConditionEnum = pgEnum("equipment_condition", [
  "EXCELLENT",
  "GOOD",
  "FAIR",
  "POOR",
  "DAMAGED",
])

export const equipmentStatusEnum = pgEnum("equipment_status", [
  "AVAILABLE",
  "ISSUED",
  "DAMAGED",
  "LOST",
  "MAINTENANCE",
  "RETIRED",
])

export const equipmentRequestStatusEnum = pgEnum("equipment_request_status", [
  "PENDING",
  "APPROVED",
  "REJECTED",
  "ISSUED",
  "RETURNED",
  "OVERDUE",
  "CANCELLED",
])

export const equipmentTransactionStatusEnum = pgEnum("equipment_transaction_status", [
  "ISSUED",
  "RETURNED",
  "OVERDUE",
  "DAMAGED",
  "LOST",
])

export const complaintPriorityEnum = pgEnum("complaint_priority", [
  "LOW",
  "MEDIUM",
  "HIGH",
  "URGENT",
])

export const complaintStatusEnum = pgEnum("complaint_status", [
  "OPEN",
  "ACKNOWLEDGED",
  "IN_PROGRESS",
  "RESOLVED",
  "CLOSED",
  "REJECTED",
])

export const messCategoryEnum = pgEnum("mess_category", [
  "VEG",
  "NON_VEG",
  "PANEER",
  "EGGS",
  "SPECIAL",
  "OTHER",
])

export const mealTypeEnum = pgEnum("meal_type", [
  "BREAKFAST",
  "LUNCH",
  "SNACKS",
  "DINNER",
])

export const messDistributionStatusEnum = pgEnum("mess_distribution_status", [
  "RECEIVED",
  "NOT_COLLECTED",
  "EXCUSED",
])

export const mealCollectionTypeEnum = pgEnum("meal_collection_type", [
  "SELF",
  "PROXY",
])

export const delegationStatusEnum = pgEnum("delegation_status", [
  "ACTIVE",
  "CONSUMED",
  "CANCELLED",
  "EXPIRED",
])

export const noticeCategoryEnum = pgEnum("notice_category", [
  "GENERAL",
  "ACADEMIC",
  "MESS",
  "MAINTENANCE",
  "SPORTS",
  "URGENT",
  "EVENT",
])

export const noticePriorityEnum = pgEnum("notice_priority", [
  "LOW",
  "NORMAL",
  "HIGH",
  "URGENT",
])

export const notificationTypeEnum = pgEnum("notification_type", [
  "REGISTRATION",
  "EQUIPMENT_REQUEST",
  "EQUIPMENT_OVERDUE",
  "COMPLAINT_UPDATE",
  "COMPLAINT_URGENT",
  "NOTICE",
  "APPROVAL",
  "MESS",
  "SYSTEM",
])

// ==========================================
// BETTER AUTH TABLES
// ==========================================

export const users = pgTable("users", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  emailVerified: boolean("email_verified").default(false).notNull(),
  image: text("image"),
  phone: text("phone"),
  role: roleEnum("role").default("STUDENT").notNull(),
  status: accountStatusEnum("status").default("PENDING").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
})

export const sessions = pgTable("sessions", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  token: text("token").notNull().unique(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
})

export const accounts = pgTable("accounts", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  accountId: text("account_id").notNull(),
  providerId: text("provider_id").notNull(),
  accessToken: text("access_token"),
  refreshToken: text("refresh_token"),
  idToken: text("id_token"),
  accessTokenExpiresAt: timestamp("access_token_expires_at", { withTimezone: true }),
  refreshTokenExpiresAt: timestamp("refresh_token_expires_at", { withTimezone: true }),
  scope: text("scope"),
  expiresAt: timestamp("expires_at", { withTimezone: true }),
  password: text("password"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
})

export const verifications = pgTable("verifications", {
  id: text("id").primaryKey(),
  identifier: text("identifier").notNull(),
  value: text("value").notNull(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
})

// ==========================================
// RBAC TABLES
// ==========================================

export const permissions = pgTable("permissions", {
  id: text("id").primaryKey(),
  key: text("key").notNull().unique(),
  name: text("name").notNull(),
  category: text("category").notNull(),
  description: text("description"),
})

export const rolePermissions = pgTable("role_permissions", {
  id: text("id").primaryKey(),
  role: roleEnum("role").notNull(),
  permissionKey: text("permission_key").notNull().references(() => permissions.key, { onDelete: "cascade" }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
})

// A person can hold several roles at once (e.g. STUDENT + PRESIDENT,
// STUDENT + MESS_COMMITTEE) on a single account. `users.role` remains the
// primary role; this table carries the additional assignments.
export const userRoles = pgTable(
  "user_roles",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    role: roleEnum("role").notNull(),
    assignedBy: text("assigned_by").references(() => users.id, { onDelete: "set null" }),
    assignedAt: timestamp("assigned_at", { withTimezone: true }).defaultNow().notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [uniqueIndex("unique_user_role_idx").on(table.userId, table.role)]
)

export const userRolesRelations = relations(userRoles, ({ one }) => ({
  user: one(users, {
    fields: [userRoles.userId],
    references: [users.id],
    relationName: "user_roles_user",
  }),
  assignedByUser: one(users, {
    fields: [userRoles.assignedBy],
    references: [users.id],
    relationName: "user_roles_assigner",
  }),
}))

// ==========================================
// HOSTEL ROOMS & ALLOCATIONS
// ==========================================

export const rooms = pgTable("rooms", {
  id: text("id").primaryKey(),
  roomNumber: text("room_number").notNull().unique(),
  floor: integer("floor").notNull().default(1),
  block: text("block").notNull().default("Main Block"),
  capacity: integer("capacity").notNull().default(2), // Max 2 per double occupancy constraint
  status: roomStatusEnum("status").notNull().default("VACANT"),
  notes: text("notes"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
})

export const studentProfiles = pgTable("student_profiles", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }).unique(),
  studentId: text("student_id").notNull().unique(), // e.g. RGU/2024/CSE/042
  enrollmentNo: text("enrollment_no").notNull().unique(),
  department: text("department").notNull(),
  program: text("program").notNull(), // e.g. B.Tech, M.Tech, M.Sc, Ph.D
  year: integer("year").notNull().default(1),
  semester: integer("semester").notNull().default(1),
  roomId: text("room_id").references(() => rooms.id, { onDelete: "set null" }),
  bedNumber: integer("bed_number"), // 1 or 2
  approvalStatus: accountStatusEnum("approval_status").notNull().default("PENDING"),
  approvedBy: text("approved_by").references(() => users.id),
  approvedAt: timestamp("approved_at", { withTimezone: true }),
  rejectionReason: text("rejection_reason"),
  emergencyContactName: text("emergency_contact_name"),
  emergencyContactPhone: text("emergency_contact_phone"),
  bloodGroup: text("blood_group"),
  address: text("address"),
  avatarUrl: text("avatar_url"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
})

export const roomAssignments = pgTable("room_assignments", {
  id: text("id").primaryKey(),
  roomId: text("room_id").notNull().references(() => rooms.id, { onDelete: "cascade" }),
  studentProfileId: text("student_profile_id").notNull().references(() => studentProfiles.id, { onDelete: "cascade" }),
  bedNumber: integer("bed_number").notNull(), // 1 or 2
  assignedFrom: timestamp("assigned_from", { withTimezone: true }).defaultNow().notNull(),
  assignedTo: timestamp("assigned_to", { withTimezone: true }),
  status: text("status").notNull().default("ACTIVE"), // ACTIVE, VACATED, TRANSFERRED
  assignedBy: text("assigned_by").references(() => users.id),
  notes: text("notes"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
})

// ==========================================
// EQUIPMENT & SPORTS INVENTORY
// ==========================================

export const equipmentCategories = pgTable("equipment_categories", {
  id: text("id").primaryKey(),
  name: text("name").notNull().unique(),
  icon: text("icon").notNull().default("Trophy"),
  description: text("description"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
})

export const equipment = pgTable("equipment", {
  id: text("id").primaryKey(),
  categoryId: text("category_id").notNull().references(() => equipmentCategories.id, { onDelete: "restrict" }),
  name: text("name").notNull(),
  code: text("code").notNull().unique(), // e.g. EQ-FB-01
  description: text("description"),
  imageUrl: text("image_url"),
  totalQuantity: integer("total_quantity").notNull().default(1),
  availableQuantity: integer("available_quantity").notNull().default(1),
  issuedQuantity: integer("issued_quantity").notNull().default(0),
  damagedQuantity: integer("damaged_quantity").notNull().default(0),
  lostQuantity: integer("lost_quantity").notNull().default(0),
  maintenanceQuantity: integer("maintenance_quantity").notNull().default(0),
  condition: equipmentConditionEnum("condition").notNull().default("GOOD"),
  status: equipmentStatusEnum("status").notNull().default("AVAILABLE"),
  replacementCost: integer("replacement_cost").default(0),
  purchaseDate: timestamp("purchase_date", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
})

export const equipmentRequests = pgTable("equipment_requests", {
  id: text("id").primaryKey(),
  studentProfileId: text("student_profile_id").notNull().references(() => studentProfiles.id, { onDelete: "cascade" }),
  equipmentId: text("equipment_id").notNull().references(() => equipment.id, { onDelete: "cascade" }),
  quantity: integer("quantity").notNull().default(1),
  purpose: text("purpose"),
  expectedReturnDate: timestamp("expected_return_date", { withTimezone: true }).notNull(),
  status: equipmentRequestStatusEnum("status").notNull().default("PENDING"),
  reviewedBy: text("reviewed_by").references(() => users.id),
  reviewNotes: text("review_notes"),
  reviewedAt: timestamp("reviewed_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
})

export const equipmentTransactions = pgTable("equipment_transactions", {
  id: text("id").primaryKey(),
  equipmentId: text("equipment_id").notNull().references(() => equipment.id, { onDelete: "cascade" }),
  studentProfileId: text("student_profile_id").notNull().references(() => studentProfiles.id, { onDelete: "cascade" }),
  requestId: text("request_id").references(() => equipmentRequests.id, { onDelete: "set null" }),
  quantity: integer("quantity").notNull().default(1),
  issuedBy: text("issued_by").notNull().references(() => users.id),
  issuedAt: timestamp("issued_at", { withTimezone: true }).defaultNow().notNull(),
  expectedReturnDate: timestamp("expected_return_date", { withTimezone: true }).notNull(),
  actualReturnDate: timestamp("actual_return_date", { withTimezone: true }),
  returnedTo: text("returned_to").references(() => users.id),
  conditionBefore: equipmentConditionEnum("condition_before").notNull().default("GOOD"),
  conditionAfter: equipmentConditionEnum("condition_after"),
  status: equipmentTransactionStatusEnum("status").notNull().default("ISSUED"),
  damageNotes: text("damage_notes"),
  fineAmount: integer("fine_amount").default(0),
  notes: text("notes"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
})

// ==========================================
// COMPLAINTS & TICKETS
// ==========================================

export const complaintCategories = pgTable("complaint_categories", {
  id: text("id").primaryKey(),
  name: text("name").notNull().unique(), // Electricity, Water, Plumbing, Room, Furniture, Internet, etc.
  description: text("description"),
  icon: text("icon").notNull().default("AlertCircle"),
  defaultPriority: complaintPriorityEnum("default_priority").notNull().default("MEDIUM"),
})

export const complaints = pgTable("complaints", {
  id: text("id").primaryKey(),
  ticketNumber: text("ticket_number").notNull().unique(), // e.g. CMP-2026-001
  studentProfileId: text("student_profile_id").notNull().references(() => studentProfiles.id, { onDelete: "cascade" }),
  categoryId: text("category_id").notNull().references(() => complaintCategories.id, { onDelete: "restrict" }),
  roomId: text("room_id").references(() => rooms.id, { onDelete: "set null" }),
  title: text("title").notNull(),
  description: text("description").notNull(),
  priority: complaintPriorityEnum("priority").notNull().default("MEDIUM"),
  status: complaintStatusEnum("status").notNull().default("OPEN"),
  assignedTo: text("assigned_to").references(() => users.id),
  assignedAt: timestamp("assigned_at", { withTimezone: true }),
  resolvedAt: timestamp("resolved_at", { withTimezone: true }),
  closedAt: timestamp("closed_at", { withTimezone: true }),
  resolutionNotes: text("resolution_notes"),
  studentFeedbackRating: integer("student_feedback_rating"), // 1-5 stars
  studentFeedbackNotes: text("student_feedback_notes"),
  attachmentUrls: jsonb("attachment_urls").$type<string[]>().default([]),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
})

export const complaintComments = pgTable("complaint_comments", {
  id: text("id").primaryKey(),
  complaintId: text("complaint_id").notNull().references(() => complaints.id, { onDelete: "cascade" }),
  userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  message: text("message").notNull(),
  isInternal: boolean("is_internal").notNull().default(false), // true for staff-only private notes
  attachmentUrls: jsonb("attachment_urls").$type<string[]>().default([]),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
})

// ==========================================
// MESS & FOOD DISTRIBUTION
// ==========================================

export const messItems = pgTable("mess_items", {
  id: text("id").primaryKey(),
  name: text("name").notNull(), // e.g. "Veg Thali", "Chicken Curry & Rice", "Paneer Butter Masala", "Boiled Eggs (2)"
  category: messCategoryEnum("category").notNull().default("VEG"),
  description: text("description"),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
})

export const messDistributions = pgTable("mess_distributions", {
  id: text("id").primaryKey(),
  distributionDate: text("distribution_date").notNull(), // YYYY-MM-DD string for strict date queries
  mealType: mealTypeEnum("meal_type").notNull(),
  messItemId: text("mess_item_id").notNull().references(() => messItems.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  description: text("description"),
  totalExpected: integer("total_expected").notNull().default(0),
  totalDistributed: integer("total_distributed").notNull().default(0),
  status: text("status").notNull().default("ACTIVE"), // SCHEDULED, ACTIVE, COMPLETED
  createdBy: text("created_by").references(() => users.id),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
})

export const messDistributionRecords = pgTable(
  "mess_distribution_records",
  {
    id: text("id").primaryKey(),
    distributionId: text("distribution_id").notNull().references(() => messDistributions.id, { onDelete: "cascade" }),
    studentProfileId: text("student_profile_id").notNull().references(() => studentProfiles.id, { onDelete: "cascade" }),
    roomId: text("room_id").references(() => rooms.id, { onDelete: "set null" }),
    messItemId: text("mess_item_id").notNull().references(() => messItems.id, { onDelete: "cascade" }),
    mealType: mealTypeEnum("meal_type").notNull(),
    distributionDate: text("distribution_date").notNull(), // YYYY-MM-DD
    status: messDistributionStatusEnum("status").notNull().default("RECEIVED"),
    distributedAt: timestamp("distributed_at", { withTimezone: true }).defaultNow().notNull(),
    recordedBy: text("recorded_by").notNull().references(() => users.id),
    // Proxy / delegation pickup (§15-§24). The meal always belongs to the
    // beneficiary (studentProfileId); the collector only carries it.
    collectionType: mealCollectionTypeEnum("collection_type").notNull().default("SELF"),
    collectorStudentProfileId: text("collector_student_profile_id").references(() => studentProfiles.id, {
      onDelete: "set null",
    }),
    delegationId: text("delegation_id"),
    notes: text("notes"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex("unique_student_meal_item_idx").on(
      table.distributionDate,
      table.mealType,
      table.messItemId,
      table.studentProfileId
    ),
    index("mess_dist_date_idx").on(table.distributionDate),
    index("mess_dist_room_idx").on(table.roomId),
    index("mess_dist_collector_idx").on(table.collectorStudentProfileId),
  ]
)

// Meal delegation / proxy pickup (§15-§24).
// BENEFICIARY = the student whose meal entitlement is consumed (exactly one
// mess_distribution_records row is ever created for them).
// COLLECTOR = the student physically collecting the meal.
// RECORDED BY = the mess employee processing the collection.
export const mealPickupDelegations = pgTable(
  "meal_pickup_delegations",
  {
    id: text("id").primaryKey(),
    beneficiaryStudentProfileId: text("beneficiary_student_profile_id")
      .notNull()
      .references(() => studentProfiles.id, { onDelete: "cascade" }),
    collectorStudentProfileId: text("collector_student_profile_id")
      .notNull()
      .references(() => studentProfiles.id, { onDelete: "cascade" }),
    distributionId: text("distribution_id")
      .notNull()
      .references(() => messDistributions.id, { onDelete: "cascade" }),
    distributionDate: text("distribution_date").notNull(), // YYYY-MM-DD
    mealType: mealTypeEnum("meal_type").notNull(),
    status: delegationStatusEnum("status").notNull().default("ACTIVE"),
    // User who created the delegation (beneficiary for prior delegation,
    // mess employee for same-day operational proxy pickup).
    requestedBy: text("requested_by").references(() => users.id, { onDelete: "set null" }),
    recordedBy: text("recorded_by").references(() => users.id, { onDelete: "set null" }),
    collectedAt: timestamp("collected_at", { withTimezone: true }),
    notes: text("notes"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    // At most one delegation per beneficiary + distribution + status, so a
    // consumed delegation cannot be re-created and a second active delegation
    // cannot shadow the first.
    uniqueIndex("unique_delegation_beneficiary_dist_idx").on(
      table.distributionId,
      table.beneficiaryStudentProfileId,
      table.status
    ),
    index("meal_deleg_collector_idx").on(table.collectorStudentProfileId),
    index("meal_deleg_status_idx").on(table.status),
  ]
)

// ==========================================
// NOTICES & ANNOUNCEMENTS
// ==========================================

export const notices = pgTable("notices", {
  id: text("id").primaryKey(),
  title: text("title").notNull(),
  slug: text("slug").notNull().unique(),
  content: text("content").notNull(),
  category: noticeCategoryEnum("category").notNull().default("GENERAL"),
  priority: noticePriorityEnum("priority").notNull().default("NORMAL"),
  targetAudiences: jsonb("target_audiences").$type<string[]>().notNull().default(["ALL"]), // ALL, STUDENTS, WARDEN, CARETAKER, etc.
  isPublished: boolean("is_published").notNull().default(true),
  publishedAt: timestamp("published_at", { withTimezone: true }).defaultNow().notNull(),
  expiresAt: timestamp("expires_at", { withTimezone: true }),
  attachmentUrls: jsonb("attachment_urls").$type<string[]>().default([]),
  authorId: text("author_id").notNull().references(() => users.id),
  viewCount: integer("view_count").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
})

// ==========================================
// NOTIFICATIONS & AUDIT LOGS
// ==========================================

export const notifications = pgTable("notifications", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  type: notificationTypeEnum("type").notNull().default("SYSTEM"),
  title: text("title").notNull(),
  message: text("message").notNull(),
  linkUrl: text("link_url"),
  isRead: boolean("is_read").notNull().default(false),
  readAt: timestamp("read_at", { withTimezone: true }),
  metadata: jsonb("metadata").$type<Record<string, unknown>>(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
})

export const auditLogs = pgTable("audit_logs", {
  id: text("id").primaryKey(),
  actorId: text("actor_id").references(() => users.id, { onDelete: "set null" }),
  actorEmail: text("actor_email"),
  actorRole: text("actor_role"),
  action: text("action").notNull(), // e.g. student.approve, equipment.issue, mess.record
  resource: text("resource").notNull(), // e.g. student_profiles, equipment, complaints
  resourceId: text("resource_id"),
  metadata: jsonb("metadata").$type<Record<string, unknown>>(),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
})

// ==========================================
// RELATIONS
// ==========================================

export const usersRelations = relations(users, ({ one, many }) => ({
  studentProfile: one(studentProfiles, {
    fields: [users.id],
    references: [studentProfiles.userId],
  }),
  sessions: many(sessions),
  accounts: many(accounts),
  notices: many(notices),
  notifications: many(notifications),
  auditLogs: many(auditLogs),
  userRoles: many(userRoles, { relationName: "user_roles_user" }),
  assignedRoles: many(userRoles, { relationName: "user_roles_assigner" }),
}))

export const sessionsRelations = relations(sessions, ({ one }) => ({
  user: one(users, {
    fields: [sessions.userId],
    references: [users.id],
  }),
}))

export const accountsRelations = relations(accounts, ({ one }) => ({
  user: one(users, {
    fields: [accounts.userId],
    references: [users.id],
  }),
}))

export const studentProfilesRelations = relations(studentProfiles, ({ one, many }) => ({
  user: one(users, {
    fields: [studentProfiles.userId],
    references: [users.id],
  }),
  room: one(rooms, {
    fields: [studentProfiles.roomId],
    references: [rooms.id],
  }),
  roomAssignments: many(roomAssignments),
  equipmentRequests: many(equipmentRequests),
  equipmentTransactions: many(equipmentTransactions),
  complaints: many(complaints),
  messDistributionRecords: many(messDistributionRecords),
}))

export const roomsRelations = relations(rooms, ({ many }) => ({
  students: many(studentProfiles),
  assignments: many(roomAssignments),
  complaints: many(complaints),
}))

export const equipmentRelations = relations(equipment, ({ one, many }) => ({
  category: one(equipmentCategories, {
    fields: [equipment.categoryId],
    references: [equipmentCategories.id],
  }),
  requests: many(equipmentRequests),
  transactions: many(equipmentTransactions),
}))

export const complaintsRelations = relations(complaints, ({ one, many }) => ({
  student: one(studentProfiles, {
    fields: [complaints.studentProfileId],
    references: [studentProfiles.id],
  }),
  category: one(complaintCategories, {
    fields: [complaints.categoryId],
    references: [complaintCategories.id],
  }),
  room: one(rooms, {
    fields: [complaints.roomId],
    references: [rooms.id],
  }),
  assignedUser: one(users, {
    fields: [complaints.assignedTo],
    references: [users.id],
  }),
  comments: many(complaintComments),
}))

export const messDistributionsRelations = relations(messDistributions, ({ one, many }) => ({
  messItem: one(messItems, {
    fields: [messDistributions.messItemId],
    references: [messItems.id],
  }),
  creator: one(users, {
    fields: [messDistributions.createdBy],
    references: [users.id],
  }),
  records: many(messDistributionRecords),
}))
