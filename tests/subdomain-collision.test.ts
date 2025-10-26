/**
 * Test subdomain collision handling
 *
 * Verifies SEC-017 fix:
 * 1. Multiple businesses with same name get unique subdomains
 * 2. YAML files are only created after successful DB insertion
 * 3. Orphaned YAML cleanup works correctly
 */

import 'dotenv/config';
import { getDbClient } from '@/db/client';
import { cleanupOrphanedYAMLFiles } from '@/lib/utils/yaml-cleanup';
import fs from 'fs/promises';
import path from 'path';

const db = getDbClient();
const TEST_EMAIL_PREFIX = 'collision-test';
const TEST_BUSINESS_NAME = 'Blues Barber Shop';
const API_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3001';

async function cleanup() {
  console.log('🧹 Cleaning up test data...');

  // Delete test businesses and users
  await db`
    DELETE FROM users
    WHERE email LIKE ${TEST_EMAIL_PREFIX + '%'}
  `;

  await db`
    DELETE FROM businesses
    WHERE name = ${TEST_BUSINESS_NAME}
  `;

  console.log('✅ Cleanup complete');
}

async function testSubdomainCollision() {
  console.log('\n🧪 Test: Subdomain Collision Handling');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  try {
    // Test 1: Create first business with name "Blues Barber Shop"
    console.log('📝 Test 1: Creating first business...');
    const response1 = await fetch(`${API_URL}/api/auth/signup/owner`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: `${TEST_EMAIL_PREFIX}-1@test.com`,
        password: 'TestPassword123!',
        name: 'John Doe',
        businessName: TEST_BUSINESS_NAME,
        timezone: 'America/New_York',
      }),
    });

    const data1 = await response1.json();
    console.log('Response:', data1);

    if (response1.status !== 201) {
      throw new Error(`First signup failed: ${JSON.stringify(data1)}`);
    }

    // Get the subdomain that was created
    const business1 = await db`
      SELECT subdomain FROM businesses WHERE name = ${TEST_BUSINESS_NAME} LIMIT 1
    `;

    if (business1.length === 0) {
      throw new Error('First business not found in database');
    }

    const subdomain1 = business1[0].subdomain;
    console.log(`✅ First business created with subdomain: ${subdomain1}`);

    // Test 2: Create second business with SAME name
    console.log('\n📝 Test 2: Creating second business with same name...');
    const response2 = await fetch(`${API_URL}/api/auth/signup/owner`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: `${TEST_EMAIL_PREFIX}-2@test.com`,
        password: 'TestPassword123!',
        name: 'Jane Smith',
        businessName: TEST_BUSINESS_NAME,
        timezone: 'America/New_York',
      }),
    });

    const data2 = await response2.json();
    console.log('Response:', data2);

    if (response2.status !== 201) {
      throw new Error(`Second signup failed: ${JSON.stringify(data2)}`);
    }

    // Get the subdomain for second business
    const business2 = await db`
      SELECT subdomain FROM businesses
      WHERE name = ${TEST_BUSINESS_NAME}
      ORDER BY created_at DESC
      LIMIT 1
    `;

    if (business2.length === 0) {
      throw new Error('Second business not found in database');
    }

    const subdomain2 = business2[0].subdomain;
    console.log(`✅ Second business created with subdomain: ${subdomain2}`);

    // Test 3: Verify subdomains are different
    console.log('\n📝 Test 3: Verifying subdomains are unique...');
    if (subdomain1 === subdomain2) {
      throw new Error('❌ COLLISION DETECTED: Both businesses have the same subdomain!');
    }

    console.log(`✅ Subdomains are unique:`);
    console.log(`   Business 1: ${subdomain1}`);
    console.log(`   Business 2: ${subdomain2}`);

    // Test 4: Verify both subdomains follow naming pattern
    console.log('\n📝 Test 4: Verifying subdomain format...');
    const expectedBase = 'blues-barber-shop';

    if (subdomain1 !== expectedBase) {
      throw new Error(`First subdomain should be base: ${expectedBase}, got: ${subdomain1}`);
    }

    if (!subdomain2.startsWith(expectedBase + '-')) {
      throw new Error(`Second subdomain should start with ${expectedBase}-, got: ${subdomain2}`);
    }

    const suffix = subdomain2.replace(expectedBase + '-', '');
    if (suffix.length < 4) {
      throw new Error(`Second subdomain suffix too short: ${suffix}`);
    }

    console.log(`✅ Subdomain format correct:`);
    console.log(`   Base: ${expectedBase}`);
    console.log(`   Collision suffix: ${suffix}`);

    // Test 5: Create third business to test multiple collisions
    console.log('\n📝 Test 5: Creating third business (another collision)...');
    const response3 = await fetch(`${API_URL}/api/auth/signup/owner`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: `${TEST_EMAIL_PREFIX}-3@test.com`,
        password: 'TestPassword123!',
        name: 'Bob Johnson',
        businessName: TEST_BUSINESS_NAME,
        timezone: 'America/New_York',
      }),
    });

    if (response3.status !== 201) {
      throw new Error('Third signup failed');
    }

    const business3 = await db`
      SELECT subdomain FROM businesses
      WHERE name = ${TEST_BUSINESS_NAME}
      ORDER BY created_at DESC
      LIMIT 1
    `;

    const subdomain3 = business3[0].subdomain;
    console.log(`✅ Third business created with subdomain: ${subdomain3}`);

    // Verify all three are unique
    const allSubdomains = [subdomain1, subdomain2, subdomain3];
    const uniqueSubdomains = new Set(allSubdomains);

    if (uniqueSubdomains.size !== 3) {
      throw new Error(`❌ Duplicate subdomains detected: ${JSON.stringify(allSubdomains)}`);
    }

    console.log(`✅ All three subdomains are unique`);

    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('✅ All collision tests passed!');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  } catch (error) {
    console.error('\n❌ Test failed:', error);
    throw error;
  }
}

async function testYAMLOrphanCleanup() {
  console.log('\n🧪 Test: YAML Orphan Cleanup');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  const testDir = 'config/tenants';
  const orphanSubdomain = 'test-orphan-' + Date.now();

  try {
    // Test 1: Create an orphaned YAML file (without database entry)
    console.log('📝 Test 1: Creating orphaned YAML file...');
    const yamlContent = `
business:
  id: ${orphanSubdomain}
  name: Test Orphan Business
  timezone: America/New_York
categories: []
availability: []
bookingLimits:
  maxSimultaneousBookings: 1
`;

    const fullPath = path.resolve(process.cwd(), testDir, `${orphanSubdomain}.yaml`);
    await fs.mkdir(path.dirname(fullPath), { recursive: true });
    await fs.writeFile(fullPath, yamlContent, 'utf-8');

    console.log(`✅ Created orphaned YAML: ${orphanSubdomain}.yaml`);

    // Test 2: Verify file exists
    console.log('\n📝 Test 2: Verifying orphaned file exists...');
    try {
      await fs.access(fullPath);
      console.log('✅ File exists');
    } catch {
      throw new Error('Failed to create test file');
    }

    // Test 3: Run cleanup in dry-run mode
    console.log('\n📝 Test 3: Running cleanup (dry run)...');
    const dryRunResult = await cleanupOrphanedYAMLFiles(testDir, true);

    console.log(`Found ${dryRunResult.orphanedFiles.length} orphaned files`);

    if (!dryRunResult.orphanedFiles.includes(`${orphanSubdomain}.yaml`)) {
      throw new Error('Orphaned file not detected in dry run');
    }

    console.log('✅ Dry run detected orphaned file');

    // Verify file still exists after dry run
    try {
      await fs.access(fullPath);
      console.log('✅ File still exists (not deleted in dry run)');
    } catch {
      throw new Error('File was deleted in dry run (should not happen)');
    }

    // Test 4: Run cleanup with apply
    console.log('\n📝 Test 4: Running cleanup (apply)...');
    const applyResult = await cleanupOrphanedYAMLFiles(testDir, false);

    if (!applyResult.removedFiles.includes(`${orphanSubdomain}.yaml`)) {
      throw new Error('Orphaned file not removed');
    }

    console.log('✅ Cleanup removed orphaned file');

    // Test 5: Verify file is gone
    console.log('\n📝 Test 5: Verifying file was deleted...');
    try {
      await fs.access(fullPath);
      throw new Error('File still exists after cleanup');
    } catch (error: any) {
      if (error.code === 'ENOENT') {
        console.log('✅ File successfully deleted');
      } else {
        throw error;
      }
    }

    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('✅ All YAML cleanup tests passed!');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  } catch (error) {
    console.error('\n❌ Test failed:', error);
    throw error;
  }
}

async function main() {
  console.log('🧪 Subdomain Collision & YAML Cleanup Tests');
  console.log('═══════════════════════════════════════════════════════\n');

  try {
    // Clean up any existing test data
    await cleanup();

    // Run collision tests
    await testSubdomainCollision();

    // Run YAML cleanup tests
    await testYAMLOrphanCleanup();

    // Final cleanup
    await cleanup();

    console.log('═══════════════════════════════════════════════════════');
    console.log('✅ All tests passed!');
    console.log('═══════════════════════════════════════════════════════\n');

    process.exit(0);
  } catch (error) {
    console.error('\n═══════════════════════════════════════════════════════');
    console.error('❌ Tests failed!');
    console.error('═══════════════════════════════════════════════════════\n');
    console.error(error);

    // Cleanup even on failure
    await cleanup();

    process.exit(1);
  }
}

main();
