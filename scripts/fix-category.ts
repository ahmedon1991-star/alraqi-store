import pg from "pg";
import dotenv from "dotenv";
dotenv.config();

const { Pool } = pg;

async function fixCategory() {
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
    console.log("🚀 STARTING: Updating 'Canned goods' category icon...");
    
    // We try to match by id or name
    const result = await pool.query(
      "UPDATE categories SET icon = $1 WHERE id = $2 OR name = $3",
      ["/images/category-spices.png", "المعلبات", "المعلبات"]
    );
    
    if (result.rowCount > 0) {
      console.log(`✅ SUCCESS: Updated ${result.rowCount} category.`);
    } else {
      console.log("⚠️ WARNING: Could not find category matching 'canned'.");
      const all = await pool.query("SELECT * FROM categories");
      console.log("📂 Current Categories in DB:");
      console.table(all.rows);
    }
    
  } catch (err) {
    console.error("❌ ERROR: Failed to update database:", err);
  } finally {
    await pool.end();
    process.exit(0);
  }
}

fixCategory();
