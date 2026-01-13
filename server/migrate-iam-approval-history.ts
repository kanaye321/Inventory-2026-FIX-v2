
import { db } from "./db";
import { sql } from "drizzle-orm";

async function migrateIamApprovalHistory() {
  console.log("Creating IAM Account Approval History table...");
  
  try {
    if (!db) {
      throw new Error("Database connection not available");
    }

    // Create the iam_account_approval_history table
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS iam_account_approval_history (
        id SERIAL PRIMARY KEY,
        iam_account_id INTEGER NOT NULL REFERENCES iam_accounts(id) ON DELETE CASCADE,
        approval_number TEXT NOT NULL,
        duration TEXT,
        action TEXT NOT NULL,
        acted_by TEXT NOT NULL,
        acted_at TIMESTAMP DEFAULT NOW() NOT NULL
      );
    `);

    console.log("IAM Account Approval History table created successfully!");
  } catch (error) {
    console.error("Migration failed:", error);
    throw error;
  }
}

migrateIamApprovalHistory().catch(console.error);
