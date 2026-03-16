import { defineConfig } from "drizzle-kit";

// Verify DATABASE_URL for runtime but allow build to proceed
// if (!process.env.DATABASE_URL) console.warn("DATABASE_URL is not set");

export default defineConfig({
  out: "./migrations",
  schema: "./shared/schema.ts",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL,
  },
});
