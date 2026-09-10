import type { RoleName } from "@/lib/permissions/rbac"

export type { RoleName }

export type UserRole = RoleName

export type StudentApprovalStatus =
  | "PENDING"
  | "APPROVED"
  | "REJECTED"
  | "SUSPENDED"

export type AccountStatus = 
  | "PENDING"
  | "APPROVED"
  | "REJECTED"
  | "SUSPENDED"

export type RoomStatus =
  | "AVAILABLE"
  | "FULL"
  | "PARTIALLY_OCCUPIED"
  | "OCCUPIED"
  | "VACANT"
  | "MAINTENANCE"
  | "RESERVED"

export type RoomWithOccupants = {
  id: string
  roomNumber: string
  block: string
  floor: number
  capacity?: number
  occupancy: number
  status: RoomStatus
  notes?: string | null
  students: Array<{
    id: string
    name: string
    studentId: string
    bedNumber: number
    avatarUrl?: string
    department?: string
    email?: string
    phone?: string
    program?: string
    roomNumber?: string | null
  }>
  createdAt?: string
  updatedAt?: string
}

export type EquipmentCondition =
  | "NEW"
  | "EXCELLENT"
  | "GOOD"
  | "FAIR"
  | "DAMAGED"
  | "LOST"

export type EquipmentRequestStatus =
  | "PENDING"
  | "APPROVED"
  | "REJECTED"
  | "ISSUED"
  | "RETURNED"
  | "CANCELLED"

export type EquipmentTransactionStatus =
  | "ACTIVE"
  | "ISSUED"
  | "RETURNED"
  | "DAMAGED"
  | "LOST"
  | "OVERDUE"

export type ComplaintStatus =
  | "OPEN"
  | "ACKNOWLEDGED"
  | "IN_PROGRESS"
  | "RESOLVED"
  | "CLOSED"
  | "REJECTED"

export type ComplaintPriority =
  | "LOW"
  | "MEDIUM"
  | "HIGH"
  | "URGENT"

export type MealType =
  | "BREAKFAST"
  | "LUNCH"
  | "SNACKS"
  | "DINNER"

export type MessCategory =
  | "VEG"
  | "NON_VEG"
  | "PANEER"
  | "EGGS"
  | "SPECIAL"

export type NoticePriority =
  | "LOW"
  | "NORMAL"
  | "HIGH"
  | "CRITICAL"

export type NoticeCategory =
  | "GENERAL"
  | "MESS"
  | "DISCIPLINE"
  | "MAINTENANCE"
  | "EVENT"
  | "EMERGENCY"
  | "SPORTS"

export type NoticeAudience =
  | "ALL"
  | "STUDENTS"
  | "WARDEN"
  | "DEPUTY_WARDEN"
  | "CARETAKER"
  | "PRESIDENT"
  | "MESS_COMMITTEE"
  | "SPORTS_COMMITTEE"
  | "MESS_EMPLOYEE"

export type NotificationType =
  | "STUDENT_APPROVAL"
  | "STUDENT_REJECTION"
  | "REGISTRATION"
  | "APPROVAL"
  | "ROOM_ALLOCATION"
  | "EQUIPMENT_REQUEST"
  | "EQUIPMENT_ISSUED"
  | "EQUIPMENT_OVERDUE"
  | "COMPLAINT_UPDATE"
  | "COMPLAINT_URGENT"
  | "MESS_ANNOUNCEMENT"
  | "NOTICE"
  | "NOTICE_PUBLISHED"
  | "SYSTEM_ALERT"

export interface UserSession {
  id: string
  name: string
  email: string
  role: RoleName
  roles?: RoleName[]
  status: "APPROVED" | "PENDING" | "SUSPENDED" | "REJECTED"
  image?: string | null
  phone?: string | null
  studentProfile?: StudentProfileWithDetails | null
}

export interface StudentProfileItem {
  id: string
  userId?: string | null
  name: string
  email: string
  phone: string
  studentId: string
  enrollmentNo: string
  department: string
  program: string
  semester: number
  year: number
  academicYear: string
  homeAddress?: string | null
  guardianName?: string | null
  guardianPhone?: string | null
  bloodGroup?: string | null
  approvalStatus: StudentApprovalStatus
  approvedBy?: string | null
  approvedAt?: string | null
  rejectionReason?: string | null
  suspendedReason?: string | null
  avatarUrl?: string | null
  idCardUrl?: string | null
  admissionSlipUrl?: string | null
  roomId?: string | null
  roomNumber?: string | null
  bedNumber?: number | null
  createdAt: string
  updatedAt: string
}

export interface StudentProfileWithDetails extends StudentProfileItem {
  roomBlock?: string | null
  roomFloor?: number | null
  emergencyContactName?: string
  emergencyContactPhone?: string
  bloodGroup?: string
  address?: string
  avatarUrl?: string
  idCardUrl?: string
  admissionSlipUrl?: string
  approvedByName?: string
}

export interface RoomItem {
  id: string
  roomNumber: string
  block: string
  floor: number
  capacity: number
  occupancy: number
  status: RoomStatus
  description?: string | null
  students: {
    id: string
    name: string
    studentId: string
    bedNumber: number
    avatarUrl?: string | null
    department?: string
  }[]
  createdAt: string
  updatedAt: string
}

export interface EquipmentCategoryItem {
  id: string
  name: string
  description?: string | null
  icon?: string | null
}

export interface EquipmentItemDef {
  id: string
  categoryId: string
  categoryName?: string
  name: string
  code: string
  description?: string | null
  totalQuantity: number
  availableQuantity: number
  issuedQuantity: number
  damagedQuantity: number
  lostQuantity: number
  maintenanceQuantity?: number
  condition?: string
  status?: string
  replacementCost?: number
  finePerDay?: number
  imageUrl?: string | null
  createdAt: string
  updatedAt: string
}

export type EquipmentItem = EquipmentItemDef

// Legacy alias used by services and seed data
export type EquipmentCategory = EquipmentCategoryItem

export type EquipmentStatus =
  | "AVAILABLE"
  | "ISSUED"
  | "MAINTENANCE"
  | "DAMAGED"
  | "LOST"
  | "RETIRED"

export type MessDistributionStatus =
  | "ACTIVE"
  | "COMPLETED"
  | "CANCELLED"
  | "DRAFT"

export interface EquipmentRequestWithDetails {
  id: string
  equipmentId: string
  equipmentName: string
  equipmentCode?: string
  equipmentCategory?: string | null
  studentProfileId: string
  studentName: string
  studentId: string
  roomNumber?: string | null
  quantity: number
  purpose?: string | null
  expectedReturnDate?: string | null
  status: EquipmentRequestStatus
  statusReason?: string | null
  reviewNotes?: string | null
  reviewedBy?: string | null
  reviewedByName?: string | null
  reviewedAt?: string | null
  requestedAt?: string
  createdAt?: string
  updatedAt?: string
}

export interface EquipmentTransactionWithDetails {
  id: string
  equipmentId: string
  equipmentName: string
  studentProfileId: string
  studentName: string
  studentId: string
  roomNumber?: string | null
  quantity: number
  status: EquipmentTransactionStatus
  requestId?: string | null
  issuedBy: string
  issuedByName: string
  issuedAt: string
  expectedReturnDate: string
  actualReturnDate?: string | null
  receivedBy?: string | null
  receivedByName?: string | null
  returnedTo?: string | null
  returnedToName?: string | null
  conditionBefore: EquipmentCondition
  conditionAfter?: EquipmentCondition | null
  damageNotes?: string | null
  fineAmount?: number | null
  fineStatus?: string | null
  remarks?: string | null
  notes?: string | null
  createdAt?: string
  updatedAt?: string
}

export interface ComplaintCategoryDef {
  id: string
  name: string
  description?: string | null
  icon?: string | null
}

export interface ComplaintWithDetails {
  id: string
  ticketNumber: string
  studentProfileId: string
  studentName: string
  studentId?: string | null
  studentEmail: string
  studentPhone: string
  roomId?: string | null
  roomNumber?: string | null
  categoryId: string
  categoryName: string
  categoryIcon?: string | null
  priority: ComplaintPriority
  status: ComplaintStatus
  title: string
  description: string
  location?: string | null
  assignedTo?: string | null
  assignedToName?: string | null
  assignedAt?: string | null
  resolvedAt?: string | null
  closedAt?: string | null
  resolutionNotes?: string | null
  studentFeedbackRating?: number | null
  studentFeedbackNotes?: string | null
  attachmentUrls?: string[]
  commentsCount?: number
  createdAt: string
  updatedAt: string
}

export interface ComplaintCommentItem {
  id: string
  complaintId: string
  userId: string
  userName: string
  userRole: string
  userAvatar?: string | null
  message: string
  isInternal: boolean
  attachmentUrls?: string[]
  createdAt: string
}

export interface MessItemDef {
  id: string
  name: string
  category: MessCategory
  description?: string | null
  isActive: boolean
  createdAt?: string
}

export interface MessDistributionWithDetails {
  id: string
  mealType: MealType
  messItemId: string
  messItemName: string
  messCategory: MessCategory
  distributionDate: string
  title: string
  description?: string | null
  totalExpected: number
  totalDistributed: number
  status: string
  createdByName?: string | null
  createdAt: string
}

export type MealCollectionType = "SELF" | "PROXY"
export type DelegationStatus = "ACTIVE" | "CONSUMED" | "CANCELLED" | "EXPIRED"

export interface MealPickupDelegationItem {
  id: string
  beneficiaryStudentProfileId: string
  beneficiaryName: string
  collectorStudentProfileId: string
  collectorName: string
  distributionId: string
  distributionDate: string
  mealType: MealType
  status: DelegationStatus
  requestedBy?: string | null
  recordedBy?: string | null
  collectedAt?: string | null
  createdAt: string
  updatedAt: string
}

export interface MessRecordWithDetails {
  id: string
  distributionId: string
  studentProfileId: string
  studentName: string
  studentId: string
  roomId?: string | null
  roomNumber?: string | null
  mealType: MealType
  messItemId: string
  messItemName: string
  messCategory: MessCategory
  distributionDate: string
  status: string
  distributedAt: string
  recordedBy: string
  recordedByName: string
  notes?: string | null
  createdAt?: string
  collectionType?: MealCollectionType
  collectorStudentProfileId?: string | null
  collectorName?: string | null
  delegationId?: string | null
}

export interface NoticeWithDetails {
  id: string
  title: string
  slug?: string | null
  content: string
  category: NoticeCategory
  priority: NoticePriority
  targetAudiences: NoticeAudience[]
  authorId: string
  authorName: string
  authorRole: string
  isPinned?: boolean
  isPublished?: boolean
  attachmentUrls?: string[]
  expiresAt?: string | null
  viewCount: number
  publishedAt: string
  createdAt?: string
  updatedAt?: string
}

export interface NotificationItem {
  id: string
  userId: string
  title: string
  message: string
  type: NotificationType
  read?: boolean
  isRead?: boolean
  readAt?: string | null
  link?: string | null
  linkUrl?: string | null
  metadata?: Record<string, unknown>
  createdAt: string
}

export interface AuditLogItem {
  id: string
  actorId?: string | null
  actorName?: string | null
  actorEmail?: string | null
  actorRole?: string | null
  action: string
  resource: string
  resourceType?: string | null
  resourceId?: string | null
  metadata?: Record<string, unknown>
  ipAddress?: string | null
  userAgent?: string | null
  createdAt: string
}
