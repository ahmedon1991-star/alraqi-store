import dotenv from "dotenv";
dotenv.config();
import pg from "pg";

const { Pool } = pg;

/**
 * Auto-migration script - runs on server startup on Render.
 * Safely adds any missing columns to the database without breaking existing data.
 */
export async function runMigrations() {
  const DATABASE_URL = process.env.DATABASE_URL;
  if (!DATABASE_URL) {
    console.log("⚠️  MIGRATIONS: No DATABASE_URL - skipping migrations.");
    return;
  }

  const pool = new Pool({
    connectionString: DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });

  try {
    console.log("🔄 MIGRATIONS: Running auto-migrations...");

    // admin_settings: add shipping_fee
    await pool.query(`ALTER TABLE admin_settings ADD COLUMN IF NOT EXISTS shipping_fee integer NOT NULL DEFAULT 0`);

    // admin_settings: add free_shipping_threshold
    await pool.query(`ALTER TABLE admin_settings ADD COLUMN IF NOT EXISTS free_shipping_threshold integer NOT NULL DEFAULT 50000`);

    // admin_settings: add announcement_text
    await pool.query(`ALTER TABLE admin_settings ADD COLUMN IF NOT EXISTS announcement_text text NOT NULL DEFAULT 'خصم حصري 20% لفترة محدودة!'`);

    // admin_settings: add address if missing
    await pool.query(`ALTER TABLE admin_settings ADD COLUMN IF NOT EXISTS address text NOT NULL DEFAULT 'الخرطوم، السودان'`);

    // admin_settings: add facebook/instagram/twitter if missing
    await pool.query(`ALTER TABLE admin_settings ADD COLUMN IF NOT EXISTS facebook text NOT NULL DEFAULT 'https://facebook.com'`);
    await pool.query(`ALTER TABLE admin_settings ADD COLUMN IF NOT EXISTS instagram text NOT NULL DEFAULT 'https://instagram.com'`);
    await pool.query(`ALTER TABLE admin_settings ADD COLUMN IF NOT EXISTS twitter text NOT NULL DEFAULT 'https://twitter.com'`);

    // admin_settings: add password_token if missing
    await pool.query(`ALTER TABLE admin_settings ADD COLUMN IF NOT EXISTS password_token text`);

    // admin_settings: add revenue_reset_date and revenue_reset_code if missing
    await pool.query(`ALTER TABLE admin_settings ADD COLUMN IF NOT EXISTS revenue_reset_date timestamp DEFAULT now()`);
    await pool.query(`ALTER TABLE admin_settings ADD COLUMN IF NOT EXISTS revenue_reset_code text NOT NULL DEFAULT '1234'`);

    // users: add biometric_token if missing
    await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS biometric_token text`);
    await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS biometric_enabled boolean DEFAULT false`);

    // messages: add is_archived if missing
    await pool.query(`ALTER TABLE messages ADD COLUMN IF NOT EXISTS is_archived boolean DEFAULT false`);

    // products: add sort_order if missing
    await pool.query(`ALTER TABLE products ADD COLUMN IF NOT EXISTS sort_order integer DEFAULT 0`);
    // products: add stock if missing
    await pool.query(`ALTER TABLE products ADD COLUMN IF NOT EXISTS stock integer DEFAULT 0`);
    // products: add original_price if missing
    await pool.query(`ALTER TABLE products ADD COLUMN IF NOT EXISTS original_price integer`);
    // products: add is_visible if missing
    await pool.query(`ALTER TABLE products ADD COLUMN IF NOT EXISTS is_visible boolean DEFAULT true`);

    // Ensure admin settings row exists with correct credentials
    const ADMIN_USERNAME = process.env.ADMIN_USERNAME || "admin";
    const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "admin12345";

    await pool.query(`
      INSERT INTO admin_settings (id, username, password, email, phone, address, facebook, instagram, twitter, shipping_fee, free_shipping_threshold, announcement_text, revenue_reset_code)
      VALUES (1, $1, $2, 'admin@example.com', '+249912345678', 'الخرطوم، السودان', 'https://facebook.com', 'https://instagram.com', 'https://twitter.com', 0, 50000, 'خصم حصري 20% لفترة محدودة!', '1234')
      ON CONFLICT (id) DO UPDATE SET username = $1, password = $2, revenue_reset_code = COALESCE(admin_settings.revenue_reset_code, '1234')
    `, [ADMIN_USERNAME, ADMIN_PASSWORD]);

    console.log(`✅ MIGRATIONS: All migrations complete. Admin: ${ADMIN_USERNAME}`);
  } catch (err) {
    console.error("❌ MIGRATIONS: Error during migration:", err);
  } finally {
    await pool.end();
  }
}
