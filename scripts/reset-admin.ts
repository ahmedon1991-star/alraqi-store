/**
 * Emergency admin password reset.
 *
 * Usage (from the project folder, with DATABASE_URL in .env):
 *   ADMIN_PASSWORD="new-strong-password" npx tsx scripts/reset-admin.ts
 *
 * The password is stored hashed and is never printed.
 */
import dotenv from "dotenv";
dotenv.config();

import pg from "pg";
import { KNOWN_DEFAULT_ADMIN_PASSWORD, MIN_ADMIN_PASSWORD_LENGTH, hashPassword } from "../server/security";

async function resetAdminPassword() {
  const DATABASE_URL = process.env.DATABASE_URL;
  if (!DATABASE_URL) {
    console.error("❌ DATABASE_URL not found in .env");
    process.exit(1);
  }

  const username = (process.env.ADMIN_USERNAME || "admin").trim();
  const password = process.env.ADMIN_PASSWORD || "";
  if (password.length < MIN_ADMIN_PASSWORD_LENGTH || password === KNOWN_DEFAULT_ADMIN_PASSWORD) {
    console.error(`❌ Set ADMIN_PASSWORD to a strong password (at least ${MIN_ADMIN_PASSWORD_LENGTH} characters, not the old default).`);
    process.exit(1);
  }

  const pool = new pg.Pool({ connectionString: DATABASE_URL, ssl: { rejectUnauthorized: false } });

  try {
    await pool.query(
      `INSERT INTO admin_settings (id, username, password) VALUES (1, $1, $2)
       ON CONFLICT (id) DO UPDATE SET username = EXCLUDED.username, password = EXCLUDED.password`,
      [username, hashPassword(password)]
    );
    // Log out all existing admin sessions
    await pool.query(`DELETE FROM sessions WHERE user_id LIKE 'admin-%'`);
    console.log(`✅ Admin password reset for user "${username}". All admin sessions were logged out.`);
  } catch (err) {
    console.error("❌ Error:", err);
    process.exitCode = 1;
  } finally {
    await pool.end();
  }
}

resetAdminPassword();
