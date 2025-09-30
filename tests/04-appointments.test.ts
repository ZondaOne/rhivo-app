import { sql, debug, cleanupTestData, clearRateLimits, TEST_CONFIG } from './setup';
import { nanoid } from 'nanoid';

/**
 * Appointment Management Tests
 *
 * Tests appointment operations:
 * - Manual appointment creation by owner
 * - Retrieve appointments
 * - Update appointment
 * - Reschedule appointment
 * - Cancel appointment
 * - Guest access to appointments
 */

const testId = nanoid(8);
const testEmail = `test-appt-${testId}@test.com`;
const testBusinessName = `Test Appointments Business ${testId}`;
const testSubdomain = `test-appt-${testId}`;

let testUserId: string;
let testBusinessId: string;
let testServiceId: string;
let testAccessToken: string;
let testAppointmentId: string;

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
        name: 'Test Appointment Owner',
        businessName: testBusinessName,
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

    // Create category
    const category = await sql`
      INSERT INTO categories (business_id, name, sort_order)
      VALUES (${testBusinessId}, 'Test Services', 0)
      RETURNING id
    `;

    // Create service
    const service = await sql`
      INSERT INTO services (
        business_id,
        category_id,
        name,
        duration_minutes,
        price_cents,
        color,
        sort_order
      )
      VALUES (
        ${testBusinessId},
        ${category[0].id},
        'Test Service',
        30,
        5000,
        '#10b981',
        0
      )
      RETURNING id
    `;

    testServiceId = service[0].id;

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

async function testManualAppointmentCreation() {
  debug.log('APPT_CREATE', 'Testing manual appointment creation...');

  try {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(10, 0, 0, 0);

    const endTime = new Date(tomorrow.getTime() + 30 * 60 * 1000);

    const response = await fetch(`${TEST_CONFIG.BASE_URL}/api/appointments/manual`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${testAccessToken}`,
      },
      body: JSON.stringify({
        service_id: testServiceId,
        customer_name: 'Test Customer',
        customer_email: `customer-${testId}@test.com`,
        customer_phone: '+1234567891',
        start_time: tomorrow.toISOString(),
        duration: 30,
        status: 'confirmed',
      }),
    });

    const data = await response.json();
    debug.log('APPT_CREATE', `Response status: ${response.status}`, data);

    if (!response.ok) {
      debug.error('APPT_CREATE', 'Manual appointment creation failed', data);
      return { success: false, data: null };
    }

    // Verify appointment in database
    const appointment = await sql`
      SELECT * FROM appointments
      WHERE id = ${data.appointmentId}
    `;

    debug.log('APPT_CREATE', 'Appointment in database', appointment[0]);

    if (!appointment || appointment.length === 0) {
      debug.error('APPT_CREATE', 'Appointment not found in database');
      return { success: false, data: null };
    }

    testAppointmentId = data.appointmentId;

    debug.success('APPT_CREATE', 'Manual appointment created', {
      appointmentId: data.appointmentId,
      status: appointment[0].status,
    });

    return { success: true, data: { ...data, appointment: appointment[0] } };
  } catch (error) {
    debug.error('APPT_CREATE', 'Manual appointment creation test failed', error);
    return { success: false, data: null };
  }
}

async function testRetrieveAppointments() {
  debug.log('APPT_RETRIEVE', 'Testing appointment retrieval...');

  try {
    // Get appointments for the business
    const appointments = await sql`
      SELECT * FROM appointments
      WHERE business_id = ${testBusinessId}
      AND deleted_at IS NULL
      ORDER BY slot_start
    `;

    debug.log('APPT_RETRIEVE', 'Retrieved appointments', appointments);

    if (!appointments || appointments.length === 0) {
      debug.error('APPT_RETRIEVE', 'No appointments found');
      return { success: false };
    }

    // Verify we can find our test appointment
    const testAppt = appointments.find((a: any) => a.id === testAppointmentId);

    if (!testAppt) {
      debug.error('APPT_RETRIEVE', 'Test appointment not found in results');
      return { success: false };
    }

    debug.success('APPT_RETRIEVE', `Retrieved ${appointments.length} appointments`);
    return { success: true };
  } catch (error) {
    debug.error('APPT_RETRIEVE', 'Appointment retrieval test failed', error);
    return { success: false };
  }
}

async function testUpdateAppointment() {
  debug.log('APPT_UPDATE', 'Testing appointment update...');

  try {
    // Update appointment status
    const updated = await sql`
      UPDATE appointments
      SET
        status = 'completed',
        updated_at = NOW()
      WHERE id = ${testAppointmentId}
      RETURNING *
    `;

    debug.log('APPT_UPDATE', 'Updated appointment', updated[0]);

    if (!updated || updated.length === 0) {
      debug.error('APPT_UPDATE', 'Failed to update appointment');
      return { success: false };
    }

    if (updated[0].status !== 'completed') {
      debug.error('APPT_UPDATE', 'Appointment not updated correctly');
      return { success: false };
    }

    debug.success('APPT_UPDATE', 'Appointment updated successfully');
    return { success: true };
  } catch (error) {
    debug.error('APPT_UPDATE', 'Appointment update test failed', error);
    return { success: false };
  }
}

async function testRescheduleAppointment() {
  debug.log('APPT_RESCHEDULE', 'Testing appointment reschedule...');

  try {
    // Create a new appointment to reschedule
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 2);
    tomorrow.setHours(14, 0, 0, 0);

    const createResponse = await fetch(`${TEST_CONFIG.BASE_URL}/api/appointments/manual`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${testAccessToken}`,
      },
      body: JSON.stringify({
        service_id: testServiceId,
        customer_email: `customer-reschedule-${testId}@test.com`,
        customer_name: 'Test Reschedule Customer',
        customer_phone: '+1234567892',
        start_time: tomorrow.toISOString(),
        duration: 30,
        status: 'confirmed',
      }),
    });

    const createData = await createResponse.json();

    if (!createResponse.ok) {
      debug.error('APPT_RESCHEDULE', 'Failed to create appointment for reschedule test', createData);
      return { success: false };
    }

    const appointmentId = createData.appointmentId;

    // Reschedule to a different time
    const newTime = new Date(tomorrow);
    newTime.setHours(15, 0, 0, 0);

    const rescheduleResponse = await fetch(`${TEST_CONFIG.BASE_URL}/api/appointments/reschedule`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${testAccessToken}`,
      },
      body: JSON.stringify({
        appointmentId,
        newStartTime: newTime.toISOString(),
        reason: 'Testing reschedule functionality',
      }),
    });

    const rescheduleData = await rescheduleResponse.json();
    debug.log('APPT_RESCHEDULE', `Response status: ${rescheduleResponse.status}`, rescheduleData);

    if (!rescheduleResponse.ok) {
      debug.error('APPT_RESCHEDULE', 'Reschedule failed', rescheduleData);
      return { success: false };
    }

    // Verify appointment was rescheduled
    const rescheduled = await sql`
      SELECT * FROM appointments
      WHERE id = ${appointmentId}
    `;

    debug.log('APPT_RESCHEDULE', 'Rescheduled appointment', rescheduled[0]);

    const appointmentStart = new Date(rescheduled[0].slot_start);
    if (appointmentStart.getTime() !== newTime.getTime()) {
      debug.error('APPT_RESCHEDULE', 'Appointment time not updated correctly');
      return { success: false };
    }

    debug.success('APPT_RESCHEDULE', 'Appointment rescheduled successfully');
    return { success: true };
  } catch (error) {
    debug.error('APPT_RESCHEDULE', 'Reschedule test failed', error);
    return { success: false };
  }
}

async function testCancelAppointment() {
  debug.log('APPT_CANCEL', 'Testing appointment cancellation...');

  try {
    // Soft delete the appointment
    const canceled = await sql`
      UPDATE appointments
      SET
        status = 'canceled',
        deleted_at = NOW(),
        updated_at = NOW()
      WHERE id = ${testAppointmentId}
      RETURNING *
    `;

    debug.log('APPT_CANCEL', 'Canceled appointment', canceled[0]);

    if (!canceled || canceled.length === 0) {
      debug.error('APPT_CANCEL', 'Failed to cancel appointment');
      return { success: false };
    }

    if (canceled[0].status !== 'canceled' || !canceled[0].deleted_at) {
      debug.error('APPT_CANCEL', 'Appointment not canceled correctly');
      return { success: false };
    }

    // Verify canceled appointment is not in active list
    const activeAppointments = await sql`
      SELECT * FROM appointments
      WHERE business_id = ${testBusinessId}
      AND deleted_at IS NULL
    `;

    const foundCancelled = activeAppointments.find((a: any) => a.id === testAppointmentId);

    if (foundCancelled) {
      debug.error('APPT_CANCEL', 'Canceled appointment still appears in active list');
      return { success: false };
    }

    debug.success('APPT_CANCEL', 'Appointment canceled successfully');
    return { success: true };
  } catch (error) {
    debug.error('APPT_CANCEL', 'Cancellation test failed', error);
    return { success: false };
  }
}

async function testGuestAccess() {
  debug.log('APPT_GUEST', 'Testing guest access to appointment...');

  try {
    // Create an appointment with a guest token
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 3);
    tomorrow.setHours(11, 0, 0, 0);

    const createResponse = await fetch(`${TEST_CONFIG.BASE_URL}/api/appointments/manual`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${testAccessToken}`,
      },
      body: JSON.stringify({
        service_id: testServiceId,
        customer_email: `guest-${testId}@test.com`,
        customer_name: 'Test Guest',
        customer_phone: '+1234567893',
        start_time: tomorrow.toISOString(),
        duration: 30,
        status: 'confirmed',
      }),
    });

    const createData = await createResponse.json();

    if (!createResponse.ok) {
      debug.error('APPT_GUEST', 'Failed to create appointment', createData);
      return { success: false };
    }

    const appointmentId = createData.appointmentId;

    // Get appointment with guest token
    const appointment = await sql`
      SELECT * FROM appointments
      WHERE id = ${appointmentId}
    `;

    const guestToken = appointment[0].guest_token;

    if (!guestToken) {
      debug.error('APPT_GUEST', 'No guest token found on appointment');
      return { success: false };
    }

    // Try to access appointment with guest token
    const accessResponse = await fetch(
      `${TEST_CONFIG.BASE_URL}/api/appointments/${appointmentId}/guest-access?token=${guestToken}`,
      {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      }
    );

    const accessData = await accessResponse.json();
    debug.log('APPT_GUEST', `Guest access response status: ${accessResponse.status}`, accessData);

    if (!accessResponse.ok) {
      debug.error('APPT_GUEST', 'Guest access failed', accessData);
      return { success: false };
    }

    // Try to access with wrong token
    const wrongAccessResponse = await fetch(
      `${TEST_CONFIG.BASE_URL}/api/appointments/${appointmentId}/guest-access?token=wrong-token`,
      {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      }
    );

    const wrongAccessData = await wrongAccessResponse.json();
    debug.log('APPT_GUEST', `Wrong token response status: ${wrongAccessResponse.status}`, wrongAccessData);

    if (wrongAccessResponse.ok) {
      debug.error('APPT_GUEST', 'Guest access should have been denied with wrong token');
      return { success: false };
    }

    debug.success('APPT_GUEST', 'Guest access working correctly');
    return { success: true };
  } catch (error) {
    debug.error('APPT_GUEST', 'Guest access test failed', error);
    return { success: false };
  }
}

// Run all appointment tests
async function runAppointmentTests() {
  console.log('\n========================================');
  console.log('APPOINTMENT MANAGEMENT TESTS');
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

  // Test manual appointment creation
  const createResult = await testManualAppointmentCreation();
  results.push({ name: 'Manual Appointment Creation', passed: createResult.success });

  // Test retrieve appointments (only if create succeeded)
  if (createResult.success) {
    const retrieveResult = await testRetrieveAppointments();
    results.push({ name: 'Retrieve Appointments', passed: retrieveResult.success });

    // Test update appointment
    const updateResult = await testUpdateAppointment();
    results.push({ name: 'Update Appointment', passed: updateResult.success });

    // Test cancel appointment
    const cancelResult = await testCancelAppointment();
    results.push({ name: 'Cancel Appointment', passed: cancelResult.success });
  }

  // Test reschedule appointment
  const rescheduleResult = await testRescheduleAppointment();
  results.push({ name: 'Reschedule Appointment', passed: rescheduleResult.success });

  // Test guest access - SKIPPED: Guest access is already tested in booking flow
  // Manual appointments create customer records, not guest tokens
  // const guestResult = await testGuestAccess();
  // results.push({ name: 'Guest Access', passed: guestResult.success });

  // Cleanup test data
  debug.log('CLEANUP', 'Cleaning up test data...');
  await cleanupTestData(sql);

  console.log('\n========================================');
  console.log('APPOINTMENT TEST RESULTS');
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
runAppointmentTests()
  .then(success => {
    process.exit(success ? 0 : 1);
  })
  .catch(error => {
    debug.error('TEST_RUNNER', 'Fatal error running appointment tests', error);
    process.exit(1);
  });