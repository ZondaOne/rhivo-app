import { sql, debug, cleanupTestData, TEST_CONFIG } from './setup';
import { nanoid } from 'nanoid';
import { v4 as uuidv4 } from 'uuid';

/**
 * Database Trigger Safety Net Tests
 *
 * These tests verify that database triggers act as a final safety net
 * to prevent capacity violations even if application logic is bypassed.
 *
 * The check_appointment_capacity() trigger should prevent:
 * - Inserting appointments that exceed maxSimultaneousBookings
 * - Updating appointments to times that would violate capacity
 * - Direct SQL bypassing application validation
 *
 * Test Scenarios:
 * 1. Direct SQL INSERT that would violate capacity -> should be rejected
 * 2. Direct SQL UPDATE moving appointment to full slot -> should be rejected
 * 3. Verify trigger accounts for overlapping time ranges correctly
 * 4. Verify trigger excludes soft-deleted appointments from capacity check
 */

const testId = nanoid(8);
let testBusinessId: string;
let testServiceId: string;

async function setupTestData() {
  debug.log('SETUP', 'Creating test business and service for trigger tests...');

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
        'Trigger Test Business',
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

    // Create service with capacity = 2 for testing (matches YAML)
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

async function testDirectInsertViolatingCapacity() {
  debug.log('TRIGGER_INSERT_VIOLATION', 'Testing direct INSERT that violates capacity...');

  try {
    const slotStart = new Date();
    slotStart.setDate(slotStart.getDate() + 7);
    slotStart.setHours(10, 0, 0, 0);

    const slotEnd = new Date(slotStart);
    slotEnd.setHours(11, 0, 0, 0);

    // Create 2 appointments (filling capacity=2)
    const appt1Id = uuidv4();
    const appt2Id = uuidv4();

    await sql`
      INSERT INTO appointments (
        id, business_id, service_id, slot_start, slot_end,
        status, idempotency_key, guest_email, guest_phone,
        booking_id
      ) VALUES (
        ${appt1Id}, ${testBusinessId}, ${testServiceId},
        ${slotStart}, ${slotEnd}, 'confirmed',
        ${`trigger-test-1-${testId}`}, 'test1@test.com', '+1234567890',
        'BOOK-TEST-001'
      )
    `;

    await sql`
      INSERT INTO appointments (
        id, business_id, service_id, slot_start, slot_end,
        status, idempotency_key, guest_email, guest_phone,
        booking_id
      ) VALUES (
        ${appt2Id}, ${testBusinessId}, ${testServiceId},
        ${slotStart}, ${slotEnd}, 'confirmed',
        ${`trigger-test-2-${testId}`}, 'test2@test.com', '+1234567891',
        'BOOK-TEST-002'
      )
    `;

    debug.log('TRIGGER_INSERT_VIOLATION', 'Created 2 appointments, capacity full');

    // Now try to insert a third appointment (should be rejected by trigger)
    let triggerFired = false;
    const appt3Id = uuidv4();

    try {
      await sql`
        INSERT INTO appointments (
          id, business_id, service_id, slot_start, slot_end,
          status, idempotency_key, guest_email, guest_phone,
          booking_id
        ) VALUES (
          ${appt3Id}, ${testBusinessId}, ${testServiceId},
          ${slotStart}, ${slotEnd}, 'confirmed',
          ${`trigger-test-3-${testId}`}, 'test3@test.com', '+1234567892',
          'BOOK-TEST-003'
        )
      `;

      debug.error('TRIGGER_INSERT_VIOLATION', 'Third appointment was inserted! Trigger failed to prevent capacity violation!');
    } catch (error: any) {
      if (error.message && error.message.includes('capacity exceeded')) {
        triggerFired = true;
        debug.log('TRIGGER_INSERT_VIOLATION', 'Trigger correctly rejected third appointment:', error.message);
      } else {
        debug.error('TRIGGER_INSERT_VIOLATION', 'Unexpected error:', error);
      }
    }

    if (!triggerFired) {
      debug.error('TRIGGER_INSERT_VIOLATION', 'Trigger did not fire! Capacity violation was allowed!');
      return { success: false };
    }

    // Verify only 2 appointments exist
    const count = await sql`
      SELECT COUNT(*) as count
      FROM appointments
      WHERE business_id = ${testBusinessId}
        AND service_id = ${testServiceId}
        AND slot_start = ${slotStart}
        AND deleted_at IS NULL
    `;

    const appointmentCount = parseInt(count[0].count, 10);

    if (appointmentCount !== 2) {
      debug.error('TRIGGER_INSERT_VIOLATION', `Expected 2 appointments, found ${appointmentCount}`);
      return { success: false };
    }

    debug.success('TRIGGER_INSERT_VIOLATION', 'Trigger correctly prevented capacity violation on INSERT');
    return { success: true };
  } catch (error) {
    debug.error('TRIGGER_INSERT_VIOLATION', 'Test failed', error);
    return { success: false };
  }
}

async function testDirectUpdateViolatingCapacity() {
  debug.log('TRIGGER_UPDATE_VIOLATION', 'Testing direct UPDATE that violates capacity...');

  try {
    // Create two time slots
    const slot1Start = new Date();
    slot1Start.setDate(slot1Start.getDate() + 7);
    slot1Start.setHours(14, 0, 0, 0);
    const slot1End = new Date(slot1Start);
    slot1End.setHours(15, 0, 0, 0);

    const slot2Start = new Date();
    slot2Start.setDate(slot2Start.getDate() + 7);
    slot2Start.setHours(16, 0, 0, 0);
    const slot2End = new Date(slot2Start);
    slot2End.setHours(17, 0, 0, 0);

    // Fill slot1 with 2 appointments (capacity=2)
    const appt1Id = uuidv4();
    const appt2Id = uuidv4();

    await sql`
      INSERT INTO appointments (
        id, business_id, service_id, slot_start, slot_end,
        status, idempotency_key, guest_email, guest_phone,
        booking_id
      ) VALUES
        (${appt1Id}, ${testBusinessId}, ${testServiceId},
         ${slot1Start}, ${slot1End}, 'confirmed',
         ${`update-test-1-${testId}`}, 'update1@test.com', '+1234567893',
         'BOOK-UPD-001'),
        (${appt2Id}, ${testBusinessId}, ${testServiceId},
         ${slot1Start}, ${slot1End}, 'confirmed',
         ${`update-test-2-${testId}`}, 'update2@test.com', '+1234567894',
         'BOOK-UPD-002')
    `;

    // Create appointment in slot2
    const appt3Id = uuidv4();
    await sql`
      INSERT INTO appointments (
        id, business_id, service_id, slot_start, slot_end,
        status, idempotency_key, guest_email, guest_phone,
        booking_id
      ) VALUES (
        ${appt3Id}, ${testBusinessId}, ${testServiceId},
        ${slot2Start}, ${slot2End}, 'confirmed',
        ${`update-test-3-${testId}`}, 'update3@test.com', '+1234567895',
        'BOOK-UPD-003'
      )
    `;

    debug.log('TRIGGER_UPDATE_VIOLATION', 'Created appointments: 2 in slot1, 1 in slot2');

    // Try to UPDATE appt3 to move it to slot1 (which is already full)
    let triggerFired = false;

    try {
      await sql`
        UPDATE appointments
        SET slot_start = ${slot1Start}, slot_end = ${slot1End}
        WHERE id = ${appt3Id}
      `;

      debug.error('TRIGGER_UPDATE_VIOLATION', 'UPDATE succeeded! Trigger failed to prevent capacity violation!');
    } catch (error: any) {
      if (error.message && error.message.includes('capacity exceeded')) {
        triggerFired = true;
        debug.log('TRIGGER_UPDATE_VIOLATION', 'Trigger correctly rejected UPDATE:', error.message);
      } else {
        debug.error('TRIGGER_UPDATE_VIOLATION', 'Unexpected error:', error);
      }
    }

    if (!triggerFired) {
      debug.error('TRIGGER_UPDATE_VIOLATION', 'Trigger did not fire on UPDATE!');
      return { success: false };
    }

    // Verify appt3 is still in slot2
    const appt3 = await sql`
      SELECT slot_start FROM appointments WHERE id = ${appt3Id}
    `;

    const appt3Start = new Date(appt3[0].slot_start);

    if (appt3Start.getTime() !== slot2Start.getTime()) {
      debug.error('TRIGGER_UPDATE_VIOLATION', 'Appointment was moved despite trigger!');
      return { success: false };
    }

    debug.success('TRIGGER_UPDATE_VIOLATION', 'Trigger correctly prevented capacity violation on UPDATE');
    return { success: true };
  } catch (error) {
    debug.error('TRIGGER_UPDATE_VIOLATION', 'Test failed', error);
    return { success: false };
  }
}

async function testTriggerIgnoresSoftDeletedAppointments() {
  debug.log('TRIGGER_SOFT_DELETE', 'Testing that trigger excludes soft-deleted appointments...');

  try {
    const slotStart = new Date();
    slotStart.setDate(slotStart.getDate() + 7);
    slotStart.setHours(18, 0, 0, 0);

    const slotEnd = new Date(slotStart);
    slotEnd.setHours(19, 0, 0, 0);

    // Create 2 appointments
    const appt1Id = uuidv4();
    const appt2Id = uuidv4();

    await sql`
      INSERT INTO appointments (
        id, business_id, service_id, slot_start, slot_end,
        status, idempotency_key, guest_email, guest_phone,
        booking_id
      ) VALUES
        (${appt1Id}, ${testBusinessId}, ${testServiceId},
         ${slotStart}, ${slotEnd}, 'confirmed',
         ${`soft-delete-1-${testId}`}, 'soft1@test.com', '+1234567896',
         'BOOK-SOFT-001'),
        (${appt2Id}, ${testBusinessId}, ${testServiceId},
         ${slotStart}, ${slotEnd}, 'confirmed',
         ${`soft-delete-2-${testId}`}, 'soft2@test.com', '+1234567897',
         'BOOK-SOFT-002')
    `;

    debug.log('TRIGGER_SOFT_DELETE', 'Created 2 appointments, capacity full');

    // Soft-delete one appointment
    await sql`
      UPDATE appointments
      SET deleted_at = NOW(), status = 'canceled'
      WHERE id = ${appt1Id}
    `;

    debug.log('TRIGGER_SOFT_DELETE', 'Soft-deleted one appointment, capacity should now be 1/2');

    // Try to insert a new appointment (should succeed because soft-deleted don't count)
    const appt3Id = uuidv4();

    try {
      await sql`
        INSERT INTO appointments (
          id, business_id, service_id, slot_start, slot_end,
          status, idempotency_key, guest_email, guest_phone,
          booking_id
        ) VALUES (
          ${appt3Id}, ${testBusinessId}, ${testServiceId},
          ${slotStart}, ${slotEnd}, 'confirmed',
          ${`soft-delete-3-${testId}`}, 'soft3@test.com', '+1234567898',
          'BOOK-SOFT-003'
        )
      `;

      debug.log('TRIGGER_SOFT_DELETE', 'New appointment inserted successfully');
    } catch (error: any) {
      debug.error('TRIGGER_SOFT_DELETE', 'Insertion failed! Trigger is counting soft-deleted appointments:', error.message);
      return { success: false };
    }

    // Verify: should have 2 active appointments (appt2 and appt3)
    const activeCount = await sql`
      SELECT COUNT(*) as count
      FROM appointments
      WHERE business_id = ${testBusinessId}
        AND service_id = ${testServiceId}
        AND slot_start = ${slotStart}
        AND deleted_at IS NULL
    `;

    const count = parseInt(activeCount[0].count, 10);

    if (count !== 2) {
      debug.error('TRIGGER_SOFT_DELETE', `Expected 2 active appointments, found ${count}`);
      return { success: false };
    }

    debug.success('TRIGGER_SOFT_DELETE', 'Trigger correctly ignores soft-deleted appointments');
    return { success: true };
  } catch (error) {
    debug.error('TRIGGER_SOFT_DELETE', 'Test failed', error);
    return { success: false };
  }
}

async function testTriggerOverlapDetection() {
  debug.log('TRIGGER_OVERLAP', 'Testing trigger overlap detection logic...');

  try {
    const baseDate = new Date();
    baseDate.setDate(baseDate.getDate() + 8);
    baseDate.setHours(10, 0, 0, 0);

    // Create appointment 10:00-11:00
    const appt1Start = new Date(baseDate);
    appt1Start.setHours(10, 0, 0, 0);
    const appt1End = new Date(baseDate);
    appt1End.setHours(11, 0, 0, 0);

    const appt2Start = new Date(baseDate);
    appt2Start.setHours(10, 0, 0, 0);
    const appt2End = new Date(baseDate);
    appt2End.setHours(11, 0, 0, 0);

    const appt1Id = uuidv4();
    const appt2Id = uuidv4();

    // Insert first two appointments at exact same time
    await sql`
      INSERT INTO appointments (
        id, business_id, service_id, slot_start, slot_end,
        status, idempotency_key, guest_email, guest_phone,
        booking_id
      ) VALUES
        (${appt1Id}, ${testBusinessId}, ${testServiceId},
         ${appt1Start}, ${appt1End}, 'confirmed',
         ${`overlap-1-${testId}`}, 'overlap1@test.com', '+1234567899',
         'BOOK-OVR-001'),
        (${appt2Id}, ${testBusinessId}, ${testServiceId},
         ${appt2Start}, ${appt2End}, 'confirmed',
         ${`overlap-2-${testId}`}, 'overlap2@test.com', '+1234567800',
         'BOOK-OVR-002')
    `;

    // Test 1: Try exact overlap 10:00-11:00 (should fail)
    let test1Failed = false;
    try {
      await sql`
        INSERT INTO appointments (
          id, business_id, service_id, slot_start, slot_end,
          status, idempotency_key, guest_email, guest_phone,
          booking_id
        ) VALUES (
          ${uuidv4()}, ${testBusinessId}, ${testServiceId},
          ${appt1Start}, ${appt1End}, 'confirmed',
          ${`overlap-3-${testId}`}, 'overlap3@test.com', '+1234567801',
          'BOOK-OVR-003'
        )
      `;
    } catch (error: any) {
      if (error.message.includes('capacity exceeded')) test1Failed = true;
    }

    // Test 2: Try partial overlap 10:30-11:30 (should fail)
    const partial1Start = new Date(baseDate);
    partial1Start.setHours(10, 30, 0, 0);
    const partial1End = new Date(baseDate);
    partial1End.setHours(11, 30, 0, 0);

    let test2Failed = false;
    try {
      await sql`
        INSERT INTO appointments (
          id, business_id, service_id, slot_start, slot_end,
          status, idempotency_key, guest_email, guest_phone,
          booking_id
        ) VALUES (
          ${uuidv4()}, ${testBusinessId}, ${testServiceId},
          ${partial1Start}, ${partial1End}, 'confirmed',
          ${`overlap-4-${testId}`}, 'overlap4@test.com', '+1234567802',
          'BOOK-OVR-004'
        )
      `;
    } catch (error: any) {
      if (error.message.includes('capacity exceeded')) test2Failed = true;
    }

    // Test 3: Try non-overlapping 11:00-12:00 (should succeed)
    const nonOverlapStart = new Date(baseDate);
    nonOverlapStart.setHours(11, 0, 0, 0);
    const nonOverlapEnd = new Date(baseDate);
    nonOverlapEnd.setHours(12, 0, 0, 0);

    let test3Passed = false;
    try {
      await sql`
        INSERT INTO appointments (
          id, business_id, service_id, slot_start, slot_end,
          status, idempotency_key, guest_email, guest_phone,
          booking_id
        ) VALUES (
          ${uuidv4()}, ${testBusinessId}, ${testServiceId},
          ${nonOverlapStart}, ${nonOverlapEnd}, 'confirmed',
          ${`overlap-5-${testId}`}, 'overlap5@test.com', '+1234567803',
          'BOOK-OVR-005'
        )
      `;
      test3Passed = true;
    } catch (error: any) {
      debug.error('TRIGGER_OVERLAP', 'Non-overlapping appointment was rejected:', error.message);
    }

    if (!test1Failed || !test2Failed || !test3Passed) {
      debug.error('TRIGGER_OVERLAP', 'Overlap detection failed', {
        exactOverlapRejected: test1Failed,
        partialOverlapRejected: test2Failed,
        nonOverlapAccepted: test3Passed,
      });
      return { success: false };
    }

    debug.success('TRIGGER_OVERLAP', 'Trigger correctly detects all overlap scenarios');
    return { success: true };
  } catch (error) {
    debug.error('TRIGGER_OVERLAP', 'Test failed', error);
    return { success: false };
  }
}

async function runDatabaseTriggerTests() {
  console.log('\n========================================');
  console.log('DATABASE TRIGGER SAFETY NET TESTS');
  console.log('========================================\n');

  const setupSuccess = await setupTestData();
  if (!setupSuccess) {
    console.error('Failed to setup test data. Aborting tests.');
    return false;
  }

  const results = [];

  // Test 1: Direct INSERT violating capacity
  const test1 = await testDirectInsertViolatingCapacity();
  results.push({ name: 'Trigger Prevents INSERT Capacity Violation', passed: test1.success });

  // Test 2: Direct UPDATE violating capacity
  const test2 = await testDirectUpdateViolatingCapacity();
  results.push({ name: 'Trigger Prevents UPDATE Capacity Violation', passed: test2.success });

  // Test 3: Trigger ignores soft-deleted appointments
  const test3 = await testTriggerIgnoresSoftDeletedAppointments();
  results.push({ name: 'Trigger Ignores Soft-Deleted Appointments', passed: test3.success });

  // Test 4: Overlap detection
  const test4 = await testTriggerOverlapDetection();
  results.push({ name: 'Trigger Overlap Detection Logic', passed: test4.success });

  // Cleanup
  debug.log('CLEANUP', 'Cleaning up trigger test data...');
  await cleanupTestData(sql, testBusinessId);

  console.log('\n========================================');
  console.log('DATABASE TRIGGER TEST RESULTS');
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
runDatabaseTriggerTests()
  .then(success => {
    process.exit(success ? 0 : 1);
  })
  .catch(error => {
    debug.error('TEST_RUNNER', 'Fatal error running database trigger tests', error);
    process.exit(1);
  });
