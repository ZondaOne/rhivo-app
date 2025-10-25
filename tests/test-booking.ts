/**
 * Simple integration test for booking system
 * Run with: npx tsx test-booking.ts
 */

import 'dotenv/config';
import { getDbClient } from './src/db/client.js';
import { ReservationManager, AppointmentManager } from './src/lib/booking/index.js';
import { v4 as uuidv4 } from 'uuid';

async function testBookingFlow() {
  console.log('🧪 Testing Booking System...\n');

  const db = getDbClient();
  const reservationManager = new ReservationManager(db);
  const appointmentManager = new AppointmentManager(db);

  // Test data
  const testBusinessId = uuidv4();
  const testServiceId = uuidv4();
  const testActorId = uuidv4();
  const slotStart = new Date(Date.now() + 24 * 60 * 60 * 1000); // Tomorrow
  const slotEnd = new Date(slotStart.getTime() + 60 * 60 * 1000); // +1 hour

  try {
    // Setup: Create test business, user, and service
    console.log('📝 Setting up test business and service...');
    await db`
      INSERT INTO businesses (id, subdomain, name, timezone, config_yaml_path, config_version, status)
      VALUES (${testBusinessId}, 'test-booking', 'Test Business', 'America/New_York', '/configs/test.yaml', 1, 'active')
    `;

    await db`
      INSERT INTO users (id, email, role, business_id)
      VALUES (${testActorId}, 'test@example.com', 'owner', ${testBusinessId})
    `;

    await db`
      INSERT INTO services (
        id, business_id, name, duration_minutes, price_cents, color,
        max_simultaneous_bookings, sort_order
      )
      VALUES (
        ${testServiceId}, ${testBusinessId}, 'Test Service', 60, 5000, '#00AA88',
        2, 1
      )
    `;
    console.log('✅ Test data created\n');

    // Test 1: Check initial capacity
    console.log('TEST 1: Check initial capacity');
    const initialCapacity = await reservationManager.getAvailableCapacity(
      testBusinessId,
      testServiceId,
      slotStart,
      slotEnd
    );
    console.log(`   Capacity: ${initialCapacity}/2 (type: ${typeof initialCapacity})`);
    if (Number(initialCapacity) !== 2) throw new Error(`Expected initial capacity of 2, got ${initialCapacity}`);
    console.log('   ✅ PASSED\n');

    // Test 2: Create reservation with idempotency
    console.log('TEST 2: Create reservation with idempotency');
    const idempotencyKey = uuidv4();
    const reservation1 = await reservationManager.createReservation({
      businessId: testBusinessId,
      serviceId: testServiceId,
      slotStart,
      slotEnd,
      idempotencyKey,
      ttlMinutes: 15
    });
    console.log(`   Reservation ID: ${reservation1.id}`);
    console.log(`   Expires: ${reservation1.expires_at}`);

    // Same idempotency key should return same reservation
    const reservation2 = await reservationManager.createReservation({
      businessId: testBusinessId,
      serviceId: testServiceId,
      slotStart,
      slotEnd,
      idempotencyKey,
      ttlMinutes: 15
    });

    if (reservation1.id !== reservation2.id) {
      throw new Error('Idempotency failed: different reservation IDs');
    }
    console.log('   ✅ PASSED (idempotency works)\n');

    // Test 3: Capacity reduced after reservation
    console.log('TEST 3: Capacity reduced after reservation');
    const afterReservation = await reservationManager.getAvailableCapacity(
      testBusinessId,
      testServiceId,
      slotStart,
      slotEnd
    );
    console.log(`   Capacity: ${afterReservation}/2`);
    if (Number(afterReservation) !== 1) throw new Error(`Expected capacity of 1 after reservation, got ${afterReservation}`);
    console.log('   ✅ PASSED\n');

    // Test 4: Commit reservation to appointment
    console.log('TEST 4: Commit reservation to appointment');
    const appointment = await appointmentManager.commitReservation({
      reservationId: reservation1.id,
      guestEmail: 'test@example.com',
      guestPhone: '+1234567890',
      cancellationToken: uuidv4()
    });
    console.log(`   Appointment ID: ${appointment.id}`);
    console.log(`   Status: ${appointment.status}`);
    console.log(`   Version: ${appointment.version}`);
    if (appointment.status !== 'confirmed') throw new Error('Expected confirmed status');
    console.log('   ✅ PASSED\n');

    // Test 5: Capacity still reduced (reservation deleted, appointment created)
    console.log('TEST 5: Capacity after commit');
    const afterCommit = await reservationManager.getAvailableCapacity(
      testBusinessId,
      testServiceId,
      slotStart,
      slotEnd
    );
    console.log(`   Capacity: ${afterCommit}/2`);
    if (Number(afterCommit) !== 1) throw new Error(`Expected capacity of 1 after commit, got ${afterCommit}`);
    console.log('   ✅ PASSED\n');

    // Test 6: Create second reservation
    console.log('TEST 6: Fill remaining capacity');
    const reservation3 = await reservationManager.createReservation({
      businessId: testBusinessId,
      serviceId: testServiceId,
      slotStart,
      slotEnd,
      idempotencyKey: uuidv4(),
      ttlMinutes: 15
    });
    console.log(`   Second reservation: ${reservation3.id}`);

    const fullCapacity = await reservationManager.getAvailableCapacity(
      testBusinessId,
      testServiceId,
      slotStart,
      slotEnd
    );
    console.log(`   Capacity: ${fullCapacity}/2`);
    if (Number(fullCapacity) !== 0) throw new Error(`Expected capacity of 0 when full, got ${fullCapacity}`);
    console.log('   ✅ PASSED\n');

    // Test 7: Cannot exceed capacity
    console.log('TEST 7: Prevent overbooking');
    try {
      await reservationManager.createReservation({
        businessId: testBusinessId,
        serviceId: testServiceId,
        slotStart,
        slotEnd,
        idempotencyKey: uuidv4(),
        ttlMinutes: 15
      });
      throw new Error('Should have failed due to capacity');
    } catch (error: any) {
      if (error.message.includes('no longer available')) {
        console.log('   ✅ PASSED (correctly rejected overbooking)\n');
      } else {
        throw error;
      }
    }

    // Test 8: Optimistic locking on updates
    console.log('TEST 8: Optimistic locking on appointment update');
    const updated = await appointmentManager.updateAppointment({
      appointmentId: appointment.id,
      status: 'completed',
      expectedVersion: appointment.version,
      actorId: testActorId
    });
    console.log(`   Updated version: ${updated.version}`);
    if (updated.version !== appointment.version + 1) {
      throw new Error('Version not incremented');
    }

    // Try update with stale version
    try {
      await appointmentManager.updateAppointment({
        appointmentId: appointment.id,
        status: 'canceled',
        expectedVersion: appointment.version, // Stale version
        actorId: testActorId
      });
      throw new Error('Should have failed due to version conflict');
    } catch (error: any) {
      if (error.code === 'CONFLICT' || error.message.includes('concurrent')) {
        console.log('   ✅ PASSED (detected version conflict)\n');
      } else {
        throw error;
      }
    }

    // Test 9: Cleanup expired reservations
    console.log('TEST 9: Cleanup expired reservations');
    // Create a short-lived reservation
    const shortReservation = await reservationManager.createReservation({
      businessId: testBusinessId,
      serviceId: testServiceId,
      slotStart: new Date(slotStart.getTime() + 2 * 60 * 60 * 1000), // +2 hours
      slotEnd: new Date(slotStart.getTime() + 3 * 60 * 60 * 1000),
      idempotencyKey: uuidv4(),
      ttlMinutes: 0.01 // Very short TTL for testing
    });

    // Wait for it to expire
    await new Promise(resolve => setTimeout(resolve, 2000));

    const cleaned = await reservationManager.cleanupExpiredReservations();
    console.log(`   Cleaned ${cleaned} expired reservations`);
    if (cleaned < 1) throw new Error('Expected at least 1 cleaned reservation');
    console.log('   ✅ PASSED\n');

    console.log('🎉 All tests passed!\n');

  } catch (error: any) {
    console.error('❌ Test failed:', error.message);
    throw error;
  } finally {
    // Cleanup
    console.log('🧹 Cleaning up test data...');
    await db`DELETE FROM audit_logs WHERE appointment_id IN (
      SELECT id FROM appointments WHERE business_id = ${testBusinessId}
    )`;
    await db`DELETE FROM appointments WHERE business_id = ${testBusinessId}`;
    await db`DELETE FROM reservations WHERE business_id = ${testBusinessId}`;
    await db`DELETE FROM services WHERE id = ${testServiceId}`;
    await db`DELETE FROM users WHERE id = ${testActorId}`;
    await db`DELETE FROM businesses WHERE id = ${testBusinessId}`;
    console.log('✅ Cleanup complete\n');
  }
}

// Run tests
testBookingFlow()
  .then(() => {
    console.log('✨ Booking system test completed successfully!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 Test suite failed:', error);
    process.exit(1);
  });