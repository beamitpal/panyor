import { drizzle } from "drizzle-orm/postgres-js"
import postgres from "postgres"
import * as schema from "./schema"

let dbInstance: ReturnType<typeof drizzle<typeof schema>> | null = null

const connectionString = process.env.DATABASE_URL || process.env.POSTGRES_URL

if (connectionString) {
  try {
    // Pool guardrails: fail fast instead of queuing forever — a slow query
    // must surface as a 500, never pile up and starve other requests.
    const client = postgres(connectionString, {
      prepare: false,
      max: 20,
      idle_timeout: 20,
      connect_timeout: 10,
    })
    dbInstance = drizzle(client, { schema })
  } catch (err) {
    console.warn("Database connection fallback:", err)
  }
}

/** Lazily-initialized instance kept for backwards compatibility; may be null. */
export const db = dbInstance

export type Database = NonNullable<typeof dbInstance>

/**
 * Non-null database accessor for server code paths (auth, route handlers,
 * server actions) that require a live PostgreSQL connection.
 * Throws a descriptive error when DATABASE_URL is missing or invalid
 * instead of failing obscurely inside query code.
 */
export function getDb(): Database {
  if (!dbInstance) {
    throw new Error(
      "PostgreSQL connection is not configured. Set a valid DATABASE_URL (or POSTGRES_URL) environment variable pointing at the Panyor database."
    )
  }
  return dbInstance
}
