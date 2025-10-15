import { sql, debug, cleanupTestData, clearRateLimits, TEST_CONFIG } from './setup';
import { nanoid } from 'nanoid';
import { v4 as uuidv4 } from 'uuid';

/**
 * Load Testing Script for Booking System
 *
 * Simulates realistic booking patterns with concurrent users to validate:
 * - No double-bookings under high concurrency
 * - Capacity constraints are enforced correctly
 * - System handles burst traffic gracefully
 * - All bookings are properly logged
 *
 * Scenarios:
 * 1. 100 users booking across 50 time slots over 1 hour (distributed load)
 * 2. 50 users attempting same time slot simultaneously (burst load)
 * 3. Mixed capacity services under concurrent load
 * 4. Stress test with 200+ concurrent reservation attempts
 */

const testId = nanoid(8);
let testBusinessId: string;
let testServiceId: string;
let testService2Id: string; // capacity=3
let testService3Id: string; // capacity=5

interface LoadTestResult {
  totalAttempts: number;
  successful: number;
  failed: number;
  duration: number;
  capacityViolations: number;
  errors: string[];
}

async function setupLoadTestData() {
  debug.log('SETUP', 'Creating load test business and services...');

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
        'Load Test Business',
        'America/New_York',
        'config/tenants/test-generic.yaml',
        1,
        'active'
      )
    `;

    // Create category
    const category = await sql`
      INSERT INTO categories (business_id, name, sort_order)
      VALUES (${testBusinessId}, 'Load Test Services', 0)
      RETURNING id
    `;

    const categoryId = category[0].id;

    // Service 1: capacity=2 (matches YAML)
    const service1 = await sql`
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
        ${categoryId},
        'Test Service (Capacity 2)',
        'test-service-cap2',
        60,
        5000,
        '#3b82f6',
        2,
        0
      )
      RETURNING id
    `;
    testServiceId = service1[0].id;

    // Service 2: capacity=3 (matches YAML)
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
        ${categoryId},
        'Test Service (Capacity 3)',
        'test-service-cap3',
        45,
        7500,
        '#f59e0b',
        3,
        1
      )
      RETURNING id
    `;
    testService2Id = service2[0].id;

    // Service 3: capacity=5 (matches YAML)
    const service3 = await sql`
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
        ${categoryId},
        'Test Service (Capacity 5)',
        'test-service-cap5',
        60,
        10000,
        '#ef4444',
        5,
        2
      )
      RETURNING id
    `;
    testService3Id = service3[0].id;

    // Create availability (Mon-Fri 9AM-5PM)
    const daysOfWeek = [1, 2, 3, 4, 5];
    for (const day of daysOfWeek) {
      await sql`
        INSERT INTO availability (
          business_id,
          day_of_week,
          start_time,
          end_time
        )
        VALUES (
          ${testBusinessId},
          ${day},
          '09:00',
          '17:00'
        )
      `;
    }

    debug.success('SETUP', 'Load test data created', {
      businessId: testBusinessId,
      service1Id: testServiceId,
      service2Id: testService2Id,
      service3Id: testService3Id,
    });

    return true;
  } catch (error) {
    debug.error('SETUP', 'Failed to create load test data', error);
    return false;
  }
}

async function performConcurrentBookings(
  serviceId: string,
  timeSlot: Date,
  attemptCount: number,
  label: string
): Promise<LoadTestResult> {
  const startTime = Date.now();
  const errors: string[] = [];

  debug.log(label, `Starting ${attemptCount} concurrent booking attempts...`);

  // Create concurrent reservation attempts
  const promises = Array.from({ length: attemptCount }, (_, i) =>
    fetch(`${TEST_CONFIG.BASE_URL}/api/booking/reserve`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        businessId: testBusinessId,
        serviceId,
        startTime: timeSlot.toISOString(),
        idempotencyKey: `${label}-${testId}-${i}-${Date.now()}`,
      }),
    })
      .then(async res => ({
        ok: res.ok,
        status: res.status,
        data: await res.json(),
      }))
      .catch(err => ({
        ok: false,
        status: 0,
        data: { error: err.message },
      }))
  );

  const results = await Promise.all(promises);
  const duration = Date.now() - startTime;

  const successful = results.filter(r => r.ok).length;
  const failed = results.filter(r => !r.ok).length;

  // Check database for capacity violations
  const dbCount = await sql`
    SELECT COUNT(*) as count
    FROM reservations
    WHERE business_id = ${testBusinessId}
      AND service_id = ${serviceId}
      AND slot_start = ${timeSlot}
      AND expires_at > NOW()
  `;

  const reservationCount = parseInt(dbCount[0].count, 10);

  // Get service capacity
  const service = await sql`
    SELECT max_simultaneous_bookings FROM services WHERE id = ${serviceId}
  `;
  const capacity = service[0].max_simultaneous_bookings;

  const capacityViolations = reservationCount > capacity ? reservationCount - capacity : 0;

  // Collect error messages
  results
    .filter(r => !r.ok)
    .slice(0, 5) // Only collect first 5 errors
    .forEach(r => {
      if (r.data && r.data.error) {
        errors.push(r.data.error);
      }
    });

  return {
    totalAttempts: attemptCount,
    successful,
    failed,
    duration,
    capacityViolations,
    errors,
  };
}

async function testDistributedLoad() {
  debug.log('LOAD_DISTRIBUTED', 'Testing distributed load: 100 users across 50 time slots...');

  try {
    const baseDate = new Date();
    baseDate.setDate(baseDate.getDate() + 7);
    baseDate.setHours(9, 0, 0, 0);

    // Generate 50 time slots (every 30 minutes from 9am to 5pm over multiple days)
    const timeSlots: Date[] = [];
    for (let day = 0; day < 7; day++) {
      for (let hour = 9; hour < 17; hour++) {
        for (let minute = 0; minute < 60; minute += 30) {
          const slot = new Date(baseDate);
          slot.setDate(baseDate.getDate() + day);
          slot.setHours(hour, minute, 0, 0);
          timeSlots.push(slot);
          if (timeSlots.length >= 50) break;
        }
        if (timeSlots.length >= 50) break;
      }
      if (timeSlots.length >= 50) break;
    }

    debug.log('LOAD_DISTRIBUTED', `Generated ${timeSlots.length} time slots`);

    // Distribute 100 bookings randomly across slots
    const startTime = Date.now();
    const promises = Array.from({ length: 100 }, (_, i) => {
      const randomSlot = timeSlots[Math.floor(Math.random() * timeSlots.length)];
      const randomService = [testServiceId, testService2Id, testService3Id][Math.floor(Math.random() * 3)];

      return fetch(`${TEST_CONFIG.BASE_URL}/api/booking/reserve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          businessId: testBusinessId,
          serviceId: randomService,
          startTime: randomSlot.toISOString(),
          idempotencyKey: `distributed-${testId}-${i}`,
        }),
      })
        .then(async res => ({
          ok: res.ok,
          serviceId: randomService,
          slot: randomSlot.toISOString(),
        }))
        .catch(() => ({ ok: false, serviceId: randomService, slot: randomSlot.toISOString() }));
    });

    const results = await Promise.all(promises);
    const duration = Date.now() - startTime;

    const successful = results.filter(r => r.ok).length;

    // Check for capacity violations in database
    const violations = await sql`
      WITH slot_counts AS (
        SELECT
          service_id,
          slot_start,
          COUNT(*) as reservation_count
        FROM reservations
        WHERE business_id = ${testBusinessId}
          AND expires_at > NOW()
        GROUP BY service_id, slot_start
      )
      SELECT
        sc.service_id,
        sc.slot_start,
        sc.reservation_count,
        s.max_simultaneous_bookings as capacity
      FROM slot_counts sc
      JOIN services s ON s.id = sc.service_id
      WHERE sc.reservation_count > s.max_simultaneous_bookings
    `;

    if (violations.length > 0) {
      debug.error('LOAD_DISTRIBUTED', `Found ${violations.length} capacity violations!`, violations);
      return { success: false };
    }

    debug.success('LOAD_DISTRIBUTED', `Distributed load test completed`, {
      totalAttempts: 100,
      successful,
      failed: 100 - successful,
      duration: `${duration}ms`,
      capacityViolations: 0,
    });

    return { success: true };
  } catch (error) {
    debug.error('LOAD_DISTRIBUTED', 'Test failed', error);
    return { success: false };
  }
}

async function testBurstLoad() {
  debug.log('LOAD_BURST', 'Testing burst load: 50 users attempting same time slot...');

  try {
    const slotTime = new Date();
    slotTime.setDate(slotTime.getDate() + 8);
    slotTime.setHours(10, 0, 0, 0);

    const result = await performConcurrentBookings(testServiceId, slotTime, 50, 'BURST');

    debug.log('LOAD_BURST', 'Burst load results', {
      successful: result.successful,
      failed: result.failed,
      duration: `${result.duration}ms`,
      capacityViolations: result.capacityViolations,
    });

    // With capacity=2, should allow exactly 2 bookings
    if (result.capacityViolations > 0) {
      debug.error('LOAD_BURST', 'Capacity violations detected!');
      return { success: false };
    }

    if (result.successful !== 2) {
      debug.error('LOAD_BURST', `Expected 2 successful bookings, got ${result.successful}`);
      return { success: false };
    }

    debug.success('LOAD_BURST', 'Burst load handled correctly');
    return { success: true };
  } catch (error) {
    debug.error('LOAD_BURST', 'Test failed', error);
    return { success: false };
  }
}

async function testMixedCapacityLoad() {
  debug.log('LOAD_MIXED_CAPACITY', 'Testing mixed capacity services under concurrent load...');

  try {
    const slotTime = new Date();
    slotTime.setDate(slotTime.getDate() + 8);
    slotTime.setHours(14, 0, 0, 0);

    // Test all three services simultaneously
    const [result1, result2, result3] = await Promise.all([
      performConcurrentBookings(testServiceId, slotTime, 30, 'MIXED_CAP2'),
      performConcurrentBookings(testService2Id, slotTime, 30, 'MIXED_CAP3'),
      performConcurrentBookings(testService3Id, slotTime, 30, 'MIXED_CAP5'),
    ]);

    debug.log('LOAD_MIXED_CAPACITY', 'Mixed capacity results', {
      service1: { successful: result1.successful, expected: 2, violations: result1.capacityViolations },
      service2: { successful: result2.successful, expected: 3, violations: result2.capacityViolations },
      service3: { successful: result3.successful, expected: 5, violations: result3.capacityViolations },
    });

    // Verify each service respects its capacity
    if (result1.capacityViolations > 0 || result1.successful !== 2) {
      debug.error('LOAD_MIXED_CAPACITY', `Service 1 (cap=2) failed: ${result1.successful} bookings, ${result1.capacityViolations} violations`);
      return { success: false };
    }

    if (result2.capacityViolations > 0 || result2.successful !== 3) {
      debug.error('LOAD_MIXED_CAPACITY', `Service 2 (cap=3) failed: ${result2.successful} bookings, ${result2.capacityViolations} violations`);
      return { success: false };
    }

    if (result3.capacityViolations > 0 || result3.successful !== 5) {
      debug.error('LOAD_MIXED_CAPACITY', `Service 3 (cap=5) failed: ${result3.successful} bookings, ${result3.capacityViolations} violations`);
      return { success: false };
    }

    debug.success('LOAD_MIXED_CAPACITY', 'Mixed capacity services handled correctly under concurrent load');
    return { success: true };
  } catch (error) {
    debug.error('LOAD_MIXED_CAPACITY', 'Test failed', error);
    return { success: false };
  }
}

async function testStressLoad() {
  debug.log('LOAD_STRESS', 'Testing stress load: 200 concurrent attempts for capacity=5 service...');

  try {
    const slotTime = new Date();
    slotTime.setDate(slotTime.getDate() + 9);
    slotTime.setHours(11, 0, 0, 0);

    const result = await performConcurrentBookings(testService3Id, slotTime, 200, 'STRESS');

    debug.log('LOAD_STRESS', 'Stress load results', {
      totalAttempts: result.totalAttempts,
      successful: result.successful,
      failed: result.failed,
      duration: `${result.duration}ms`,
      avgResponseTime: `${Math.round(result.duration / result.totalAttempts)}ms`,
      capacityViolations: result.capacityViolations,
    });

    // With capacity=5, should allow exactly 5 bookings
    if (result.capacityViolations > 0) {
      debug.error('LOAD_STRESS', `Found ${result.capacityViolations} capacity violations!`);
      return { success: false };
    }

    if (result.successful !== 5) {
      debug.error('LOAD_STRESS', `Expected 5 successful bookings, got ${result.successful}`);
      return { success: false };
    }

    debug.success('LOAD_STRESS', `Stress test passed: ${result.successful}/200 succeeded, 0 violations, ${result.duration}ms total`);
    return { success: true };
  } catch (error) {
    debug.error('LOAD_STRESS', 'Test failed', error);
    return { success: false };
  }
}

async function runLoadTests() {
  console.log('\n========================================');
  console.log('LOAD TESTING SUITE');
  console.log('========================================\n');
  console.log('Testing booking system under realistic and extreme load conditions');
  console.log('Validating: no double-bookings, capacity enforcement, performance\n');

  // Clear rate limits
  await clearRateLimits(sql);

  const setupSuccess = await setupLoadTestData();
  if (!setupSuccess) {
    console.error('Failed to setup load test data. Aborting tests.');
    return false;
  }

  const results = [];

  // Test 1: Distributed load (realistic scenario)
  const test1 = await testDistributedLoad();
  results.push({ name: 'Distributed Load (100 users, 50 slots)', passed: test1.success });

  // Wait and cleanup between tests
  await new Promise(resolve => setTimeout(resolve, 2000));
  await sql`DELETE FROM reservations WHERE business_id = ${testBusinessId}`;

  // Test 2: Burst load
  const test2 = await testBurstLoad();
  results.push({ name: 'Burst Load (50 concurrent, same slot)', passed: test2.success });

  await new Promise(resolve => setTimeout(resolve, 2000));
  await sql`DELETE FROM reservations WHERE business_id = ${testBusinessId}`;

  // Test 3: Mixed capacity services
  const test3 = await testMixedCapacityLoad();
  results.push({ name: 'Mixed Capacity Services (concurrent load)', passed: test3.success });

  await new Promise(resolve => setTimeout(resolve, 2000));
  await sql`DELETE FROM reservations WHERE business_id = ${testBusinessId}`;

  // Test 4: Stress test
  const test4 = await testStressLoad();
  results.push({ name: 'Stress Test (200 concurrent attempts)', passed: test4.success });

  // Cleanup
  debug.log('CLEANUP', 'Cleaning up load test data...');
  await cleanupTestData(sql, testBusinessId);

  console.log('\n========================================');
  console.log('LOAD TEST RESULTS');
  console.log('========================================\n');

  results.forEach(result => {
    const status = result.passed ? '✓ PASS' : '✗ FAIL';
    console.log(`${status}: ${result.name}`);
  });

  const allPassed = results.every(r => r.passed);
  console.log(`\nTotal: ${results.filter(r => r.passed).length}/${results.length} passed\n`);

  if (allPassed) {
    console.log('🎉 All load tests passed! System handles concurrent load without double-bookings.\n');
  } else {
    console.log('❌ Some load tests failed. Review output above for details.\n');
  }

  return allPassed;
}

// Execute tests
runLoadTests()
  .then(success => {
    process.exit(success ? 0 : 1);
  })
  .catch(error => {
    debug.error('TEST_RUNNER', 'Fatal error running load tests', error);
    process.exit(1);
  });
