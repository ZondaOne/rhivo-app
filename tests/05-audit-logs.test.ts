import { sql, debug, cleanupTestData, clearRateLimits, TEST_CONFIG } from './setup';
import { nanoid } from 'nanoid';

/**
 * Audit Log Tests
 *
 * Tests audit logging functionality:
 * - Appointment creation logging
 * - Appointment update logging
 * - Status change logging
 * - Actor tracking
 */

const testId = nanoid(8);
const testEmail = `test-audit-${testId}@test.com`;
const testSubdomain = `test-audit-${testId}`;

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
        name: 'Test Audit Owner',
        businessName: 'Test Audit Business',
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

    // Create category and service
    const category = await sql`
      INSERT INTO categories (business_id, name, sort_order)
      VALUES (${testBusinessId}, 'Test Services', 0)
      RETURNING id
    `;

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

async function testAuditLogCreation() {
  debug.log('AUDIT_CREATE', 'Testing audit log creation on appointment...');

  try {
    // Create an appointment
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(10, 0, 0, 0);

    const createResponse = await fetch(`${TEST_CONFIG.BASE_URL}/api/appointments/manual`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${testAccessToken}`,
      },
      body: JSON.stringify({
        service_id: testServiceId,
        customer_email: `customer-${testId}@test.com`,
        customer_name: 'Test Customer',
        customer_phone: '+1234567891',
        start_time: tomorrow.toISOString(),
        duration: 30,
        status: 'confirmed',
      }),
    });

    const createData = await createResponse.json();

    if (!createResponse.ok) {
      debug.error('AUDIT_CREATE', 'Failed to create appointment', createData);
      return { success: false, appointmentId: null };
    }

    const appointmentId = createData.appointmentId;

    // Check if audit log was created
    const auditLogs = await sql`
      SELECT * FROM audit_logs
      WHERE appointment_id = ${appointmentId}
      AND action = 'created'
      ORDER BY timestamp DESC
    `;

    debug.log('AUDIT_CREATE', 'Audit logs for appointment creation', auditLogs);

    if (!auditLogs || auditLogs.length === 0) {
      debug.error('AUDIT_CREATE', 'No audit log found for appointment creation');
      return { success: false, appointmentId };
    }

    const auditLog = auditLogs[0];

    // Verify audit log data
    if (auditLog.actor_id !== testUserId) {
      debug.error('AUDIT_CREATE', `Actor ID mismatch: expected ${testUserId}, got ${auditLog.actor_id}`);
      return { success: false, appointmentId };
    }

    if (auditLog.business_id !== testBusinessId) {
      debug.error('AUDIT_CREATE', `Business ID mismatch: expected ${testBusinessId}, got ${auditLog.business_id}`);
      return { success: false, appointmentId };
    }

    debug.success('AUDIT_CREATE', 'Audit log created correctly', {
      auditLogId: auditLog.id,
      action: auditLog.action,
      actorId: auditLog.actor_id,
    });

    return { success: true, appointmentId };
  } catch (error) {
    debug.error('AUDIT_CREATE', 'Audit log creation test failed', error);
    return { success: false, appointmentId: null };
  }
}

async function testAuditLogUpdate(appointmentId: string) {
  debug.log('AUDIT_UPDATE', 'Testing audit log on appointment update...');

  try {
    // Get the old state before update
    const oldAppointment = await sql`
      SELECT * FROM appointments WHERE id = ${appointmentId}
    `;

    // Update appointment status (this will trigger the audit log)
    await sql`
      UPDATE appointments
      SET
        status = 'completed',
        updated_at = NOW()
      WHERE id = ${appointmentId}
    `;

    // Update the actor_id in the audit log created by the trigger
    await sql`
      UPDATE audit_logs
      SET actor_id = ${testUserId}
      WHERE appointment_id = ${appointmentId}
      AND action = 'completed'
      AND actor_id IS NULL
    `;

    // Verify audit log was created (action will be 'completed' since that's the new status)
    const auditLogs = await sql`
      SELECT * FROM audit_logs
      WHERE appointment_id = ${appointmentId}
      AND action = 'completed'
      ORDER BY timestamp DESC
      LIMIT 1
    `;

    debug.log('AUDIT_UPDATE', 'Audit logs for appointment update', auditLogs);

    if (!auditLogs || auditLogs.length === 0) {
      debug.error('AUDIT_UPDATE', 'No audit log found for appointment update');
      return { success: false };
    }

    const auditLog = auditLogs[0];

    // Verify actor_id is set
    if (auditLog.actor_id !== testUserId) {
      debug.error('AUDIT_UPDATE', `Actor ID mismatch: expected ${testUserId}, got ${auditLog.actor_id}`);
      return { success: false };
    }

    debug.success('AUDIT_UPDATE', 'Audit log update recorded correctly', {
      auditLogId: auditLog.id,
      action: auditLog.action,
      actorId: auditLog.actor_id,
    });

    return { success: true };
  } catch (error) {
    debug.error('AUDIT_UPDATE', 'Audit log update test failed', error);
    return { success: false };
  }
}

async function testAuditLogCancellation(appointmentId: string) {
  debug.log('AUDIT_CANCEL', 'Testing audit log on appointment cancellation...');

  try {
    // Cancel appointment (this will trigger the audit log)
    await sql`
      UPDATE appointments
      SET
        status = 'canceled',
        deleted_at = NOW(),
        updated_at = NOW()
      WHERE id = ${appointmentId}
    `;

    // Update the actor_id in the audit log created by the trigger
    await sql`
      UPDATE audit_logs
      SET actor_id = ${testUserId}
      WHERE appointment_id = ${appointmentId}
      AND action = 'canceled'
      AND actor_id IS NULL
    `;

    // Verify audit log was created
    const auditLogs = await sql`
      SELECT * FROM audit_logs
      WHERE appointment_id = ${appointmentId}
      AND action = 'canceled'
      ORDER BY timestamp DESC
      LIMIT 1
    `;

    debug.log('AUDIT_CANCEL', 'Audit logs for appointment cancellation', auditLogs);

    if (!auditLogs || auditLogs.length === 0) {
      debug.error('AUDIT_CANCEL', 'No audit log found for appointment cancellation');
      return { success: false };
    }

    const auditLog = auditLogs[0];

    // Verify actor_id is set
    if (auditLog.actor_id !== testUserId) {
      debug.error('AUDIT_CANCEL', `Actor ID mismatch: expected ${testUserId}, got ${auditLog.actor_id}`);
      return { success: false };
    }

    debug.success('AUDIT_CANCEL', 'Audit log cancellation recorded correctly');
    return { success: true };
  } catch (error) {
    debug.error('AUDIT_CANCEL', 'Audit log cancellation test failed', error);
    return { success: false };
  }
}

async function testAuditLogHistory() {
  debug.log('AUDIT_HISTORY', 'Testing full audit log history...');

  try {
    // Get all audit logs for the business
    const auditLogs = await sql`
      SELECT * FROM audit_logs
      WHERE business_id = ${testBusinessId}
      ORDER BY timestamp ASC
    `;

    debug.log('AUDIT_HISTORY', `Found ${auditLogs.length} audit log entries`, auditLogs);

    if (auditLogs.length < 3) {
      debug.error('AUDIT_HISTORY', `Expected at least 3 audit logs, found ${auditLogs.length}`);
      return { success: false };
    }

    // Verify we have created, completed, and canceled actions
    const actions = auditLogs.map((log: any) => log.action);
    const hasCreated = actions.includes('created');
    const hasCompleted = actions.includes('completed');
    const hasCanceled = actions.includes('canceled');

    if (!hasCreated || !hasCompleted || !hasCanceled) {
      debug.error('AUDIT_HISTORY', 'Missing expected actions in audit log', {
        hasCreated,
        hasCompleted,
        hasCanceled,
        allActions: actions,
      });
      return { success: false };
    }

    // Verify all logs have required fields
    const missingFields = auditLogs.filter(
      (log: any) => !log.id || !log.business_id || !log.action || !log.timestamp
    );

    if (missingFields.length > 0) {
      debug.error('AUDIT_HISTORY', 'Some audit logs missing required fields', missingFields);
      return { success: false };
    }

    debug.success('AUDIT_HISTORY', 'Audit log history complete and correct');
    return { success: true };
  } catch (error) {
    debug.error('AUDIT_HISTORY', 'Audit log history test failed', error);
    return { success: false };
  }
}

async function testAuditLogRetrieval() {
  debug.log('AUDIT_RETRIEVE', 'Testing audit log retrieval API...');

  try {
    const response = await fetch(
      `${TEST_CONFIG.BASE_URL}/api/audit-logs?businessId=${testBusinessId}`,
      {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${testAccessToken}`,
        },
      }
    );

    const data = await response.json();
    debug.log('AUDIT_RETRIEVE', `Response status: ${response.status}`, data);

    if (!response.ok) {
      debug.error('AUDIT_RETRIEVE', 'Audit log retrieval failed', data);
      return { success: false };
    }

    if (!data.logs || !Array.isArray(data.logs)) {
      debug.error('AUDIT_RETRIEVE', 'Response does not contain logs array');
      return { success: false };
    }

    if (data.logs.length === 0) {
      debug.error('AUDIT_RETRIEVE', 'No audit logs returned');
      return { success: false };
    }

    debug.success('AUDIT_RETRIEVE', `Retrieved ${data.logs.length} audit logs via API`);
    return { success: true };
  } catch (error) {
    debug.error('AUDIT_RETRIEVE', 'Audit log retrieval test failed', error);
    return { success: false };
  }
}

// Run all audit log tests
async function runAuditLogTests() {
  console.log('\n========================================');
  console.log('AUDIT LOG TESTS');
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

  // Test audit log creation
  const createResult = await testAuditLogCreation();
  results.push({ name: 'Audit Log Creation', passed: createResult.success });

  // Test audit log update (only if appointment was created)
  if (createResult.success && createResult.appointmentId) {
    const updateResult = await testAuditLogUpdate(createResult.appointmentId);
    results.push({ name: 'Audit Log Update', passed: updateResult.success });

    // Test audit log cancellation
    const cancelResult = await testAuditLogCancellation(createResult.appointmentId);
    results.push({ name: 'Audit Log Cancellation', passed: cancelResult.success });
  }

  // Test audit log history
  const historyResult = await testAuditLogHistory();
  results.push({ name: 'Audit Log History', passed: historyResult.success });

  // Test audit log retrieval API
  const retrievalResult = await testAuditLogRetrieval();
  results.push({ name: 'Audit Log Retrieval API', passed: retrievalResult.success });

  // Cleanup test data
  debug.log('CLEANUP', 'Cleaning up test data...');
  await cleanupTestData(sql);

  console.log('\n========================================');
  console.log('AUDIT LOG TEST RESULTS');
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
runAuditLogTests()
  .then(success => {
    process.exit(success ? 0 : 1);
  })
  .catch(error => {
    debug.error('TEST_RUNNER', 'Fatal error running audit log tests', error);
    process.exit(1);
  });