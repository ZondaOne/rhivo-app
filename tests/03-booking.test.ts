import { sql, debug, cleanupTestData, clearRateLimits, TEST_CONFIG } from './setup';
import { nanoid } from 'nanoid';

/**
 * Booking Transaction Tests
 *
 * Tests the complete booking flow:
 * - Reserve a time slot
 * - Check capacity
 * - Commit reservation to appointment
 * - Test concurrent bookings
 * - Test reservation expiration
 */

const testId = nanoid(8);
const testEmail = `test-booking-${testId}@test.com`;
const testBusinessName = `Test Booking Business`;
const testSubdomain = `test-generic`; // Use test YAML config

let testUserId: string;
let testBusinessId: string;
let testServiceId: string;
let testAccessToken: string;

async function setupTestData() {
  debug.log('SETUP', 'Creating test owner, business, and service...');

  try {
    // Create owner and business
    const signupResponse = await fetch(`${TEST_CONFIG.BASE_URL}/api/auth/signup/owner`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: testEmail,
        password: 'TestPassword123!',
        name: 'Test Booking Owner',
        businessName: testBusinessName,
        subdomain: testSubdomain,
        businessPhone: '+1234567890',
        timezone: 'America/New_York',
      }),
    });

    const signupData = await signupResponse.json();

    if (!signupResponse.ok) {
      debug.error('SETUP', 'Failed to create owner and business', signupData);
      return false;
    }

    testAccessToken = signupData.accessToken;

    // Get user and business IDs from response
    const userId = signupData.user?.id;
    const businessId = signupData.business?.id;

    if (!userId || !businessId) {
      debug.error('SETUP', 'Missing user or business ID in signup response', signupData);
      return false;
    }

    testUserId = userId;
    testBusinessId = businessId;

    // Update business to use test YAML config
    await sql`
      UPDATE businesses
      SET
        subdomain = ${testSubdomain},
        config_yaml_path = 'config/tenants/test-generic.yaml'
      WHERE id = ${testBusinessId}
    `;

    // Create category
    const category = await sql`
      INSERT INTO categories (business_id, name, sort_order)
      VALUES (${testBusinessId}, 'Test Services', 0)
      RETURNING id
    `;

    const categoryId = category[0].id;

    // Create service matching test YAML config
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

    testServiceId = service[0].id;

    // Create business availability (Mon-Fri 9AM-5PM)
    const daysOfWeek = [1, 2, 3, 4, 5]; // Monday to Friday
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

    debug.success('SETUP', 'Test data created', {
      userId: testUserId,
      businessId: testBusinessId,
      serviceId: testServiceId,
    });

    return true;
  } catch (error) {
    debug.error('SETUP', 'Failed to create test data', error);
    return false;
  }
}

async function testCapacityCheck() {
  debug.log('BOOKING_CAPACITY', 'Testing capacity check...');

  try {
    // Get tomorrow's date at 10 AM
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(10, 0, 0, 0);

    const endTime = new Date(tomorrow.getTime() + 30 * 60 * 1000);

    const response = await fetch(
      `${TEST_CONFIG.BASE_URL}/api/booking/capacity?` +
        new URLSearchParams({
          businessId: testBusinessId,
          serviceId: testServiceId,
          slotStart: tomorrow.toISOString(),
          slotEnd: endTime.toISOString(),
        }),
      {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      }
    );

    const data = await response.json();
    debug.log('BOOKING_CAPACITY', `Response status: ${response.status}`, data);

    if (!response.ok) {
      debug.error('BOOKING_CAPACITY', 'Capacity check failed', data);
      return { success: false, data: null };
    }

    debug.success('BOOKING_CAPACITY', 'Capacity check successful', data);
    return { success: true, data };
  } catch (error) {
    debug.error('BOOKING_CAPACITY', 'Capacity check test failed', error);
    return { success: false, data: null };
  }
}

async function testReservation() {
  debug.log('BOOKING_RESERVE', 'Testing slot reservation...');

  try {
    // Get tomorrow's date at 10 AM
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(10, 0, 0, 0);

    const idempotencyKey = nanoid();

    const response = await fetch(`${TEST_CONFIG.BASE_URL}/api/booking/reserve`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        businessId: testBusinessId,
        serviceId: testServiceId,
        startTime: tomorrow.toISOString(),
        idempotencyKey,
      }),
    });

    const data = await response.json();
    debug.log('BOOKING_RESERVE', `Response status: ${response.status}`, data);

    if (!response.ok) {
      debug.error('BOOKING_RESERVE', 'Reservation failed', data);
      return { success: false, data: null };
    }

    // Verify reservation in database
    const reservation = await sql`
      SELECT * FROM reservations
      WHERE id = ${data.reservationId || data.reservationToken}
    `;

    debug.log('BOOKING_RESERVE', 'Reservation in database', reservation[0]);

    if (!reservation || reservation.length === 0) {
      debug.error('BOOKING_RESERVE', 'Reservation not found in database');
      return { success: false, data: null };
    }

    debug.success('BOOKING_RESERVE', 'Reservation successful', {
      reservationToken: data.reservationToken,
      expiresAt: reservation[0].expires_at,
    });

    return { success: true, data: { ...data, reservation: reservation[0] } };
  } catch (error) {
    debug.error('BOOKING_RESERVE', 'Reservation test failed', error);
    return { success: false, data: null };
  }
}

async function testCommitReservation(reservationToken: string) {
  debug.log('BOOKING_COMMIT', 'Testing reservation commit...');

  try {
    const response = await fetch(`${TEST_CONFIG.BASE_URL}/api/booking/commit`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        reservationId: reservationToken,
        guestEmail: `customer-${testId}@test.com`,
        guestPhone: '+1234567891',
      }),
    });

    const data = await response.json();
    debug.log('BOOKING_COMMIT', `Response status: ${response.status}`, data);

    if (!response.ok) {
      debug.error('BOOKING_COMMIT', 'Commit failed', data);
      return { success: false, data: null };
    }

    // Verify appointment in database
    const appointmentId = data.appointmentId || data.appointment?.id;
    const appointment = await sql`
      SELECT * FROM appointments
      WHERE id = ${appointmentId}
    `;

    debug.log('BOOKING_COMMIT', 'Appointment in database', appointment[0]);

    if (!appointment || appointment.length === 0) {
      debug.error('BOOKING_COMMIT', 'Appointment not found in database');
      return { success: false, data: null };
    }

    // Verify reservation was consumed or deleted
    const reservation = await sql`
      SELECT * FROM reservations
      WHERE id = ${reservationToken}
    `;

    debug.log('BOOKING_COMMIT', 'Reservation status after commit', reservation);

    debug.success('BOOKING_COMMIT', 'Commit successful', {
      appointmentId,
      status: appointment[0].status,
    });

    return { success: true, data: { ...data, appointment: appointment[0] } };
  } catch (error) {
    debug.error('BOOKING_COMMIT', 'Commit test failed', error);
    return { success: false, data: null };
  }
}

async function testIdempotency() {
  debug.log('BOOKING_IDEMPOTENCY', 'Testing idempotency...');

  try {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(11, 0, 0, 0);

    const idempotencyKey = nanoid();

    // First request
    const response1 = await fetch(`${TEST_CONFIG.BASE_URL}/api/booking/reserve`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        businessId: testBusinessId,
        serviceId: testServiceId,
        startTime: tomorrow.toISOString(),
        idempotencyKey,
      }),
    });

    const data1 = await response1.json();
    debug.log('BOOKING_IDEMPOTENCY', 'First request response', data1);

    // Second request with same idempotency key
    const response2 = await fetch(`${TEST_CONFIG.BASE_URL}/api/booking/reserve`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        businessId: testBusinessId,
        serviceId: testServiceId,
        startTime: tomorrow.toISOString(),
        idempotencyKey, // Same key
      }),
    });

    const data2 = await response2.json();
    debug.log('BOOKING_IDEMPOTENCY', 'Second request response', data2);

    if (!response1.ok || !response2.ok) {
      debug.error('BOOKING_IDEMPOTENCY', 'One or both requests failed');
      return { success: false };
    }

    // Check if tokens match (idempotent behavior)
    if (data1.reservationToken !== data2.reservationToken) {
      debug.error('BOOKING_IDEMPOTENCY', 'Tokens do not match - not idempotent');
      return { success: false };
    }

    debug.success('BOOKING_IDEMPOTENCY', 'Idempotency verified');
    return { success: true };
  } catch (error) {
    debug.error('BOOKING_IDEMPOTENCY', 'Idempotency test failed', error);
    return { success: false };
  }
}

async function testExpiredReservation() {
  debug.log('BOOKING_EXPIRED', 'Testing expired reservation rejection...');

  try {
    // Create a reservation
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(14, 0, 0, 0);

    const idempotencyKey = nanoid();

    const reserveResponse = await fetch(`${TEST_CONFIG.BASE_URL}/api/booking/reserve`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        businessId: testBusinessId,
        serviceId: testServiceId,
        startTime: tomorrow.toISOString(),
        idempotencyKey,
      }),
    });

    const reserveData = await reserveResponse.json();

    if (!reserveResponse.ok) {
      debug.error('BOOKING_EXPIRED', 'Failed to create reservation', reserveData);
      return { success: false };
    }

    // Manually expire the reservation in database
    await sql`
      UPDATE reservations
      SET expires_at = NOW() - INTERVAL '1 minute'
      WHERE id = ${reserveData.reservationId || reserveData.reservationToken}
    `;

    debug.log('BOOKING_EXPIRED', 'Manually expired reservation');

    // Try to commit expired reservation
    const commitResponse = await fetch(`${TEST_CONFIG.BASE_URL}/api/booking/commit`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        reservationId: reserveData.reservationToken,
        guestEmail: `customer-expired-${testId}@test.com`,
        guestPhone: '+1234567892',
      }),
    });

    const commitData = await commitResponse.json();
    debug.log('BOOKING_EXPIRED', `Commit response status: ${commitResponse.status}`, commitData);

    if (commitResponse.ok) {
      debug.error('BOOKING_EXPIRED', 'Expired reservation should have been rejected');
      return { success: false };
    }

    debug.success('BOOKING_EXPIRED', 'Expired reservation correctly rejected');
    return { success: true };
  } catch (error) {
    debug.error('BOOKING_EXPIRED', 'Expired reservation test failed', error);
    return { success: false };
  }
}

async function testConcurrentBookings() {
  debug.log('BOOKING_CONCURRENT', 'Testing concurrent bookings...');

  try {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(15, 0, 0, 0);

    // Create 3 concurrent reservation attempts for the same slot
    const promises = Array.from({ length: 3 }, (_, i) =>
      fetch(`${TEST_CONFIG.BASE_URL}/api/booking/reserve`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          businessId: testBusinessId,
          serviceId: testServiceId,
          startTime: tomorrow.toISOString(),
          idempotencyKey: nanoid(),
        }),
      })
    );

    const responses = await Promise.all(promises);
    const data = await Promise.all(responses.map(r => r.json()));

    debug.log('BOOKING_CONCURRENT', 'Concurrent responses', {
      statuses: responses.map(r => r.status),
      data,
    });

    const successCount = responses.filter(r => r.ok).length;

    debug.log('BOOKING_CONCURRENT', `${successCount} out of 3 reservations succeeded`);

    // At least one should succeed (capacity permitting)
    if (successCount === 0) {
      debug.error('BOOKING_CONCURRENT', 'All concurrent reservations failed');
      return { success: false };
    }

    debug.success('BOOKING_CONCURRENT', 'Concurrent booking handling verified');
    return { success: true };
  } catch (error) {
    debug.error('BOOKING_CONCURRENT', 'Concurrent booking test failed', error);
    return { success: false };
  }
}

// Run all booking tests
async function runBookingTests() {
  console.log('\n========================================');
  console.log('BOOKING TRANSACTION TESTS');
  console.log('========================================\n');

  // Clear rate limits before starting
  await clearRateLimits(sql);

  // Setup test data
  const setupSuccess = await setupTestData();
  if (!setupSuccess) {
    console.error('Failed to setup test data. Aborting tests.');
    return false;
  }

  const results = [];

  // Test capacity check
  const capacityResult = await testCapacityCheck();
  results.push({ name: 'Capacity Check', passed: capacityResult.success });

  // Test reservation
  const reservationResult = await testReservation();
  results.push({ name: 'Reservation', passed: reservationResult.success });

  // Test commit (only if reservation succeeded)
  if (reservationResult.success && reservationResult.data?.reservationToken) {
    const commitResult = await testCommitReservation(reservationResult.data.reservationToken);
    results.push({ name: 'Commit Reservation', passed: commitResult.success });
  }

  // Test idempotency
  const idempotencyResult = await testIdempotency();
  results.push({ name: 'Idempotency', passed: idempotencyResult.success });

  // Test expired reservation
  const expiredResult = await testExpiredReservation();
  results.push({ name: 'Expired Reservation Rejection', passed: expiredResult.success });

  // Test concurrent bookings
  const concurrentResult = await testConcurrentBookings();
  results.push({ name: 'Concurrent Bookings', passed: concurrentResult.success });

  // Cleanup test data
  debug.log('CLEANUP', 'Cleaning up test data...');
  await cleanupTestData(sql);

  console.log('\n========================================');
  console.log('BOOKING TEST RESULTS');
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
runBookingTests()
  .then(success => {
    process.exit(success ? 0 : 1);
  })
  .catch(error => {
    debug.error('TEST_RUNNER', 'Fatal error running booking tests', error);
    process.exit(1);
  });