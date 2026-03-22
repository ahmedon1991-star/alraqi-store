import dotenv from "dotenv";
dotenv.config();
import pg from "pg";

const { Pool } = pg;

async function runMigration() {
  const DATABASE_URL = process.env.DATABASE_URL;
  if (!DATABASE_URL) {
    console.error("DATABASE_URL not found in .env");
    process.exit(1);
  }

  const pool = new Pool({
    connectionString: DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });

  try {
    console.log("Running migration: adding new columns to admin_settings...\n");

    // Add shipping_fee column if not exists
    await pool.query(`
      ALTER TABLE admin_settings 
      ADD COLUMN IF NOT EXISTS shipping_fee integer NOT NULL DEFAULT 0
    `);
    console.log("✅ shipping_fee column added/exists");

    // Add free_shipping_threshold column if not exists
    await pool.query(`
      ALTER TABLE admin_settings 
      ADD COLUMN IF NOT EXISTS free_shipping_threshold integer NOT NULL DEFAULT 50000
    `);
    console.log("✅ free_shipping_threshold column added/exists");

    // Add announcement_text column if not exists
    await pool.query(`
      ALTER TABLE admin_settings 
      ADD COLUMN IF NOT EXISTS announcement_text text NOT NULL DEFAULT 'خصم حصري 20% لفترة محدودة على كافة التوابل والبهارات!'
    `);
    console.log("✅ announcement_text column added/exists");

    // Also reset admin password while we're here
    const ADMIN_USERNAME = process.env.ADMIN_USERNAME || "admin";
    const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "admin12345";
    
    await pool.query(
      "UPDATE admin_settings SET username=$1, password=$2 WHERE id=1",
      [ADMIN_USERNAME, ADMIN_PASSWORD]
    );
    console.log(`\n✅ Admin credentials reset: ${ADMIN_USERNAME} / ${ADMIN_PASSWORD}`);

    // Verify
    const result = await pool.query("SELECT id, username, password, shipping_fee, free_shipping_threshold FROM admin_settings WHERE id=1");
    console.log("\n📋 Current DB state:");
    console.log(result.rows[0]);

    console.log(`\n🎉 Migration complete! Login with: ${ADMIN_USERNAME} / ${ADMIN_PASSWORD}`);

  } catch (err) {
    console.error("❌ Migration error:", err);
  } finally {
    await pool.end();
  }
}

runMigration();
