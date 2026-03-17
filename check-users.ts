import { storage } from "./server/storage";

async function checkUsers() {
  try {
    const users = await storage.getUsers();
    console.log(`Total users found: ${users.length}`);
    users.forEach(u => {
      console.log(`- ID: ${u.id}, Name: ${u.name}, Email: ${u.email}, Provider: ${u.authProvider}`);
    });
  } catch (error) {
    console.error("Error checking users:", error);
  } finally {
    process.exit(0);
  }
}

checkUsers();
