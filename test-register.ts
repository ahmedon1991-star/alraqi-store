import { storage } from "./server/storage";
import crypto from "node:crypto";

function hashPassword(password: string) {
  const salt = crypto.randomBytes(16).toString("hex");
  const hash = crypto.scryptSync(password, salt, 64).toString("hex");
  return `${salt}:${hash}`;
}

async function testRegister() {
  try {
    console.log("Testing user creation...");
    const user = await storage.createUser({
      username: "testuser_" + Date.now(),
      password: hashPassword("password123"),
      name: "Test User",
      email: "test_" + Date.now() + "@example.com",
      phone: "123456789",
      authProvider: "local",
      googleId: null,
      avatar: null
    });
    console.log("✅ User created successfully:", user.id);
    
    const users = await storage.getUsers();
    console.log(`Total users now: ${users.length}`);
  } catch (error) {
    console.error("❌ User creation failed:", error);
  } finally {
    process.exit(0);
  }
}

testRegister();
