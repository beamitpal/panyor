import { betterAuth } from "better-auth"
import { drizzleAdapter } from "@better-auth/drizzle-adapter"
import * as schema from "./db/schema"
import { getDb } from "./db/server"

/**
 * Better Auth server instance — the single source of authentication truth.
 *
 * - PostgreSQL via Drizzle (`provider: "pg"`, plural table names).
 * - `role` / `status` / `phone` are first-class user fields (additionalFields)
 *   so they are readable from the session and writable at sign-up.
 * - Every new account starts as STUDENT + PENDING; a warden/admin must approve
 *   the account before protected workflows accept it (see lib/auth/server.ts).
 */
export const auth = betterAuth({
  database: drizzleAdapter(getDb(), {
    provider: "pg",
    usePlural: true,
    schema: {
      ...schema,
      user: schema.users,
      session: schema.sessions,
      account: schema.accounts,
      verification: schema.verifications,
    },
  }),

  emailAndPassword: {
    enabled: true,
    autoSignIn: true,
    minPasswordLength: 8,
    maxPasswordLength: 128,
  },

  user: {
    additionalFields: {
      role: {
        type: "string",
        required: false,
        defaultValue: "STUDENT",
        input: false,
      },
      status: {
        type: "string",
        required: false,
        defaultValue: "PENDING",
        input: false,
      },
      phone: {
        type: "string",
        required: false,
        input: true,
      },
    },
  },

  session: {
    expiresIn: 60 * 60 * 24 * 7, // 7 days
    updateAge: 60 * 60 * 24, // refresh once per day of activity
    cookieCache: {
      enabled: true,
      maxAge: 60 * 5, // 5 minutes
    },
  },

  rateLimit: {
    enabled: true,
    window: 60, // 1 minute
    max: 20, // 20 auth attempts per minute per IP
  },

  trustedOrigins: [
    "http://localhost:3000",
    "http://127.0.0.1:3000",
    ...(process.env.TRUSTED_ORIGINS?.split(",").map((o) => o.trim()).filter(Boolean) ?? []),
  ],

})

export type AuthSession = typeof auth.$Infer.Session

// Re-export user/role domain types for convenience in components.
export type { UserRole } from "@/types"
