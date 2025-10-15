import { sql, debug, cleanupTestData, TEST_CONFIG } from './setup';
import { nanoid } from 'nanoid';
import { v4 as uuidv4 } from 'uuid';

/**
 * Reservation Cleanup Resilience Tests
 *
 * These tests validate that the system continues to function correctly
 * even when reservation cleanup job fails or is delayed.
 *
 * Test Scenarios:
 * 1. Create 100 expired reservations and verify system still allows new bookings
 * 2. Verify expired reservations don't block capacity
 * 3. Test fallback cleanup when primary cleanup job fails
 * 4. Verify capacity calculations filter out expired reservations
 */

const testId = nanoid(8);
let testBusinessId: string;
let testServiceId: string;

async function setupTestData() {
  debug.log('SETUP', 'Creating test business and service for cleanup tests...');

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
        'Cleanup Test Business',
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

    // Create service with capacity = 2 (matches YAML)
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
        'Test Service (Capacity 2)',
        'test-service-cap2',
        60,
        5000,
        '#10b981',
        2,
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

async function createExpiredReservations(count: number): Promise<string[]> {
  debug.log('CREATE_EXPIRED', `Creating ${count} expired reservations...`);

  const ids: string[] = [];

  for (let i = 0; i < count; i++) {
    const id = uuidv4();
    ids.push(id);

    const slotStart = new Date();
    slotStart.setDate(slotStart.getDate() + 7);
    slotStart.setHours(10 + Math.floor(i / 10), (i % 10) * 6, 0, 0); // Spread across hours

    const slotEnd = new Date(slotStart);
    slotEnd.setHours(slotStart.getHours() + 1);

    // Insert with expires_at in the past
    await sql`
      INSERT INTO reservations (
        id,
        business_id,
        service_id,
        slot_start,
        slot_end,
        idempotency_key,
        expires_at,
        created_at
      ) VALUES (
        ${id},
        ${testBusinessId},
        ${testServiceId},
        ${slotStart},
        ${slotEnd},
        ${`expired-${testId}-${i}`},
        NOW() - INTERVAL '30 minutes',
        NOW() - INTERVAL '45 minutes'
      )
    `;
  }

  debug.log('CREATE_EXPIRED', `Created ${count} expired reservations`);
  return ids;
}

async function testExpiredReservationsDontBlockCapacity() {
  debug.log('EXPIRED_NO_BLOCK', 'Testing that expired reservations do not block capacity...');

  try {
    // Create 100 expired reservations
    await createExpiredReservations(100);

    const slotStart = new Date();
    slotStart.setDate(slotStart.getDate() + 7);
    slotStart.setHours(10, 0, 0, 0);

    const slotEnd = new Date(slotStart);
    slotEnd.setHours(11, 0, 0, 0);

    // Verify there are expired reservations in DB
    const expiredCount = await sql`
      SELECT COUNT(*) as count
      FROM reservations
      WHERE business_id = ${testBusinessId}
        AND expires_at < NOW()
    `;

    const expired = parseInt(expiredCount[0].count, 10);

    if (expired < 100) {
      debug.error('EXPIRED_NO_BLOCK', `Expected 100 expired reservations, found ${expired}`);
      return { success: false };
    }

    debug.log('EXPIRED_NO_BLOCK', `Confirmed ${expired} expired reservations exist`);

    // Now try to make a new reservation (should succeed despite expired reservations)
    const res1 = await fetch(`${TEST_CONFIG.BASE_URL}/api/booking/reserve`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        businessId: testBusinessId,
        serviceId: testServiceId,
        startTime: slotStart.toISOString(),
        idempotencyKey: `no-block-1-${testId}`,
      }),
    });

    if (!res1.ok) {
      const error = await res1.json();
      debug.error('EXPIRED_NO_BLOCK', 'First reservation failed! Expired reservations are blocking capacity:', error);
      return { success: false };
    }

    debug.log('EXPIRED_NO_BLOCK', 'First reservation succeeded');

    // Try a second reservation (should also succeed, capacity=2)
    const res2 = await fetch(`${TEST_CONFIG.BASE_URL}/api/booking/reserve`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        businessId: testBusinessId,
        serviceId: testServiceId,
        startTime: slotStart.toISOString(),
        idempotencyKey: `no-block-2-${testId}`,
      }),
    });

    if (!res2.ok) {
      const error = await res2.json();
      debug.error('EXPIRED_NO_BLOCK', 'Second reservation failed:', error);
      return { success: false };
    }

    debug.log('EXPIRED_NO_BLOCK', 'Second reservation succeeded');

    // Third should fail (capacity full)
    const res3 = await fetch(`${TEST_CONFIG.BASE_URL}/api/booking/reserve`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        businessId: testBusinessId,
        serviceId: testServiceId,
        startTime: slotStart.toISOString(),
        idempotencyKey: `no-block-3-${testId}`,
      }),
    });

    if (res3.ok) {
      debug.error('EXPIRED_NO_BLOCK', 'Third reservation succeeded when it should have failed (capacity=2)');
      return { success: false };
    }

    debug.success('EXPIRED_NO_BLOCK', 'Expired reservations correctly ignored in capacity calculations');
    return { success: true };
  } catch (error) {
    debug.error('EXPIRED_NO_BLOCK', 'Test failed', error);
    return { success: false };
  }
}

async function testCleanupJobFunctionality() {
  debug.log('CLEANUP_JOB', 'Testing cleanup job removes expired reservations...');

  try {
    // Create 50 expired reservations
    await createExpiredReservations(50);

    // Verify they exist
    const beforeCount = await sql`
      SELECT COUNT(*) as count
      FROM reservations
      WHERE business_id = ${testBusinessId}
        AND expires_at < NOW()
    `;

    const before = parseInt(beforeCount[0].count, 10);

    if (before === 0) {
      debug.error('CLEANUP_JOB', 'No expired reservations found before cleanup');
      return { success: false };
    }

    debug.log('CLEANUP_JOB', `${before} expired reservations before cleanup`);

    // Call the cleanup endpoint
    const cleanupRes = await fetch(`${TEST_CONFIG.BASE_URL}/api/cron/cleanup-reservations`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.CRON_SECRET || 'test-secret'}`,
      },
    });

    if (!cleanupRes.ok) {
      const error = await cleanupRes.json();
      debug.error('CLEANUP_JOB', 'Cleanup endpoint failed:', error);
      return { success: false };
    }

    const cleanupData = await cleanupRes.json();
    debug.log('CLEANUP_JOB', 'Cleanup response:', cleanupData);

    // Verify expired reservations were removed
    const afterCount = await sql`
      SELECT COUNT(*) as count
      FROM reservations
      WHERE business_id = ${testBusinessId}
        AND expires_at < NOW()
    `;

    const after = parseInt(afterCount[0].count, 10);

    debug.log('CLEANUP_JOB', `${after} expired reservations after cleanup`);

    if (after !== 0) {
      debug.error('CLEANUP_JOB', `Cleanup job failed to remove all expired reservations. ${after} remain.`);
      return { success: false };
    }

    debug.success('CLEANUP_JOB', `Cleanup job successfully removed ${before} expired reservations`);
    return { success: true };
  } catch (error) {
    debug.error('CLEANUP_JOB', 'Test failed', error);
    return { success: false };
  }
}

async function testSystemFunctionsWithManyExpiredReservations() {
  debug.log('MANY_EXPIRED', 'Testing system functions with 200 expired reservations...');

  try {
    // Create 200 expired reservations (stress test)
    await createExpiredReservations(200);

    // Verify count
    const count = await sql`
      SELECT COUNT(*) as count
      FROM reservations
      WHERE business_id = ${testBusinessId}
        AND expires_at < NOW()
    `;

    const expiredCount = parseInt(count[0].count, 10);

    if (expiredCount < 200) {
      debug.error('MANY_EXPIRED', `Expected 200+ expired reservations, found ${expiredCount}`);
      return { success: false };
    }

    debug.log('MANY_EXPIRED', `System has ${expiredCount} expired reservations`);

    // Try to make bookings across multiple time slots
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + 7);
    futureDate.setHours(14, 0, 0, 0);

    const bookingAttempts = [];

    for (let i = 0; i < 10; i++) {
      const slotTime = new Date(futureDate);
      slotTime.setHours(14 + i, 0, 0, 0);

      bookingAttempts.push(
        fetch(`${TEST_CONFIG.BASE_URL}/api/booking/reserve`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            businessId: testBusinessId,
            serviceId: testServiceId,
            startTime: slotTime.toISOString(),
            idempotencyKey: `many-expired-${testId}-${i}`,
          }),
        }).then(async res => ({ ok: res.ok, data: await res.json() }))
      );
    }

    const results = await Promise.all(bookingAttempts);
    const successful = results.filter(r => r.ok).length;

    debug.log('MANY_EXPIRED', `${successful}/10 booking attempts succeeded with 200+ expired reservations present`);

    if (successful < 10) {
      debug.error('MANY_EXPIRED', 'Some bookings failed despite expired reservations not blocking capacity');
      return { success: false };
    }

    debug.success('MANY_EXPIRED', 'System functions correctly even with 200+ expired reservations');
    return { success: true };
  } catch (error) {
    debug.error('MANY_EXPIRED', 'Test failed', error);
    return { success: false };
  }
}

async function testCapacityQueryPerformance() {
  debug.log('CAPACITY_PERF', 'Testing capacity query performance with expired reservations...');

  try {
    // Create 500 expired reservations
    await createExpiredReservations(500);

    const slotStart = new Date();
    slotStart.setDate(slotStart.getDate() + 7);
    slotStart.setHours(16, 0, 0, 0);

    // Measure capacity check performance
    const startTime = Date.now();

    const response = await fetch(
      `${TEST_CONFIG.BASE_URL}/api/booking/capacity?` +
        new URLSearchParams({
          businessId: testBusinessId,
          serviceId: testServiceId,
          slotStart: slotStart.toISOString(),
          slotEnd: new Date(slotStart.getTime() + 60 * 60 * 1000).toISOString(),
        }),
      { method: 'GET', headers: { 'Content-Type': 'application/json' } }
    );

    const duration = Date.now() - startTime;
    const data = await response.json();

    debug.log('CAPACITY_PERF', `Capacity check completed in ${duration}ms with 500 expired reservations`);

    if (!response.ok) {
      debug.error('CAPACITY_PERF', 'Capacity check failed', data);
      return { success: false };
    }

    // Performance threshold: should complete in under 1 second
    if (duration > 1000) {
      debug.error('CAPACITY_PERF', `Capacity check too slow: ${duration}ms (threshold: 1000ms)`);
      return { success: false };
    }

    debug.success('CAPACITY_PERF', `Capacity query performed well: ${duration}ms`);
    return { success: true };
  } catch (error) {
    debug.error('CAPACITY_PERF', 'Test failed', error);
    return { success: false };
  }
}

async function runCleanupResilienceTests() {
  console.log('\n========================================');
  console.log('CLEANUP RESILIENCE TESTS');
  console.log('========================================\n');

  const setupSuccess = await setupTestData();
  if (!setupSuccess) {
    console.error('Failed to setup test data. Aborting tests.');
    return false;
  }

  const results = [];

  // Test 1: Expired reservations don't block capacity
  const test1 = await testExpiredReservationsDontBlockCapacity();
  results.push({ name: 'Expired Reservations Don\'t Block Capacity', passed: test1.success });

  // Clean expired reservations before next test
  await sql`DELETE FROM reservations WHERE business_id = ${testBusinessId}`;

  // Test 2: Cleanup job removes expired reservations
  const test2 = await testCleanupJobFunctionality();
  results.push({ name: 'Cleanup Job Removes Expired Reservations', passed: test2.success });

  // Test 3: System functions with many expired reservations
  const test3 = await testSystemFunctionsWithManyExpiredReservations();
  results.push({ name: 'System Functions with 200+ Expired Reservations', passed: test3.success });

  // Test 4: Capacity query performance
  const test4 = await testCapacityQueryPerformance();
  results.push({ name: 'Capacity Query Performance (<1s with 500 expired)', passed: test4.success });

  // Cleanup
  debug.log('CLEANUP', 'Cleaning up cleanup test data...');
  await cleanupTestData(sql, testBusinessId);

  console.log('\n========================================');
  console.log('CLEANUP RESILIENCE TEST RESULTS');
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
runCleanupResilienceTests()
  .then(success => {
    process.exit(success ? 0 : 1);
  })
  .catch(error => {
    debug.error('TEST_RUNNER', 'Fatal error running cleanup resilience tests', error);
    process.exit(1);
  });
