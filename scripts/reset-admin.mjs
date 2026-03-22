import dotenv from "dotenv";
dotenv.config();
import pg from "pg";

const { Pool } = pg;

async function resetAdminPassword() {
  const DATABASE_URL = process.env.DATABASE_URL;
  if (!DATABASE_URL) {
    console.error("DATABASE_URL not found in .env");
    process.exit(1);
  }

  const ADMIN_USERNAME = process.env.ADMIN_USERNAME || "admin";
  const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "admin12345";

  console.log(`\nResetting admin to: ${ADMIN_USERNAME} / ${ADMIN_PASSWORD}`);

  const pool = new Pool({
    connectionString: DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });

  try {
    const check = await pool.query("SELECT id, username, password FROM admin_settings WHERE id=1");
    if (check.rows.length > 0) {
      const row = check.rows[0];
      console.log(`Current DB: username=${row.username}, password=${row.password}`);
      await pool.query(
        "UPDATE admin_settings SET username=$1, password=$2 WHERE id=1",
        [ADMIN_USERNAME, ADMIN_PASSWORD]
      );
      console.log(`\nUpdated! Now login with: ${ADMIN_USERNAME} / ${ADMIN_PASSWORD}`);
    } else {
      await pool.query(
        `INSERT INTO admin_settings (id, username, password, email, phone, address, facebook, instagram, twitter, shipping_fee, free_shipping_threshold, announcement_text) 
         VALUES (1, $1, $2, 'admin@example.com', '+249912345678', 'الخرطوم', 'https://facebook.com', 'https://instagram.com', 'https://twitter.com', 0, 50000, 'مرحباً بكم في متجر الراقي')`,
        [ADMIN_USERNAME, ADMIN_PASSWORD]
      );
      console.log(`Created new admin settings.`);
    }
  } catch (err) {
    console.error("Error:", err);
  } finally {
    await pool.end();
  }
}

resetAdminPassword();
