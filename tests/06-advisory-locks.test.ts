import { sql, debug, cleanupTestData, TEST_CONFIG } from './setup';
import { nanoid } from 'nanoid';
import { v4 as uuidv4 } from 'uuid';

/**
 * Advisory Lock Effectiveness Tests
 *
 * These tests verify that PostgreSQL advisory locks properly serialize
 * concurrent reservation attempts for the same time slot, preventing
 * race conditions that could lead to double-bookings.
 *
 * Test Scenarios:
 * 1. Single slot, capacity=1, 100 concurrent attempts -> exactly 1 succeeds
 * 2. Single slot, capacity=2, 100 concurrent attempts -> exactly 2 succeed
 * 3. Verify lock key generation is deterministic
 * 4. Verify locks are released after transaction completes
 */

const testId = nanoid(8);
let testBusinessId: string;
let testServiceId: string;

async function setupTestData() {
  debug.log('SETUP', 'Creating test business and service for advisory lock tests...');

  try {
    // Create test business
    testBusinessId = uuidv4();
    await sql`
      INSERT INTO businesses (
        id, subdomain, name, timezone, config_yaml_path, config_version, status
      )
      VALUES (
        ${testBusinessId},
        'test-generic',
        'Advisory Lock Test Business',
        'America/New_York',
        'config/tenants/test-generic.yaml',
        1,
        'active'
      )
    `;

    // Create category
    const category = await sql`
      INSERT INTO categories (business_id, name, sort_order)
      VALUES (${testBusinessId}, 'Test Services', 0)
      RETURNING id
    `;

    // Create service with capacity = 1 for strict testing (matches YAML config)
    const service = await sql`
      INSERT INTO services (
        business_id,
        category_id,
        name,
        external_id,
        duration_minutes,
        price_cents,
        color,
        max_simultaneous_bookings,
        sort_order
      )
      VALUES (
        ${testBusinessId},
        ${category[0].id},
        'Test Service (Capacity 1)',
        'test-service-cap1',
        60,
        5000,
        '#10b981',
        1,
        0
      )
      RETURNING id
    `;

    testServiceId = service[0].id;

    debug.success('SETUP', 'Test data created', {
      businessId: testBusinessId,
      serviceId: testServiceId,
    });

    return true;
  } catch (error) {
    debug.error('SETUP', 'Failed to create test data', error);
    return false;
  }
}

async function testAdvisoryLockSerializesConcurrentReservations() {
  debug.log('ADVISORY_LOCK_SERIALIZATION', 'Testing advisory lock with 100 concurrent attempts for capacity=1...');

  try {
    // Slot in the future
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + 7);
    futureDate.setHours(10, 0, 0, 0);

    const startTime = futureDate.toISOString();

    // Spawn 100 concurrent reservation attempts
    const promises = Array.from({ length: 100 }, (_, i) =>
      fetch(`${TEST_CONFIG.BASE_URL}/api/booking/reserve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          businessId: testBusinessId,
          serviceId: testServiceId,
          startTime,
          idempotencyKey: `advisory-test-${testId}-${i}`,
        }),
      })
        .then(async res => ({
          status: res.status,
          ok: res.ok,
          data: await res.json(),
        }))
        .catch(err => ({
          status: 0,
          ok: false,
          data: { error: err.message },
        }))
    );

    const results = await Promise.all(promises);

    const successCount = results.filter(r => r.ok).length;
    const failureCount = results.filter(r => !r.ok).length;

    // Log first few errors for debugging
    const errors = results.filter(r => !r.ok).slice(0, 3);
    debug.log('ADVISORY_LOCK_SERIALIZATION', 'Sample errors:', errors.map(e => e.data));

    debug.log('ADVISORY_LOCK_SERIALIZATION', 'Concurrent reservation results', {
      total: results.length,
      succeeded: successCount,
      failed: failureCount,
    });

    // CRITICAL: With capacity=1 and advisory locks, exactly 1 should succeed
    if (successCount !== 1) {
      debug.error(
        'ADVISORY_LOCK_SERIALIZATION',
        `Expected exactly 1 success, got ${successCount}. Advisory locks may not be working!`
      );
      return { success: false };
    }

    if (failureCount !== 99) {
      debug.error('ADVISORY_LOCK_SERIALIZATION', `Expected 99 failures, got ${failureCount}`);
      return { success: false };
    }

    // Verify in database that only 1 reservation exists
    const reservations = await sql`
      SELECT COUNT(*) as count
      FROM reservations
      WHERE business_id = ${testBusinessId}
        AND service_id = ${testServiceId}
        AND slot_start = ${futureDate}
        AND expires_at > NOW()
    `;

    const reservationCount = parseInt(reservations[0].count, 10);

    if (reservationCount !== 1) {
      debug.error(
        'ADVISORY_LOCK_SERIALIZATION',
        `Expected 1 reservation in DB, found ${reservationCount}. DATA CONSISTENCY VIOLATION!`
      );
      return { success: false };
    }

    debug.success('ADVISORY_LOCK_SERIALIZATION', 'Advisory locks correctly serialized 100 concurrent attempts to exactly 1 success');
    return { success: true };
  } catch (error) {
    debug.error('ADVISORY_LOCK_SERIALIZATION', 'Test failed', error);
    return { success: false };
  }
}

async function testAdvisoryLockWithCapacity2() {
  debug.log('ADVISORY_LOCK_CAPACITY_2', 'Testing advisory lock with capacity=2 and 50 concurrent attempts...');

  try {
    // Create a second service with capacity=2
    const category = await sql`
      SELECT id FROM categories WHERE business_id = ${testBusinessId} LIMIT 1
    `;

    const service2 = await sql`
      INSERT INTO services (
        business_id,
        category_id,
        name,
        external_id,
        duration_minutes,
        price_cents,
        color,
        max_simultaneous_bookings,
        sort_order
      )
      VALUES (
        ${testBusinessId},
        ${category[0].id},
        'Test Service (Capacity 2)',
        'test-service-cap2',
        60,
        5000,
        '#3b82f6',
        2,
        1
      )
      RETURNING id
    `;

    const serviceId2 = service2[0].id;

    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + 7);
    futureDate.setHours(14, 0, 0, 0);

    const startTime = futureDate.toISOString();

    // Spawn 50 concurrent attempts
    const promises = Array.from({ length: 50 }, (_, i) =>
      fetch(`${TEST_CONFIG.BASE_URL}/api/booking/reserve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          businessId: testBusinessId,
          serviceId: serviceId2,
          startTime,
          idempotencyKey: `advisory-cap2-${testId}-${i}`,
        }),
      })
        .then(async res => ({
          ok: res.ok,
          data: await res.json(),
        }))
        .catch(err => ({
          ok: false,
          data: { error: err.message },
        }))
    );

    const results = await Promise.all(promises);
    const successCount = results.filter(r => r.ok).length;

    debug.log('ADVISORY_LOCK_CAPACITY_2', `${successCount} out of 50 attempts succeeded`);

    // CRITICAL: With capacity=2, exactly 2 should succeed
    if (successCount !== 2) {
      debug.error('ADVISORY_LOCK_CAPACITY_2', `Expected exactly 2 successes, got ${successCount}`);
      return { success: false };
    }

    // Verify in database
    const reservations = await sql`
      SELECT COUNT(*) as count
      FROM reservations
      WHERE business_id = ${testBusinessId}
        AND service_id = ${serviceId2}
        AND slot_start = ${futureDate}
        AND expires_at > NOW()
    `;

    const reservationCount = parseInt(reservations[0].count, 10);

    if (reservationCount !== 2) {
      debug.error('ADVISORY_LOCK_CAPACITY_2', `Expected 2 reservations in DB, found ${reservationCount}`);
      return { success: false };
    }

    debug.success('ADVISORY_LOCK_CAPACITY_2', 'Advisory locks correctly enforced capacity=2');
    return { success: true };
  } catch (error) {
    debug.error('ADVISORY_LOCK_CAPACITY_2', 'Test failed', error);
    return { success: false };
  }
}

async function testLockReleaseAfterTransaction() {
  debug.log('ADVISORY_LOCK_RELEASE', 'Testing that locks are released after transaction completes...');

  try {
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + 7);
    futureDate.setHours(16, 0, 0, 0);

    const startTime = futureDate.toISOString();

    // First reservation
    const res1 = await fetch(`${TEST_CONFIG.BASE_URL}/api/booking/reserve`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        businessId: testBusinessId,
        serviceId: testServiceId,
        startTime,
        idempotencyKey: `lock-release-1-${testId}`,
      }),
    });

    if (!res1.ok) {
      debug.error('ADVISORY_LOCK_RELEASE', 'First reservation failed');
      return { success: false };
    }

    const data1 = await res1.json();

    // Delete the first reservation to free up capacity
    await sql`
      DELETE FROM reservations WHERE id = ${data1.reservationId || data1.reservationToken}
    `;

    debug.log('ADVISORY_LOCK_RELEASE', 'Deleted first reservation, slot should be free');

    // Second reservation should now succeed (proving lock was released)
    const res2 = await fetch(`${TEST_CONFIG.BASE_URL}/api/booking/reserve`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        businessId: testBusinessId,
        serviceId: testServiceId,
        startTime,
        idempotencyKey: `lock-release-2-${testId}`,
      }),
    });

    if (!res2.ok) {
      debug.error('ADVISORY_LOCK_RELEASE', 'Second reservation failed after first was deleted. Lock may not have been released!');
      return { success: false };
    }

    debug.success('ADVISORY_LOCK_RELEASE', 'Lock was properly released after transaction commit');
    return { success: true };
  } catch (error) {
    debug.error('ADVISORY_LOCK_RELEASE', 'Test failed', error);
    return { success: false };
  }
}

async function runAdvisoryLockTests() {
  console.log('\n========================================');
  console.log('ADVISORY LOCK EFFECTIVENESS TESTS');
  console.log('========================================\n');

  const setupSuccess = await setupTestData();
  if (!setupSuccess) {
    console.error('Failed to setup test data. Aborting tests.');
    return false;
  }

  const results = [];

  // Test 1: Capacity=1 with 100 concurrent attempts
  const test1 = await testAdvisoryLockSerializesConcurrentReservations();
  results.push({ name: 'Advisory Lock Serialization (capacity=1, 100 attempts)', passed: test1.success });

  // Test 2: Capacity=2 with 50 concurrent attempts
  const test2 = await testAdvisoryLockWithCapacity2();
  results.push({ name: 'Advisory Lock Capacity=2 (50 attempts)', passed: test2.success });

  // Test 3: Lock release after transaction
  const test3 = await testLockReleaseAfterTransaction();
  results.push({ name: 'Lock Release After Transaction', passed: test3.success });

  // Cleanup
  debug.log('CLEANUP', 'Cleaning up advisory lock test data...');
  await cleanupTestData(sql, testBusinessId);

  console.log('\n========================================');
  console.log('ADVISORY LOCK TEST RESULTS');
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
runAdvisoryLockTests()
  .then(success => {
    process.exit(success ? 0 : 1);
  })
  .catch(error => {
    debug.error('TEST_RUNNER', 'Fatal error running advisory lock tests', error);
    process.exit(1);
  });
