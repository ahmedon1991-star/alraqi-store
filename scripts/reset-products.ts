import pg from "pg";
import dotenv from "dotenv";
dotenv.config();

const { Pool } = pg;

async function resetProducts() {
  const DATABASE_URL = process.env.DATABASE_URL;
  if (!DATABASE_URL) {
    console.error("❌ ERROR: No DATABASE_URL found in .env file.");
    process.exit(1);
  }

  const pool = new Pool({
    connectionString: DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });

  try {
    const poolCheck = await pool.connect();
    console.log("🚀 STARTING: Database cleanup...");
    
    // Check if products table exists and count them
    const { rows } = await pool.query("SELECT count(*) as count FROM products");
    console.log(`📦 INFO: Found ${rows[0].count} existing items in the products table.`);

    console.log("🧹 CLEANING: Deleting all products to remove heavy Base64 data...");
    await pool.query("DELETE FROM products");
    
    console.log("✅ SUCCESS: All products have been cleared.");
    console.log("✨ TIP: You can now go to the Admin Panel and add products using the new, fast upload system.");
    
    poolCheck.release();
  } catch (err) {
    console.error("❌ ERROR: Failed to reset database:", err);
  } finally {
    await pool.end();
    process.exit(0);
  }
}

resetProducts();
