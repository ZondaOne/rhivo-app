import { getDbClient } from './client';
import 'dotenv/config';

async function checkTables() {
  const sql = getDbClient();

  try {
    const tables = await sql`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
      ORDER BY table_name
    `;

    console.log('Tables in database:');
    tables.forEach((row: any) => {
      console.log(`  - ${row.table_name}`);
    });
    console.log(`\nTotal: ${tables.length} tables`);
  } catch (error) {
    console.error('Error:', error);
  }
}

checkTables();