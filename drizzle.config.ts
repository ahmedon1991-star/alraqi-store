import { defineConfig } from "drizzle-kit";

// Verify DATABASE_URL for runtime but allow build to proceed
// if (!process.env.DATABASE_URL) console.warn("DATABASE_URL is not set");

export default defineConfig({
  out: "./migrations",
  schema: "./shared/schema.ts",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL!,
    // Hosted databases need TLS; DATABASE_SSL=false is only for a local/CI database
    ssl: process.env.DATABASE_SSL === "false" ? false : "require",
  },
});
