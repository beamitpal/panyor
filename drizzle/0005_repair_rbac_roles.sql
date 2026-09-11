-- RBAC repair migration. Idempotently repairs deployments that missed the
-- SPORTS_COMMITTEE enum value or the multi-role user_roles table.

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum e
    JOIN pg_type t ON t.oid = e.enumtypid
    WHERE t.typname = 'user_role' AND e.enumlabel = 'SPORTS_COMMITTEE'
  ) THEN
    ALTER TYPE "public"."user_role" ADD VALUE 'SPORTS_COMMITTEE' BEFORE 'PRESIDENT';
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS "public"."user_roles" (
  "id" text PRIMARY KEY NOT NULL,
  "user_id" text NOT NULL,
  "role" "public"."user_role" NOT NULL,
  "assigned_by" text,
  "assigned_at" timestamp with time zone DEFAULT now() NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);

ALTER TABLE "public"."user_roles" ADD COLUMN IF NOT EXISTS "assigned_at" timestamp with time zone DEFAULT now();
ALTER TABLE "public"."user_roles" ADD COLUMN IF NOT EXISTS "created_at" timestamp with time zone DEFAULT now();

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'user_roles_user_id_users_id_fk') THEN
    ALTER TABLE "public"."user_roles" ADD CONSTRAINT "user_roles_user_id_users_id_fk"
      FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'user_roles_assigned_by_users_id_fk') THEN
    ALTER TABLE "public"."user_roles" ADD CONSTRAINT "user_roles_assigned_by_users_id_fk"
      FOREIGN KEY ("assigned_by") REFERENCES "public"."users"("id") ON DELETE SET NULL;
  END IF;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS "unique_user_role_idx"
  ON "public"."user_roles" USING btree ("user_id", "role");
