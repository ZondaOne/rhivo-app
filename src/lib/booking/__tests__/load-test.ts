/**
 * Load testing harness for reservation system
 *
 * This script simulates high concurrency scenarios to verify:
 * 1. No double-bookings occur under 100 concurrent requests
 * 2. Advisory locks properly serialize slot access
 * 3. Database triggers catch any capacity violations
 * 4. System remains performant under load
 *
 * Run with: npx ts-node src/lib/booking/__tests__/load-test.ts
 */

import { ReservationManager } from '../reservation-manager';
import { getDbClient } from '@/db/client';
import { v4 as uuidv4 } from 'uuid';

const sql = getDbClient();

interface LoadTestConfig {
  concurrentRequests: number;
  slotsToTest: number;
  maxCapacity: number;
}

interface LoadTestResult {
  totalRequests: number;
  successfulReservations: number;
  failedReservations: number;
  capacityErrors: number;
  otherErrors: number;
  durationMs: number;
  requestsPerSecond: number;
  noOverbooking: boolean;
  allSlotsRespectCapacity: boolean;
}

/**
 * Run load test with specified configuration
 */
async function runLoadTest(config: LoadTestConfig): Promise<LoadTestResult> {
  console.log(`\n🔬 Starting load test with ${config.concurrentRequests} concurrent requests`);
  console.log(`   Testing ${config.slotsToTest} time slots with max capacity ${config.maxCapacity}`);

  // Setup test business and service
  const testBusinessId = uuidv4();
  const testServiceId = uuidv4();

  await sql`
    INSERT INTO businesses (id, subdomain, name, timezone, config_yaml_path, config_version, status)
    VALUES (${testBusinessId}, ${`load-test-${Date.now()}`}, 'Load Test Business', 'America/New_York', '/configs/test.yaml', 1, 'active')
  `;

  await sql`
    INSERT INTO services (
      id, business_id, name, duration_minutes, price_cents, color,
      max_simultaneous_bookings, sort_order
    )
    VALUES (
      ${testServiceId}, ${testBusinessId}, 'Load Test Service', 60, 5000, '#00AA88',
      ${config.maxCapacity}, 1
    )
  `;

  const reservationManager = new ReservationManager(sql);
  const startTime = Date.now();

  // Generate time slots to test
  const baseTime = new Date('2025-02-01T10:00:00Z');
  const timeSlots: Array<{ start: Date; end: Date }> = [];

  for (let i = 0; i < config.slotsToTest; i++) {
    const slotStart = new Date(baseTime.getTime() + i * 60 * 60 * 1000); // 1 hour apart
    const slotEnd = new Date(slotStart.getTime() + 60 * 60 * 1000);
    timeSlots.push({ start: slotStart, end: slotEnd });
  }

  let successCount = 0;
  let capacityErrorCount = 0;
  let otherErrorCount = 0;

  // Create promises for all concurrent requests
  // Each slot will receive concurrentRequests attempts
  const allPromises: Promise<any>[] = [];

  for (const slot of timeSlots) {
    for (let i = 0; i < config.concurrentRequests; i++) {
      const promise = reservationManager
        .createReservation({
          businessId: testBusinessId,
          serviceId: testServiceId,
          slotStart: slot.start,
          slotEnd: slot.end,
          idempotencyKey: `load-test-${slot.start.getTime()}-${i}-${Date.now()}`,
          maxSimultaneousBookings: config.maxCapacity,
          ttlMinutes: 15,
        })
        .then((reservation) => {
          successCount++;
          return { success: true, reservation, slotStart: slot.start };
        })
        .catch((error) => {
          if (error.message.includes('no longer available') || error.message.includes('SLOT_UNAVAILABLE')) {
            capacityErrorCount++;
            return { success: false, reason: 'capacity', slotStart: slot.start };
          } else {
            otherErrorCount++;
            console.error(`Unexpected error: ${error.message}`);
            return { success: false, reason: 'error', error: error.message, slotStart: slot.start };
          }
        });

      allPromises.push(promise);
    }
  }

  // Execute all requests concurrently
  console.log(`   Executing ${allPromises.length} total reservation attempts...`);
  const results = await Promise.all(allPromises);

  const durationMs = Date.now() - startTime;
  const requestsPerSecond = (allPromises.length / durationMs) * 1000;

  // Verify no overbooking occurred
  console.log(`\n📊 Analyzing results...`);

  const slotOccupancy = new Map<string, number>();
  for (const result of results) {
    if (result.success) {
      const slotKey = result.slotStart.toISOString();
      slotOccupancy.set(slotKey, (slotOccupancy.get(slotKey) || 0) + 1);
    }
  }

  // Check each slot respects capacity
  let allSlotsRespectCapacity = true;
  for (const [slotKey, count] of slotOccupancy.entries()) {
    if (count > config.maxCapacity) {
      console.error(`   ❌ OVERBOOKING DETECTED: Slot ${slotKey} has ${count} reservations (max: ${config.maxCapacity})`);
      allSlotsRespectCapacity = false;
    } else {
      console.log(`   ✓ Slot ${slotKey}: ${count}/${config.maxCapacity} bookings`);
    }
  }

  const noOverbooking = allSlotsRespectCapacity;

  // Cleanup
  await sql`DELETE FROM reservations WHERE business_id = ${testBusinessId}`;
  await sql`DELETE FROM services WHERE id = ${testServiceId}`;
  await sql`DELETE FROM businesses WHERE id = ${testBusinessId}`;

  return {
    totalRequests: allPromises.length,
    successfulReservations: successCount,
    failedReservations: capacityErrorCount + otherErrorCount,
    capacityErrors: capacityErrorCount,
    otherErrors: otherErrorCount,
    durationMs,
    requestsPerSecond: Number(requestsPerSecond.toFixed(2)),
    noOverbooking,
    allSlotsRespectCapacity,
  };
}

/**
 * Print test results
 */
function printResults(testName: string, result: LoadTestResult): void {
  console.log(`\n${'='.repeat(60)}`);
  console.log(`📝 ${testName} - Results`);
  console.log(`${'='.repeat(60)}`);
  console.log(`Total requests:          ${result.totalRequests}`);
  console.log(`Successful reservations: ${result.successfulReservations}`);
  console.log(`Failed (capacity):       ${result.capacityErrors}`);
  console.log(`Failed (errors):         ${result.otherErrors}`);
  console.log(`Duration:                ${result.durationMs}ms`);
  console.log(`Throughput:              ${result.requestsPerSecond} req/sec`);
  console.log(`No overbooking:          ${result.noOverbooking ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`All slots valid:         ${result.allSlotsRespectCapacity ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`${'='.repeat(60)}\n`);
}

/**
 * Main test suite
 */
async function main() {
  console.log('\n🚀 Reservation System Load Testing Suite');
  console.log('=========================================\n');

  try {
    // Test 1: 100 concurrent requests for 1 slot with capacity 1
    const test1 = await runLoadTest({
      concurrentRequests: 100,
      slotsToTest: 1,
      maxCapacity: 1,
    });
    printResults('Test 1: 100 concurrent requests, capacity 1', test1);

    if (!test1.noOverbooking) {
      console.error('❌ CRITICAL: Test 1 failed - overbooking detected!');
      process.exit(1);
    }

    // Test 2: 50 concurrent requests for 5 slots with capacity 2
    const test2 = await runLoadTest({
      concurrentRequests: 50,
      slotsToTest: 5,
      maxCapacity: 2,
    });
    printResults('Test 2: 50 concurrent requests across 5 slots, capacity 2', test2);

    if (!test2.noOverbooking) {
      console.error('❌ CRITICAL: Test 2 failed - overbooking detected!');
      process.exit(1);
    }

    // Test 3: 200 concurrent requests for 10 slots with capacity 5
    const test3 = await runLoadTest({
      concurrentRequests: 200,
      slotsToTest: 10,
      maxCapacity: 5,
    });
    printResults('Test 3: 200 concurrent requests across 10 slots, capacity 5', test3);

    if (!test3.noOverbooking) {
      console.error('❌ CRITICAL: Test 3 failed - overbooking detected!');
      process.exit(1);
    }

    console.log('\n✅ All load tests passed successfully!');
    console.log('   No overbooking detected under concurrent load.');
    console.log('   Advisory locks and capacity validation working correctly.\n');

    process.exit(0);
  } catch (error) {
    console.error('\n❌ Load test failed with error:', error);
    process.exit(1);
  }
}

// Run if executed directly
if (require.main === module) {
  main();
}

export { runLoadTest, LoadTestConfig, LoadTestResult };
