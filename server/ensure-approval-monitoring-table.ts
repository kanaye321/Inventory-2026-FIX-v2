
import { db } from "./db";
import { sql } from "drizzle-orm";

export async function ensureApprovalMonitoringTable() {
  if (!db) {
    console.log("Database not available - skipping approval_monitoring table creation");
    return;
  }

  try {
    // Check if table exists
    const tableCheck = await db.execute(sql`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'approval_monitoring'
      );
    `);

    const tableExists = tableCheck.rows[0]?.exists;

    if (!tableExists) {
      console.log("Creating approval_monitoring table...");
      
      // Create the table
      await db.execute(sql`
        CREATE TABLE IF NOT EXISTS approval_monitoring (
          id SERIAL PRIMARY KEY,
          type TEXT,
          platform TEXT,
          pic TEXT,
          ip_address TEXT,
          hostname_accounts TEXT,
          identifier_serial_number TEXT,
          approval_number TEXT,
          start_date TEXT,
          end_date TEXT,
          status TEXT,
          remarks TEXT,
          created_at TIMESTAMP DEFAULT NOW() NOT NULL,
          updated_at TIMESTAMP DEFAULT NOW() NOT NULL
        );
      `);

      console.log("✅ approval_monitoring table created successfully");
    } else {
      console.log("✅ approval_monitoring table already exists");
    }
  } catch (error) {
    console.error("Error ensuring approval_monitoring table:", error);
    throw error;
  }
}
