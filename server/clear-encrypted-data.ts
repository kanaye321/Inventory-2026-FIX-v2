
import { db } from "./db";
import * as schema from "@shared/schema";

/**
 * Script to clear encrypted user data when encryption key has changed
 * WARNING: This will delete all users. Use with caution!
 */
async function clearEncryptedUserData() {
  if (!db) {
    console.error("❌ Database connection required");
    return;
  }

  console.log("⚠️  WARNING: This will delete ALL users and activities from the database!");
  console.log("🔄 Clearing encrypted user data...");

  try {
    // First, delete all activities (to avoid foreign key constraint)
    console.log("🗑️  Deleting activities...");
    await db.delete(schema.activities);
    console.log("✅ Activities deleted");

    // Then delete all users
    console.log("🗑️  Deleting users...");
    await db.delete(schema.users);
    console.log("✅ All users deleted successfully");
    console.log("📋 You can now restart the server to create a fresh admin user");
    console.log("   Default credentials: username=admin, password=admin123");
  } catch (error) {
    console.error("❌ Error clearing user data:", error);
    throw error;
  }
}

clearEncryptedUserData()
  .then(() => {
    console.log("✅ Operation completed successfully");
    process.exit(0);
  })
  .catch((error) => {
    console.error("❌ Operation failed:", error);
    process.exit(1);
  });
