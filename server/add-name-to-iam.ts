
import { db } from './db';
import { sql } from 'drizzle-orm';

async function addNameColumn() {
  try {
    console.log('Adding name column to iam_accounts table...');
    
    await db.execute(sql`
      ALTER TABLE iam_accounts 
      ADD COLUMN IF NOT EXISTS name TEXT;
    `);
    
    console.log('✅ Successfully added name column to iam_accounts table');
  } catch (error) {
    console.error('❌ Error adding name column:', error);
    throw error;
  }
}

addNameColumn()
  .then(() => {
    console.log('Migration completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Migration failed:', error);
    process.exit(1);
  });
