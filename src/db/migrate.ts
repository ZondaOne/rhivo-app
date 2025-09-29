import { readFileSync, readdirSync } from 'fs';
import { join } from 'path';
import { Client } from 'pg';
import 'dotenv/config';

const MIGRATIONS_DIR = join(__dirname, 'migrations');

interface Migration {
  filename: string;
  number: number;
  sql: string;
}

async function createMigrationsTable(client: Client) {
  await client.query(`
    CREATE TABLE IF NOT EXISTS migrations (
      id SERIAL PRIMARY KEY,
      migration_number INTEGER UNIQUE NOT NULL,
      filename TEXT NOT NULL,
      executed_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
    )
  `);
}

async function getExecutedMigrations(client: Client): Promise<number[]> {
  try {
    const result = await client.query(
      'SELECT migration_number FROM migrations ORDER BY migration_number'
    );
    return result.rows.map((row: any) => row.migration_number);
  } catch (error) {
    return [];
  }
}

function getMigrationFiles(): Migration[] {
  const files = readdirSync(MIGRATIONS_DIR)
    .filter(f => f.endsWith('.sql'))
    .sort();

  return files.map(filename => {
    const match = filename.match(/^(\d+)_/);
    const number = match ? parseInt(match[1], 10) : 0;
    const sql = readFileSync(join(MIGRATIONS_DIR, filename), 'utf-8');

    return { filename, number, sql };
  });
}

async function executeMigration(
  client: Client,
  migration: Migration
) {
  console.log(`Executing migration: ${migration.filename}`);

  try {
    // Execute the entire migration SQL (pg client supports multi-statement)
    await client.query(migration.sql);

    // Record migration
    await client.query(
      'INSERT INTO migrations (migration_number, filename) VALUES ($1, $2)',
      [migration.number, migration.filename]
    );

    console.log(`✓ Migration ${migration.filename} completed successfully`);
  } catch (error) {
    console.error(`✗ Migration ${migration.filename} failed:`, error);
    throw error;
  }
}

async function runMigrations() {
  console.log('Starting database migrations...\n');

  const client = new Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();

  try {
    // Create migrations tracking table
    await createMigrationsTable(client);

    // Get executed and pending migrations
    const executed = await getExecutedMigrations(client);
    const allMigrations = getMigrationFiles();
    const pending = allMigrations.filter(m => !executed.includes(m.number));

    if (pending.length === 0) {
      console.log('No pending migrations. Database is up to date.');
      return;
    }

    console.log(`Found ${pending.length} pending migration(s):\n`);
    pending.forEach(m => console.log(`  - ${m.filename}`));
    console.log('');

    // Execute pending migrations
    for (const migration of pending) {
      await executeMigration(client, migration);
    }

    console.log('\n✓ All migrations completed successfully!');
  } catch (error) {
    console.error('\n✗ Migration failed:', error);
    process.exit(1);
  } finally {
    await client.end();
  }
}

async function rollbackLastMigration() {
  console.log('Rolling back last migration...\n');

  const client = new Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();

  try {
    // Get last executed migration
    const result = await client.query(
      'SELECT migration_number, filename FROM migrations ORDER BY migration_number DESC LIMIT 1'
    );

    if (result.rows.length === 0) {
      console.log('No migrations to roll back.');
      return;
    }

    const last = result.rows[0];
    console.log(`Rolling back: ${last.filename}`);

    // Note: Rollback logic would require down migrations
    // For now, we'll just remove the record and warn the user
    await client.query(
      'DELETE FROM migrations WHERE migration_number = $1',
      [last.migration_number]
    );

    console.warn(`
⚠ Warning: Migration record removed, but schema changes were NOT reverted.
Rollback must be performed manually or via a down migration script.
Last migration was: ${last.filename}
    `);
  } catch (error) {
    console.error('✗ Rollback failed:', error);
    process.exit(1);
  } finally {
    await client.end();
  }
}

async function showMigrationStatus() {
  const client = new Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();

  try {
    await createMigrationsTable(client);

    const executed = await getExecutedMigrations(client);
    const allMigrations = getMigrationFiles();

    console.log('Migration Status:\n');
    console.log('Executed migrations:');
    if (executed.length === 0) {
      console.log('  (none)');
    } else {
      executed.forEach(num => {
        const migration = allMigrations.find(m => m.number === num);
        console.log(`  ✓ ${migration?.filename || `Migration #${num}`}`);
      });
    }

    const pending = allMigrations.filter(m => !executed.includes(m.number));
    console.log('\nPending migrations:');
    if (pending.length === 0) {
      console.log('  (none)');
    } else {
      pending.forEach(m => console.log(`  - ${m.filename}`));
    }
  } catch (error) {
    console.error('✗ Failed to get migration status:', error);
    process.exit(1);
  } finally {
    await client.end();
  }
}

// CLI interface
const command = process.argv[2];

switch (command) {
  case 'up':
    runMigrations();
    break;
  case 'rollback':
    rollbackLastMigration();
    break;
  case 'status':
    showMigrationStatus();
    break;
  default:
    console.log(`
Usage: npm run migrate [command]

Commands:
  up        Run pending migrations
  status    Show migration status
  rollback  Roll back last migration (removes record only)

Examples:
  npm run migrate up
  npm run migrate status
  npm run migrate rollback
    `);
    process.exit(1);
}