
import { db } from './db';
import { sql } from 'drizzle-orm';

async function addUserKnoxIdColumn() {
  try {
    console.log('Adding user_knox_id column to iam_accounts table...');
    
    await db.execute(sql`
      ALTER TABLE iam_accounts 
      ADD COLUMN IF NOT EXISTS user_knox_id TEXT;
    `);
    
    console.log('✅ Successfully added user_knox_id column to iam_accounts table');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error adding user_knox_id column:', error);
    process.exit(1);
  }
}

addUserKnoxIdColumn();
