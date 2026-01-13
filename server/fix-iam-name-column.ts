
import { db } from './db';
import { sql } from 'drizzle-orm';

async function addNameColumn() {
  try {
    console.log('Adding name column to iam_accounts table...');
    
    if (!db) {
      throw new Error('Database connection not available');
    }

    await db.execute(sql`
      ALTER TABLE iam_accounts 
      ADD COLUMN IF NOT EXISTS name TEXT;
    `);
    
    console.log('✅ Successfully added name column to iam_accounts table');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error adding name column:', error);
    process.exit(1);
  }
}

addNameColumn();
