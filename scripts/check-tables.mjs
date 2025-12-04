#!/usr/bin/env node
import postgres from 'postgres';

const POSTGRES_URL = process.env.POSTGRES_URL || 'postgresql://postgres:postgres@127.0.0.1:54322/postgres';

const sql = postgres(POSTGRES_URL);

console.log('Checking tables in database...\n');

try {
  const tables = await sql`
    SELECT table_name
    FROM information_schema.tables
    WHERE table_schema = 'public'
      AND table_type = 'BASE TABLE'
    ORDER BY table_name
  `;

  console.log(`Found ${tables.length} tables:\n`);

  for (const table of tables) {
    console.log(`  - ${table.table_name}`);
  }

  // Check if our example tables exist
  const exampleTables = ['customers', 'projects', 'tasks', 'orders'];
  console.log('\nExample user tables status:');
  for (const tableName of exampleTables) {
    const exists = tables.some(t => t.table_name === tableName);
    console.log(`  ${exists ? '✓' : '✗'} ${tableName}`);
  }

} catch (error) {
  console.error('Error:', error.message);
} finally {
  await sql.end();
}
