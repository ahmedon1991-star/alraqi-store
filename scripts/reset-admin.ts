import dotenv from "dotenv";
dotenv.config();

import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import { adminSettings } from "../shared/schema.js";
import { eq } from "drizzle-orm";

async function resetAdminPassword() {
  const DATABASE_URL = process.env.DATABASE_URL;
  if (!DATABASE_URL) {
    console.error("❌ DATABASE_URL not found in .env");
    process.exit(1);
  }

  const ADMIN_USERNAME = process.env.ADMIN_USERNAME || "admin";
  const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "admin12345";

  console.log(`\n🔑 Resetting admin credentials to:`);
  console.log(`   Username: ${ADMIN_USERNAME}`);
  console.log(`   Password: ${ADMIN_PASSWORD}`);
  console.log(`\n📡 Connecting to database...`);

  const pool = new pg.Pool({
    connectionString: DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });

  const db = drizzle(pool);

  try {
    // Check current state
    const [existing] = await db.select().from(adminSettings).where(eq(adminSettings.id, 1));
    if (existing) {
      console.log(`\n📋 Current DB state:`);
      console.log(`   Username in DB: ${existing.username}`);
      console.log(`   Password in DB: ${existing.password?.includes(":") ? "(HASHED - " + existing.password.substring(0,20) + "...)" : existing.password}`);
      
      // Update
      const [updated] = await db.update(adminSettings)
        .set({ username: ADMIN_USERNAME, password: ADMIN_PASSWORD })
        .where(eq(adminSettings.id, 1))
        .returning();
      
      console.log(`\n✅ Updated successfully!`);
      console.log(`   New username: ${updated.username}`);
      console.log(`   New password: ${updated.password}`);
    } else {
      // Insert
      const [created] = await db.insert(adminSettings)
        .values({ id: 1, username: ADMIN_USERNAME, password: ADMIN_PASSWORD, email: "admin@example.com", phone: "+249912345678", address: "الخرطوم", facebook: "https://facebook.com", instagram: "https://instagram.com", twitter: "https://twitter.com" })
        .returning();
      console.log(`\n✅ Created new admin settings:`, created);
    }

    console.log(`\n🎉 Done! Now log in with:`);
    console.log(`   Username: ${ADMIN_USERNAME}`);
    console.log(`   Password: ${ADMIN_PASSWORD}`);

  } catch (err) {
    console.error("❌ Error:", err);
  } finally {
    await pool.end();
  }
}

resetAdminPassword();
