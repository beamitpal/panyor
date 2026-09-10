import { defineConfig } from "drizzle-kit";

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL is not set");
}

export default defineConfig({
  schema: "./db/schema.ts",
  out: "./drizzle",
  dialect: "postgresql",

  dbCredentials: {
    url: process.env.DATABASE_URL,
  },

  schemaFilter: ["public"],

  migrations: {
    table: "__drizzle_migrations",
    schema: "public",
  },

  strict: true,
  verbose: true,
});
