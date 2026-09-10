CREATE TYPE "public"."account_status" AS ENUM('PENDING', 'APPROVED', 'REJECTED', 'SUSPENDED');--> statement-breakpoint
CREATE TYPE "public"."complaint_priority" AS ENUM('LOW', 'MEDIUM', 'HIGH', 'URGENT');--> statement-breakpoint
CREATE TYPE "public"."complaint_status" AS ENUM('OPEN', 'ACKNOWLEDGED', 'IN_PROGRESS', 'RESOLVED', 'CLOSED', 'REJECTED');--> statement-breakpoint
CREATE TYPE "public"."delegation_status" AS ENUM('ACTIVE', 'CONSUMED', 'CANCELLED', 'EXPIRED');--> statement-breakpoint
CREATE TYPE "public"."equipment_condition" AS ENUM('EXCELLENT', 'GOOD', 'FAIR', 'POOR', 'DAMAGED');--> statement-breakpoint
CREATE TYPE "public"."equipment_request_status" AS ENUM('PENDING', 'APPROVED', 'REJECTED', 'ISSUED', 'RETURNED', 'OVERDUE', 'CANCELLED');--> statement-breakpoint
CREATE TYPE "public"."equipment_status" AS ENUM('AVAILABLE', 'ISSUED', 'DAMAGED', 'LOST', 'MAINTENANCE', 'RETIRED');--> statement-breakpoint
CREATE TYPE "public"."equipment_transaction_status" AS ENUM('ISSUED', 'RETURNED', 'OVERDUE', 'DAMAGED', 'LOST');--> statement-breakpoint
CREATE TYPE "public"."meal_collection_type" AS ENUM('SELF', 'PROXY');--> statement-breakpoint
CREATE TYPE "public"."meal_type" AS ENUM('BREAKFAST', 'LUNCH', 'SNACKS', 'DINNER');--> statement-breakpoint
CREATE TYPE "public"."mess_category" AS ENUM('VEG', 'NON_VEG', 'PANEER', 'EGGS', 'SPECIAL', 'OTHER');--> statement-breakpoint
CREATE TYPE "public"."mess_distribution_status" AS ENUM('RECEIVED', 'NOT_COLLECTED', 'EXCUSED');--> statement-breakpoint
CREATE TYPE "public"."notice_category" AS ENUM('GENERAL', 'ACADEMIC', 'MESS', 'MAINTENANCE', 'SPORTS', 'URGENT', 'EVENT');--> statement-breakpoint
CREATE TYPE "public"."notice_priority" AS ENUM('LOW', 'NORMAL', 'HIGH', 'URGENT');--> statement-breakpoint
CREATE TYPE "public"."notification_type" AS ENUM('REGISTRATION', 'EQUIPMENT_REQUEST', 'EQUIPMENT_OVERDUE', 'COMPLAINT_UPDATE', 'COMPLAINT_URGENT', 'NOTICE', 'APPROVAL', 'MESS', 'SYSTEM');--> statement-breakpoint
CREATE TYPE "public"."user_role" AS ENUM('STUDENT', 'CARETAKER', 'MESS_EMPLOYEE', 'MESS_COMMITTEE', 'PRESIDENT', 'DEPUTY_WARDEN', 'WARDEN', 'SUPER_ADMIN');--> statement-breakpoint
CREATE TYPE "public"."room_status" AS ENUM('VACANT', 'AVAILABLE', 'FULL', 'MAINTENANCE');--> statement-breakpoint
CREATE TABLE "accounts" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"account_id" text NOT NULL,
	"provider_id" text NOT NULL,
	"access_token" text,
	"refresh_token" text,
	"expires_at" timestamp with time zone,
	"password" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "audit_logs" (
	"id" text PRIMARY KEY NOT NULL,
	"actor_id" text,
	"actor_email" text,
	"actor_role" text,
	"action" text NOT NULL,
	"resource" text NOT NULL,
	"resource_id" text,
	"metadata" jsonb,
	"ip_address" text,
	"user_agent" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "complaint_categories" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"icon" text DEFAULT 'AlertCircle' NOT NULL,
	"default_priority" "complaint_priority" DEFAULT 'MEDIUM' NOT NULL,
	CONSTRAINT "complaint_categories_name_unique" UNIQUE("name")
);
--> statement-breakpoint
CREATE TABLE "complaint_comments" (
	"id" text PRIMARY KEY NOT NULL,
	"complaint_id" text NOT NULL,
	"user_id" text NOT NULL,
	"message" text NOT NULL,
	"is_internal" boolean DEFAULT false NOT NULL,
	"attachment_urls" jsonb DEFAULT '[]'::jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "complaints" (
	"id" text PRIMARY KEY NOT NULL,
	"ticket_number" text NOT NULL,
	"student_profile_id" text NOT NULL,
	"category_id" text NOT NULL,
	"room_id" text,
	"title" text NOT NULL,
	"description" text NOT NULL,
	"priority" "complaint_priority" DEFAULT 'MEDIUM' NOT NULL,
	"status" "complaint_status" DEFAULT 'OPEN' NOT NULL,
	"assigned_to" text,
	"assigned_at" timestamp with time zone,
	"resolved_at" timestamp with time zone,
	"closed_at" timestamp with time zone,
	"resolution_notes" text,
	"student_feedback_rating" integer,
	"student_feedback_notes" text,
	"attachment_urls" jsonb DEFAULT '[]'::jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "complaints_ticket_number_unique" UNIQUE("ticket_number")
);
--> statement-breakpoint
CREATE TABLE "equipment" (
	"id" text PRIMARY KEY NOT NULL,
	"category_id" text NOT NULL,
	"name" text NOT NULL,
	"code" text NOT NULL,
	"description" text,
	"image_url" text,
	"total_quantity" integer DEFAULT 1 NOT NULL,
	"available_quantity" integer DEFAULT 1 NOT NULL,
	"issued_quantity" integer DEFAULT 0 NOT NULL,
	"damaged_quantity" integer DEFAULT 0 NOT NULL,
	"lost_quantity" integer DEFAULT 0 NOT NULL,
	"maintenance_quantity" integer DEFAULT 0 NOT NULL,
	"condition" "equipment_condition" DEFAULT 'GOOD' NOT NULL,
	"status" "equipment_status" DEFAULT 'AVAILABLE' NOT NULL,
	"replacement_cost" integer DEFAULT 0,
	"purchase_date" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "equipment_code_unique" UNIQUE("code")
);
--> statement-breakpoint
CREATE TABLE "equipment_categories" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"icon" text DEFAULT 'Trophy' NOT NULL,
	"description" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "equipment_categories_name_unique" UNIQUE("name")
);
--> statement-breakpoint
CREATE TABLE "equipment_requests" (
	"id" text PRIMARY KEY NOT NULL,
	"student_profile_id" text NOT NULL,
	"equipment_id" text NOT NULL,
	"quantity" integer DEFAULT 1 NOT NULL,
	"purpose" text,
	"expected_return_date" timestamp with time zone NOT NULL,
	"status" "equipment_request_status" DEFAULT 'PENDING' NOT NULL,
	"reviewed_by" text,
	"review_notes" text,
	"reviewed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "equipment_transactions" (
	"id" text PRIMARY KEY NOT NULL,
	"equipment_id" text NOT NULL,
	"student_profile_id" text NOT NULL,
	"request_id" text,
	"quantity" integer DEFAULT 1 NOT NULL,
	"issued_by" text NOT NULL,
	"issued_at" timestamp with time zone DEFAULT now() NOT NULL,
	"expected_return_date" timestamp with time zone NOT NULL,
	"actual_return_date" timestamp with time zone,
	"returned_to" text,
	"condition_before" "equipment_condition" DEFAULT 'GOOD' NOT NULL,
	"condition_after" "equipment_condition",
	"status" "equipment_transaction_status" DEFAULT 'ISSUED' NOT NULL,
	"damage_notes" text,
	"fine_amount" integer DEFAULT 0,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "meal_pickup_delegations" (
	"id" text PRIMARY KEY NOT NULL,
	"beneficiary_student_profile_id" text NOT NULL,
	"collector_student_profile_id" text NOT NULL,
	"distribution_id" text NOT NULL,
	"distribution_date" text NOT NULL,
	"meal_type" "meal_type" NOT NULL,
	"status" "delegation_status" DEFAULT 'ACTIVE' NOT NULL,
	"requested_by" text,
	"recorded_by" text,
	"collected_at" timestamp with time zone,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "mess_distribution_records" (
	"id" text PRIMARY KEY NOT NULL,
	"distribution_id" text NOT NULL,
	"student_profile_id" text NOT NULL,
	"room_id" text,
	"mess_item_id" text NOT NULL,
	"meal_type" "meal_type" NOT NULL,
	"distribution_date" text NOT NULL,
	"status" "mess_distribution_status" DEFAULT 'RECEIVED' NOT NULL,
	"distributed_at" timestamp with time zone DEFAULT now() NOT NULL,
	"recorded_by" text NOT NULL,
	"collection_type" "meal_collection_type" DEFAULT 'SELF' NOT NULL,
	"collector_student_profile_id" text,
	"delegation_id" text,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "mess_distributions" (
	"id" text PRIMARY KEY NOT NULL,
	"distribution_date" text NOT NULL,
	"meal_type" "meal_type" NOT NULL,
	"mess_item_id" text NOT NULL,
	"title" text NOT NULL,
	"description" text,
	"total_expected" integer DEFAULT 0 NOT NULL,
	"total_distributed" integer DEFAULT 0 NOT NULL,
	"status" text DEFAULT 'ACTIVE' NOT NULL,
	"created_by" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "mess_items" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"category" "mess_category" DEFAULT 'VEG' NOT NULL,
	"description" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "notices" (
	"id" text PRIMARY KEY NOT NULL,
	"title" text NOT NULL,
	"slug" text NOT NULL,
	"content" text NOT NULL,
	"category" "notice_category" DEFAULT 'GENERAL' NOT NULL,
	"priority" "notice_priority" DEFAULT 'NORMAL' NOT NULL,
	"target_audiences" jsonb DEFAULT '["ALL"]'::jsonb NOT NULL,
	"is_published" boolean DEFAULT true NOT NULL,
	"published_at" timestamp with time zone DEFAULT now() NOT NULL,
	"expires_at" timestamp with time zone,
	"attachment_urls" jsonb DEFAULT '[]'::jsonb,
	"author_id" text NOT NULL,
	"view_count" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "notices_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "notifications" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"type" "notification_type" DEFAULT 'SYSTEM' NOT NULL,
	"title" text NOT NULL,
	"message" text NOT NULL,
	"link_url" text,
	"is_read" boolean DEFAULT false NOT NULL,
	"read_at" timestamp with time zone,
	"metadata" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "permissions" (
	"id" text PRIMARY KEY NOT NULL,
	"key" text NOT NULL,
	"name" text NOT NULL,
	"category" text NOT NULL,
	"description" text,
	CONSTRAINT "permissions_key_unique" UNIQUE("key")
);
--> statement-breakpoint
CREATE TABLE "role_permissions" (
	"id" text PRIMARY KEY NOT NULL,
	"role" "user_role" NOT NULL,
	"permission_key" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "room_assignments" (
	"id" text PRIMARY KEY NOT NULL,
	"room_id" text NOT NULL,
	"student_profile_id" text NOT NULL,
	"bed_number" integer NOT NULL,
	"assigned_from" timestamp with time zone DEFAULT now() NOT NULL,
	"assigned_to" timestamp with time zone,
	"status" text DEFAULT 'ACTIVE' NOT NULL,
	"assigned_by" text,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "rooms" (
	"id" text PRIMARY KEY NOT NULL,
	"room_number" text NOT NULL,
	"floor" integer DEFAULT 1 NOT NULL,
	"block" text DEFAULT 'Main Block' NOT NULL,
	"capacity" integer DEFAULT 2 NOT NULL,
	"status" "room_status" DEFAULT 'VACANT' NOT NULL,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "rooms_room_number_unique" UNIQUE("room_number")
);
--> statement-breakpoint
CREATE TABLE "sessions" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"token" text NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"ip_address" text,
	"user_agent" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "sessions_token_unique" UNIQUE("token")
);
--> statement-breakpoint
CREATE TABLE "student_profiles" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"student_id" text NOT NULL,
	"enrollment_no" text NOT NULL,
	"department" text NOT NULL,
	"program" text NOT NULL,
	"year" integer DEFAULT 1 NOT NULL,
	"semester" integer DEFAULT 1 NOT NULL,
	"room_id" text,
	"bed_number" integer,
	"approval_status" "account_status" DEFAULT 'PENDING' NOT NULL,
	"approved_by" text,
	"approved_at" timestamp with time zone,
	"rejection_reason" text,
	"emergency_contact_name" text,
	"emergency_contact_phone" text,
	"blood_group" text,
	"address" text,
	"avatar_url" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "student_profiles_user_id_unique" UNIQUE("user_id"),
	CONSTRAINT "student_profiles_student_id_unique" UNIQUE("student_id"),
	CONSTRAINT "student_profiles_enrollment_no_unique" UNIQUE("enrollment_no")
);
--> statement-breakpoint
CREATE TABLE "user_roles" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"role" "user_role" NOT NULL,
	"assigned_by" text,
	"assigned_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"email" text NOT NULL,
	"email_verified" boolean DEFAULT false NOT NULL,
	"image" text,
	"phone" text,
	"role" "user_role" DEFAULT 'STUDENT' NOT NULL,
	"status" "account_status" DEFAULT 'PENDING' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "verifications" (
	"id" text PRIMARY KEY NOT NULL,
	"identifier" text NOT NULL,
	"value" text NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "accounts" ADD CONSTRAINT "accounts_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_actor_id_users_id_fk" FOREIGN KEY ("actor_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "complaint_comments" ADD CONSTRAINT "complaint_comments_complaint_id_complaints_id_fk" FOREIGN KEY ("complaint_id") REFERENCES "public"."complaints"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "complaint_comments" ADD CONSTRAINT "complaint_comments_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "complaints" ADD CONSTRAINT "complaints_student_profile_id_student_profiles_id_fk" FOREIGN KEY ("student_profile_id") REFERENCES "public"."student_profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "complaints" ADD CONSTRAINT "complaints_category_id_complaint_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."complaint_categories"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "complaints" ADD CONSTRAINT "complaints_room_id_rooms_id_fk" FOREIGN KEY ("room_id") REFERENCES "public"."rooms"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "complaints" ADD CONSTRAINT "complaints_assigned_to_users_id_fk" FOREIGN KEY ("assigned_to") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "equipment" ADD CONSTRAINT "equipment_category_id_equipment_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."equipment_categories"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "equipment_requests" ADD CONSTRAINT "equipment_requests_student_profile_id_student_profiles_id_fk" FOREIGN KEY ("student_profile_id") REFERENCES "public"."student_profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "equipment_requests" ADD CONSTRAINT "equipment_requests_equipment_id_equipment_id_fk" FOREIGN KEY ("equipment_id") REFERENCES "public"."equipment"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "equipment_requests" ADD CONSTRAINT "equipment_requests_reviewed_by_users_id_fk" FOREIGN KEY ("reviewed_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "equipment_transactions" ADD CONSTRAINT "equipment_transactions_equipment_id_equipment_id_fk" FOREIGN KEY ("equipment_id") REFERENCES "public"."equipment"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "equipment_transactions" ADD CONSTRAINT "equipment_transactions_student_profile_id_student_profiles_id_fk" FOREIGN KEY ("student_profile_id") REFERENCES "public"."student_profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "equipment_transactions" ADD CONSTRAINT "equipment_transactions_request_id_equipment_requests_id_fk" FOREIGN KEY ("request_id") REFERENCES "public"."equipment_requests"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "equipment_transactions" ADD CONSTRAINT "equipment_transactions_issued_by_users_id_fk" FOREIGN KEY ("issued_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "equipment_transactions" ADD CONSTRAINT "equipment_transactions_returned_to_users_id_fk" FOREIGN KEY ("returned_to") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "meal_pickup_delegations" ADD CONSTRAINT "meal_pickup_delegations_beneficiary_student_profile_id_student_profiles_id_fk" FOREIGN KEY ("beneficiary_student_profile_id") REFERENCES "public"."student_profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "meal_pickup_delegations" ADD CONSTRAINT "meal_pickup_delegations_collector_student_profile_id_student_profiles_id_fk" FOREIGN KEY ("collector_student_profile_id") REFERENCES "public"."student_profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "meal_pickup_delegations" ADD CONSTRAINT "meal_pickup_delegations_distribution_id_mess_distributions_id_fk" FOREIGN KEY ("distribution_id") REFERENCES "public"."mess_distributions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "meal_pickup_delegations" ADD CONSTRAINT "meal_pickup_delegations_requested_by_users_id_fk" FOREIGN KEY ("requested_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "meal_pickup_delegations" ADD CONSTRAINT "meal_pickup_delegations_recorded_by_users_id_fk" FOREIGN KEY ("recorded_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "mess_distribution_records" ADD CONSTRAINT "mess_distribution_records_distribution_id_mess_distributions_id_fk" FOREIGN KEY ("distribution_id") REFERENCES "public"."mess_distributions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "mess_distribution_records" ADD CONSTRAINT "mess_distribution_records_student_profile_id_student_profiles_id_fk" FOREIGN KEY ("student_profile_id") REFERENCES "public"."student_profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "mess_distribution_records" ADD CONSTRAINT "mess_distribution_records_room_id_rooms_id_fk" FOREIGN KEY ("room_id") REFERENCES "public"."rooms"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "mess_distribution_records" ADD CONSTRAINT "mess_distribution_records_mess_item_id_mess_items_id_fk" FOREIGN KEY ("mess_item_id") REFERENCES "public"."mess_items"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "mess_distribution_records" ADD CONSTRAINT "mess_distribution_records_recorded_by_users_id_fk" FOREIGN KEY ("recorded_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "mess_distribution_records" ADD CONSTRAINT "mess_distribution_records_collector_student_profile_id_student_profiles_id_fk" FOREIGN KEY ("collector_student_profile_id") REFERENCES "public"."student_profiles"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "mess_distributions" ADD CONSTRAINT "mess_distributions_mess_item_id_mess_items_id_fk" FOREIGN KEY ("mess_item_id") REFERENCES "public"."mess_items"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "mess_distributions" ADD CONSTRAINT "mess_distributions_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notices" ADD CONSTRAINT "notices_author_id_users_id_fk" FOREIGN KEY ("author_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "role_permissions" ADD CONSTRAINT "role_permissions_permission_key_permissions_key_fk" FOREIGN KEY ("permission_key") REFERENCES "public"."permissions"("key") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "room_assignments" ADD CONSTRAINT "room_assignments_room_id_rooms_id_fk" FOREIGN KEY ("room_id") REFERENCES "public"."rooms"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "room_assignments" ADD CONSTRAINT "room_assignments_student_profile_id_student_profiles_id_fk" FOREIGN KEY ("student_profile_id") REFERENCES "public"."student_profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "room_assignments" ADD CONSTRAINT "room_assignments_assigned_by_users_id_fk" FOREIGN KEY ("assigned_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "student_profiles" ADD CONSTRAINT "student_profiles_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "student_profiles" ADD CONSTRAINT "student_profiles_room_id_rooms_id_fk" FOREIGN KEY ("room_id") REFERENCES "public"."rooms"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "student_profiles" ADD CONSTRAINT "student_profiles_approved_by_users_id_fk" FOREIGN KEY ("approved_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_roles" ADD CONSTRAINT "user_roles_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_roles" ADD CONSTRAINT "user_roles_assigned_by_users_id_fk" FOREIGN KEY ("assigned_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "unique_delegation_beneficiary_dist_idx" ON "meal_pickup_delegations" USING btree ("distribution_id","beneficiary_student_profile_id","status");--> statement-breakpoint
CREATE INDEX "meal_deleg_collector_idx" ON "meal_pickup_delegations" USING btree ("collector_student_profile_id");--> statement-breakpoint
CREATE INDEX "meal_deleg_status_idx" ON "meal_pickup_delegations" USING btree ("status");--> statement-breakpoint
CREATE UNIQUE INDEX "unique_student_meal_item_idx" ON "mess_distribution_records" USING btree ("distribution_date","meal_type","mess_item_id","student_profile_id");--> statement-breakpoint
CREATE INDEX "mess_dist_date_idx" ON "mess_distribution_records" USING btree ("distribution_date");--> statement-breakpoint
CREATE INDEX "mess_dist_room_idx" ON "mess_distribution_records" USING btree ("room_id");--> statement-breakpoint
CREATE INDEX "mess_dist_collector_idx" ON "mess_distribution_records" USING btree ("collector_student_profile_id");--> statement-breakpoint
CREATE UNIQUE INDEX "unique_user_role_idx" ON "user_roles" USING btree ("user_id","role");