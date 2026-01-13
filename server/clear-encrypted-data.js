
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { config } from 'dotenv';

config();

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  console.error("❌ DATABASE_URL not set in environment variables");
  process.exit(1);
}

const client = postgres(connectionString);

async function clearEncryptedUserData() {
  console.log("⚠️  WARNING: This will delete ALL users from the database!");
  console.log("🔄 Clearing encrypted user data...");

  try {
    const result = await client`DELETE FROM users`;
    console.log("✅ All users deleted successfully");
    console.log("📋 You can now restart the server to create a fresh admin user");
    console.log("   Default credentials: username=admin, password=admin123");
  } catch (error) {
    console.error("❌ Error clearing user data:", error);
    throw error;
  } finally {
    await client.end();
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
