import dotenv from "dotenv";
dotenv.config();
import pg from "pg";
import { KNOWN_DEFAULT_ADMIN_PASSWORD, createToken, databaseSsl, getEnvAdminCredentials, hashPassword, isHashedPassword } from "./security";

const { Pool } = pg;

/**
 * Auto-migration script - runs on server startup.
 * Only additive, idempotent changes (ADD COLUMN IF NOT EXISTS, CREATE ... IF NOT EXISTS).
 * Each statement runs on its own so one failure does not skip the rest.
 */
const STATEMENTS: string[] = [
  // admin_settings
  `ALTER TABLE admin_settings ADD COLUMN IF NOT EXISTS shipping_fee integer NOT NULL DEFAULT 0`,
  `ALTER TABLE admin_settings ADD COLUMN IF NOT EXISTS free_shipping_threshold integer NOT NULL DEFAULT 50000`,
  `ALTER TABLE admin_settings ADD COLUMN IF NOT EXISTS announcement_text text NOT NULL DEFAULT 'خصم حصري 20% لفترة محدودة!'`,
  `ALTER TABLE admin_settings ADD COLUMN IF NOT EXISTS address text NOT NULL DEFAULT 'الخرطوم، السودان'`,
  `ALTER TABLE admin_settings ADD COLUMN IF NOT EXISTS facebook text NOT NULL DEFAULT 'https://facebook.com'`,
  `ALTER TABLE admin_settings ADD COLUMN IF NOT EXISTS instagram text NOT NULL DEFAULT 'https://instagram.com'`,
  `ALTER TABLE admin_settings ADD COLUMN IF NOT EXISTS twitter text NOT NULL DEFAULT 'https://twitter.com'`,
  `ALTER TABLE admin_settings ADD COLUMN IF NOT EXISTS password_token text`,
  `ALTER TABLE admin_settings ADD COLUMN IF NOT EXISTS revenue_reset_date timestamp DEFAULT now()`,
  `ALTER TABLE admin_settings ADD COLUMN IF NOT EXISTS revenue_reset_code text NOT NULL DEFAULT '1234'`,

  // users
  `ALTER TABLE users ADD COLUMN IF NOT EXISTS biometric_token text`,
  `ALTER TABLE users ADD COLUMN IF NOT EXISTS biometric_enabled boolean DEFAULT false`,
  `ALTER TABLE users ADD COLUMN IF NOT EXISTS reset_token_hash text`,
  `ALTER TABLE users ADD COLUMN IF NOT EXISTS reset_token_expires timestamp`,
  // Biometric device tokens are now stored as SHA-256 hashes (64 hex chars). Hash legacy plaintext ones.
  `UPDATE users SET biometric_token = encode(sha256(convert_to(biometric_token, 'UTF8')), 'hex')
     WHERE biometric_token IS NOT NULL AND biometric_token !~ '^[0-9a-f]{64}$'`,

  // messages
  `ALTER TABLE messages ADD COLUMN IF NOT EXISTS is_archived boolean DEFAULT false`,

  // products
  `ALTER TABLE products ADD COLUMN IF NOT EXISTS sort_order integer DEFAULT 0`,
  `ALTER TABLE products ADD COLUMN IF NOT EXISTS stock integer DEFAULT 0`,
  `ALTER TABLE products ADD COLUMN IF NOT EXISTS original_price integer`,
  `ALTER TABLE products ADD COLUMN IF NOT EXISTS is_visible boolean DEFAULT true`,
  `ALTER TABLE products ADD COLUMN IF NOT EXISTS sizes text`,
  `ALTER TABLE products ADD COLUMN IF NOT EXISTS measurements text`,
  `ALTER TABLE products ADD COLUMN IF NOT EXISTS variants text`,

  // cart_items
  `ALTER TABLE cart_items ADD COLUMN IF NOT EXISTS size text`,
  `ALTER TABLE cart_items ADD COLUMN IF NOT EXISTS measurement text`,
  `ALTER TABLE cart_items ADD COLUMN IF NOT EXISTS price integer`,
  `ALTER TABLE cart_items ADD COLUMN IF NOT EXISTS image text`,

  // orders
  `ALTER TABLE orders ADD COLUMN IF NOT EXISTS user_id varchar`,
  `ALTER TABLE orders ADD COLUMN IF NOT EXISTS items text`,
  `ALTER TABLE orders ADD COLUMN IF NOT EXISTS payment_method text NOT NULL DEFAULT 'cod'`,
  `ALTER TABLE orders ADD COLUMN IF NOT EXISTS bank_id varchar`,
  `ALTER TABLE orders ADD COLUMN IF NOT EXISTS updated_at timestamp DEFAULT now()`,
  `ALTER TABLE orders ADD COLUMN IF NOT EXISTS is_archived boolean DEFAULT false`,
  `ALTER TABLE orders ADD COLUMN IF NOT EXISTS status_timeline text`,
  `ALTER TABLE orders ADD COLUMN IF NOT EXISTS has_new_notification boolean DEFAULT false`,

  // product_ratings: one rating per customer per product
  `CREATE TABLE IF NOT EXISTS product_ratings (
     id varchar PRIMARY KEY DEFAULT gen_random_uuid(),
     user_id varchar NOT NULL,
     product_id varchar NOT NULL,
     rating integer NOT NULL,
     created_at timestamp DEFAULT now()
   )`,
  `CREATE UNIQUE INDEX IF NOT EXISTS product_ratings_user_product_idx ON product_ratings (user_id, product_id)`,

  // Expired sessions (customers: 30 days, admin: 7 days)
  `DELETE FROM sessions WHERE created_at IS NULL
     OR (user_id LIKE 'admin-%' AND created_at < now() - interval '7 days')
     OR created_at < now() - interval '30 days'`,
];

export async function runMigrations() {
  const DATABASE_URL = process.env.DATABASE_URL;
  if (!DATABASE_URL) {
    console.log("⚠️  MIGRATIONS: No DATABASE_URL - skipping migrations.");
    return;
  }

  const pool = new Pool({
    connectionString: DATABASE_URL,
    ssl: databaseSsl()
  });

  try {
    console.log("🔄 MIGRATIONS: Running auto-migrations...");
    let failed = 0;
    for (const statement of STATEMENTS) {
      try {
        await pool.query(statement);
      } catch (err: any) {
        failed += 1;
        console.error(`❌ MIGRATIONS: ${err?.message || err} :: ${statement.split("\n")[0].slice(0, 90)}`);
      }
    }

    await ensureAdminCredentials(pool);

    console.log(failed ? `⚠️  MIGRATIONS: done with ${failed} failed statement(s).` : "✅ MIGRATIONS: All migrations complete.");
  } catch (err) {
    console.error("❌ MIGRATIONS: Error during migration:", err);
  } finally {
    await pool.end();
  }
}

/**
 * Makes sure the admin row exists and its password is stored hashed.
 * It never overwrites a password the admin changed from the panel.
 */
async function ensureAdminCredentials(pool: pg.Pool) {
  const env = getEnvAdminCredentials();
  if (!env) {
    console.warn("⚠️  ADMIN: ADMIN_PASSWORD is not set (or is the old public default). Set a strong ADMIN_PASSWORD in your host's environment variables.");
  }

  // Create the row on first run (no-op if it exists)
  await pool.query(
    `INSERT INTO admin_settings (id, username, password)
     VALUES (1, $1, $2)
     ON CONFLICT (id) DO NOTHING`,
    [env?.username || (process.env.ADMIN_USERNAME || "admin").trim(), hashPassword(env?.password || createToken(32))]
  );

  // Upgrade a plaintext password left by older versions
  const { rows } = await pool.query(`SELECT password FROM admin_settings WHERE id = 1`);
  const stored: string | undefined = rows[0]?.password;
  if (stored && !isHashedPassword(stored)) {
    // The old default is public, so it is replaced by an unusable random one
    // (log in with ADMIN_PASSWORD from the environment, then set a new password in the panel).
    const replacement = stored === KNOWN_DEFAULT_ADMIN_PASSWORD ? createToken(32) : stored;
    await pool.query(`UPDATE admin_settings SET password = $1 WHERE id = 1`, [hashPassword(replacement)]);
    console.log("🔐 ADMIN: stored admin password upgraded to a secure hash.");
  }
}
