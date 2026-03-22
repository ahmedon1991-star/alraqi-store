import { db } from "./server/storage";
import { users, products, categories, orders } from "./shared/schema";
import { sql } from "drizzle-orm";

async function test() {
  console.log("Testing database tables...");
  
  if (!db) {
    console.log("❌ DB object is null (Memory Storage mode)");
    process.exit(1);
  }

  try {
    const res = await db.execute(sql`SELECT 1`);
    console.log("✅ Basic connection OK");
    
    try {
      const u = await db.select().from(users).limit(1);
      console.log(`✅ Users table: OK (${u.length} found)`);
    } catch (e) {
      console.log("❌ Users table: FAILED", e);
    }

    try {
      const p = await db.select().from(products).limit(1);
      console.log(`✅ Products table: OK (${p.length} found)`);
    } catch (e) {
      console.log("❌ Products table: FAILED", e);
    }

    try {
      const c = await db.select().from(categories).limit(1);
      console.log(`✅ Categories table: OK (${c.length} found)`);
    } catch (e) {
      console.log("❌ Categories table: FAILED", e);
    }

    try {
      const o = await db.select().from(orders).limit(1);
      console.log(`✅ Orders table: OK (${o.length} found)`);
    } catch (e) {
      console.log("❌ Orders table: FAILED", e);
    }

  } catch (error) {
    console.error("❌ Database test failed:", error);
  }
}

test().then(() => process.exit(0));
