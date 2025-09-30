import { neon } from '@neondatabase/serverless';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Verify required environment variables
if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL environment variable is required');
}

if (!process.env.JWT_SECRET) {
  throw new Error('JWT_SECRET environment variable is required');
}

// Create SQL connection
export const sql = neon(process.env.DATABASE_URL);

// Test configuration
export const TEST_CONFIG = {
  DATABASE_URL: process.env.DATABASE_URL,
  JWT_SECRET: process.env.JWT_SECRET,
  BASE_URL: process.env.BASE_URL || 'http://localhost:3000',
};

// Debug logger
export const debug = {
  log: (section: string, message: string, data?: any) => {
    console.log(`\n[DEBUG ${new Date().toISOString()}] [${section}] ${message}`);
    if (data) {
      console.log(JSON.stringify(data, null, 2));
    }
  },
  error: (section: string, message: string, error?: any) => {
    console.error(`\n[ERROR ${new Date().toISOString()}] [${section}] ${message}`);
    if (error) {
      console.error(error);
    }
  },
  success: (section: string, message: string, data?: any) => {
    console.log(`\n[SUCCESS ${new Date().toISOString()}] [${section}] ${message}`);
    if (data) {
      console.log(JSON.stringify(data, null, 2));
    }
  },
};

// Cleanup helper for tests
export async function cleanupTestData(sql: any) {
  debug.log('CLEANUP', 'Starting test data cleanup');

  try {
    // Delete in reverse order of dependencies
    await sql`DELETE FROM audit_logs WHERE appointment_id IN (SELECT id FROM appointments WHERE business_id IN (SELECT id FROM businesses WHERE subdomain LIKE 'test-%'))`;
    await sql`DELETE FROM notification_logs WHERE appointment_id IN (SELECT id FROM appointments WHERE business_id IN (SELECT id FROM businesses WHERE subdomain LIKE 'test-%'))`;
    await sql`DELETE FROM appointments WHERE business_id IN (SELECT id FROM businesses WHERE subdomain LIKE 'test-%')`;
    await sql`DELETE FROM reservations WHERE business_id IN (SELECT id FROM businesses WHERE subdomain LIKE 'test-%')`;
    await sql`DELETE FROM services WHERE business_id IN (SELECT id FROM businesses WHERE subdomain LIKE 'test-%')`;
    await sql`DELETE FROM categories WHERE business_id IN (SELECT id FROM businesses WHERE subdomain LIKE 'test-%')`;
    await sql`DELETE FROM availability WHERE business_id IN (SELECT id FROM businesses WHERE subdomain LIKE 'test-%')`;
    await sql`DELETE FROM refresh_tokens WHERE user_id IN (SELECT id FROM users WHERE email LIKE 'test-%@test.com')`;
    await sql`DELETE FROM users WHERE email LIKE 'test-%@test.com'`;
    await sql`DELETE FROM businesses WHERE subdomain LIKE 'test-%'`;

    // Clear rate limits for test emails
    await sql`DELETE FROM rate_limits WHERE identifier LIKE '%test-%@test.com%'`;

    debug.success('CLEANUP', 'Test data cleanup completed');
  } catch (error) {
    debug.error('CLEANUP', 'Failed to cleanup test data', error);
    throw error;
  }
}

// Clear rate limits at start of test run
export async function clearRateLimits(sql: any) {
  debug.log('CLEANUP', 'Clearing rate limits');
  try {
    await sql`DELETE FROM rate_limits WHERE identifier LIKE '%test-%' OR identifier = 'unknown'`;
    debug.success('CLEANUP', 'Rate limits cleared');
  } catch (error) {
    debug.error('CLEANUP', 'Failed to clear rate limits', error);
  }
}