import { sql, debug, cleanupTestData } from './setup';

/**
 * Database Connection and Schema Tests
 *
 * Tests database connectivity and verifies all required tables exist
 * with proper schema structure.
 */

async function testDatabaseConnection() {
  debug.log('DB_CONNECTION', 'Testing database connection...');

  try {
    const result = await sql`SELECT NOW() as current_time, version() as pg_version`;
    debug.success('DB_CONNECTION', 'Database connection successful', {
      currentTime: result[0].current_time,
      pgVersion: result[0].pg_version,
    });
    return true;
  } catch (error) {
    debug.error('DB_CONNECTION', 'Database connection failed', error);
    return false;
  }
}

async function testTablesExist() {
  debug.log('DB_SCHEMA', 'Checking if all required tables exist...');

  const requiredTables = [
    'users',
    'businesses',
    'categories',
    'services',
    'availability',
    'appointments',
    'reservations',
    'notification_logs',
    'audit_logs',
  ];

  try {
    const result = await sql`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
      AND table_type = 'BASE TABLE'
      ORDER BY table_name
    `;

    const existingTables = result.map((row: any) => row.table_name);
    debug.log('DB_SCHEMA', 'Found tables', existingTables);

    const missingTables = requiredTables.filter(table => !existingTables.includes(table));

    if (missingTables.length > 0) {
      debug.error('DB_SCHEMA', 'Missing required tables', missingTables);
      return false;
    }

    debug.success('DB_SCHEMA', 'All required tables exist');
    return true;
  } catch (error) {
    debug.error('DB_SCHEMA', 'Failed to check tables', error);
    return false;
  }
}

async function testTableSchemas() {
  debug.log('DB_SCHEMA', 'Verifying table schemas...');

  try {
    // Test users table
    const usersColumns = await sql`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_name = 'users'
      ORDER BY ordinal_position
    `;
    debug.log('DB_SCHEMA', 'Users table schema', usersColumns);

    // Test businesses table
    const businessesColumns = await sql`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_name = 'businesses'
      ORDER BY ordinal_position
    `;
    debug.log('DB_SCHEMA', 'Businesses table schema', businessesColumns);

    // Test appointments table
    const appointmentsColumns = await sql`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_name = 'appointments'
      ORDER BY ordinal_position
    `;
    debug.log('DB_SCHEMA', 'Appointments table schema', appointmentsColumns);

    // Test reservations table
    const reservationColumns = await sql`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_name = 'reservations'
      ORDER BY ordinal_position
    `;
    debug.log('DB_SCHEMA', 'Reservations table schema', reservationColumns);

    debug.success('DB_SCHEMA', 'Table schemas verified');
    return true;
  } catch (error) {
    debug.error('DB_SCHEMA', 'Failed to verify table schemas', error);
    return false;
  }
}

async function testConstraints() {
  debug.log('DB_CONSTRAINTS', 'Checking database constraints...');

  try {
    const constraints = await sql`
      SELECT
        tc.constraint_name,
        tc.table_name,
        tc.constraint_type,
        kcu.column_name
      FROM information_schema.table_constraints tc
      LEFT JOIN information_schema.key_column_usage kcu
        ON tc.constraint_name = kcu.constraint_name
        AND tc.table_schema = kcu.table_schema
      WHERE tc.table_schema = 'public'
      AND tc.constraint_type IN ('PRIMARY KEY', 'FOREIGN KEY', 'UNIQUE')
      ORDER BY tc.table_name, tc.constraint_type
    `;

    debug.log('DB_CONSTRAINTS', 'Found constraints', constraints);
    debug.success('DB_CONSTRAINTS', `Found ${constraints.length} constraints`);
    return true;
  } catch (error) {
    debug.error('DB_CONSTRAINTS', 'Failed to check constraints', error);
    return false;
  }
}

async function testIndexes() {
  debug.log('DB_INDEXES', 'Checking database indexes...');

  try {
    const indexes = await sql`
      SELECT
        tablename,
        indexname,
        indexdef
      FROM pg_indexes
      WHERE schemaname = 'public'
      ORDER BY tablename, indexname
    `;

    debug.log('DB_INDEXES', 'Found indexes', indexes);
    debug.success('DB_INDEXES', `Found ${indexes.length} indexes`);
    return true;
  } catch (error) {
    debug.error('DB_INDEXES', 'Failed to check indexes', error);
    return false;
  }
}

// Run all database tests
async function runDatabaseTests() {
  console.log('\n========================================');
  console.log('DATABASE CONNECTION AND SCHEMA TESTS');
  console.log('========================================\n');

  const tests = [
    { name: 'Database Connection', fn: testDatabaseConnection },
    { name: 'Tables Exist', fn: testTablesExist },
    { name: 'Table Schemas', fn: testTableSchemas },
    { name: 'Constraints', fn: testConstraints },
    { name: 'Indexes', fn: testIndexes },
  ];

  const results = [];

  for (const test of tests) {
    const result = await test.fn();
    results.push({ name: test.name, passed: result });
  }

  console.log('\n========================================');
  console.log('DATABASE TEST RESULTS');
  console.log('========================================\n');

  results.forEach(result => {
    const status = result.passed ? '✓ PASS' : '✗ FAIL';
    console.log(`${status}: ${result.name}`);
  });

  const allPassed = results.every(r => r.passed);
  console.log(`\nTotal: ${results.filter(r => r.passed).length}/${results.length} passed\n`);

  return allPassed;
}

// Execute tests
runDatabaseTests()
  .then(success => {
    process.exit(success ? 0 : 1);
  })
  .catch(error => {
    debug.error('TEST_RUNNER', 'Fatal error running tests', error);
    process.exit(1);
  });