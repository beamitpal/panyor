-- Repair migration for installations where the auth `users` table was
-- migrated successfully but `student_profiles` was never created (or was
-- created from an older partial schema). This is intentionally idempotent.

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'account_status') THEN
    CREATE TYPE "public"."account_status" AS ENUM('PENDING', 'APPROVED', 'REJECTED', 'SUSPENDED');
  END IF;
END $$;--> statement-breakpoint

CREATE TABLE IF NOT EXISTS "student_profiles" (
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
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);--> statement-breakpoint

ALTER TABLE "student_profiles" ADD COLUMN IF NOT EXISTS "user_id" text;--> statement-breakpoint
ALTER TABLE "student_profiles" ADD COLUMN IF NOT EXISTS "student_id" text;--> statement-breakpoint
ALTER TABLE "student_profiles" ADD COLUMN IF NOT EXISTS "enrollment_no" text;--> statement-breakpoint
ALTER TABLE "student_profiles" ADD COLUMN IF NOT EXISTS "department" text;--> statement-breakpoint
ALTER TABLE "student_profiles" ADD COLUMN IF NOT EXISTS "program" text;--> statement-breakpoint
ALTER TABLE "student_profiles" ADD COLUMN IF NOT EXISTS "year" integer DEFAULT 1;--> statement-breakpoint
ALTER TABLE "student_profiles" ADD COLUMN IF NOT EXISTS "semester" integer DEFAULT 1;--> statement-breakpoint
ALTER TABLE "student_profiles" ADD COLUMN IF NOT EXISTS "room_id" text;--> statement-breakpoint
ALTER TABLE "student_profiles" ADD COLUMN IF NOT EXISTS "bed_number" integer;--> statement-breakpoint
ALTER TABLE "student_profiles" ADD COLUMN IF NOT EXISTS "approval_status" "account_status" DEFAULT 'PENDING';--> statement-breakpoint
ALTER TABLE "student_profiles" ADD COLUMN IF NOT EXISTS "approved_by" text;--> statement-breakpoint
ALTER TABLE "student_profiles" ADD COLUMN IF NOT EXISTS "approved_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "student_profiles" ADD COLUMN IF NOT EXISTS "rejection_reason" text;--> statement-breakpoint
ALTER TABLE "student_profiles" ADD COLUMN IF NOT EXISTS "emergency_contact_name" text;--> statement-breakpoint
ALTER TABLE "student_profiles" ADD COLUMN IF NOT EXISTS "emergency_contact_phone" text;--> statement-breakpoint
ALTER TABLE "student_profiles" ADD COLUMN IF NOT EXISTS "blood_group" text;--> statement-breakpoint
ALTER TABLE "student_profiles" ADD COLUMN IF NOT EXISTS "address" text;--> statement-breakpoint
ALTER TABLE "student_profiles" ADD COLUMN IF NOT EXISTS "avatar_url" text;--> statement-breakpoint
ALTER TABLE "student_profiles" ADD COLUMN IF NOT EXISTS "created_at" timestamp with time zone DEFAULT now();--> statement-breakpoint
ALTER TABLE "student_profiles" ADD COLUMN IF NOT EXISTS "updated_at" timestamp with time zone DEFAULT now();--> statement-breakpoint

-- Existing rows in a partially-created table may have NULLs in columns that
-- are required by the application. Give them safe defaults before enforcing
-- NOT NULL. An old installation with incomplete rows should still migrate.
UPDATE "student_profiles" SET "year" = 1 WHERE "year" IS NULL;--> statement-breakpoint
UPDATE "student_profiles" SET "semester" = 1 WHERE "semester" IS NULL;--> statement-breakpoint
UPDATE "student_profiles" SET "approval_status" = 'PENDING' WHERE "approval_status" IS NULL;--> statement-breakpoint
UPDATE "student_profiles" SET "created_at" = now() WHERE "created_at" IS NULL;--> statement-breakpoint
UPDATE "student_profiles" SET "updated_at" = now() WHERE "updated_at" IS NULL;--> statement-breakpoint

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'student_profiles_user_id_unique') THEN
    ALTER TABLE "student_profiles" ADD CONSTRAINT "student_profiles_user_id_unique" UNIQUE ("user_id");
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'student_profiles_student_id_unique') THEN
    ALTER TABLE "student_profiles" ADD CONSTRAINT "student_profiles_student_id_unique" UNIQUE ("student_id");
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'student_profiles_enrollment_no_unique') THEN
    ALTER TABLE "student_profiles" ADD CONSTRAINT "student_profiles_enrollment_no_unique" UNIQUE ("enrollment_no");
  END IF;
END $$;--> statement-breakpoint

DO $$
BEGIN
  IF to_regclass('public.users') IS NOT NULL
    AND NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'student_profiles_user_id_users_id_fk') THEN
    ALTER TABLE "student_profiles"
      ADD CONSTRAINT "student_profiles_user_id_users_id_fk"
      FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE;
  END IF;
  IF to_regclass('public.rooms') IS NOT NULL
    AND NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'student_profiles_room_id_rooms_id_fk') THEN
    ALTER TABLE "student_profiles"
      ADD CONSTRAINT "student_profiles_room_id_rooms_id_fk"
      FOREIGN KEY ("room_id") REFERENCES "public"."rooms"("id") ON DELETE SET NULL;
  END IF;
  IF to_regclass('public.users') IS NOT NULL
    AND NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'student_profiles_approved_by_users_id_fk') THEN
    ALTER TABLE "student_profiles"
      ADD CONSTRAINT "student_profiles_approved_by_users_id_fk"
      FOREIGN KEY ("approved_by") REFERENCES "public"."users"("id");
  END IF;
END $$;
