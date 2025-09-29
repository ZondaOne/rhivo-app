/**
 * Concurrency tests for booking system
 *
 * These tests validate that the booking system prevents overbooking
 * under concurrent load and properly handles race conditions.
 */

import { ReservationManager, AppointmentManager } from '../index';
import { getDbClient } from '@/db/client';
import { v4 as uuidv4 } from 'uuid';

describe('Booking Concurrency', () => {
  const db = getDbClient();
  let testBusinessId: string;
  let testServiceId: string;

  beforeAll(async () => {
    // Setup test business and service with maxSimultaneousBookings = 2
    testBusinessId = uuidv4();
    testServiceId = uuidv4();

    await db`
      INSERT INTO businesses (id, subdomain, name, timezone, config_yaml_path, config_version, status)
      VALUES (${testBusinessId}, 'test-biz', 'Test Business', 'America/New_York', '/configs/test.yaml', 1, 'active')
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
  });

  afterAll(async () => {
    // Cleanup
    await db`DELETE FROM appointments WHERE business_id = ${testBusinessId}`;
    await db`DELETE FROM reservations WHERE business_id = ${testBusinessId}`;
    await db`DELETE FROM services WHERE id = ${testServiceId}`;
    await db`DELETE FROM businesses WHERE id = ${testBusinessId}`;
  });

  test('prevents overbooking under concurrent load', async () => {
    const reservationManager = new ReservationManager(db);
    const slotStart = new Date('2025-01-15T10:00:00Z');
    const slotEnd = new Date('2025-01-15T11:00:00Z');

    // Attempt 10 concurrent reservations for a slot with capacity 2
    const promises = Array.from({ length: 10 }, (_, i) =>
      reservationManager.createReservation({
        businessId: testBusinessId,
        serviceId: testServiceId,
        slotStart,
        slotEnd,
        idempotencyKey: `concurrent-test-${i}-${Date.now()}`
      }).catch(err => ({ error: err.message }))
    );

    const results = await Promise.all(promises);
    const successful = results.filter(r => !('error' in r)).length;

    // Should only allow 2 reservations (maxSimultaneousBookings)
    expect(successful).toBe(2);

    // Cleanup
    await db`DELETE FROM reservations WHERE business_id = ${testBusinessId}`;
  });

  test('idempotency: same key returns same reservation', async () => {
    const reservationManager = new ReservationManager(db);
    const idempotencyKey = `idempotent-test-${uuidv4()}`;
    const slotStart = new Date('2025-01-15T14:00:00Z');
    const slotEnd = new Date('2025-01-15T15:00:00Z');

    const res1 = await reservationManager.createReservation({
      businessId: testBusinessId,
      serviceId: testServiceId,
      slotStart,
      slotEnd,
      idempotencyKey
    });

    const res2 = await reservationManager.createReservation({
      businessId: testBusinessId,
      serviceId: testServiceId,
      slotStart,
      slotEnd,
      idempotencyKey
    });

    expect(res1.id).toBe(res2.id);
    expect(res1.idempotency_key).toBe(res2.idempotency_key);

    // Cleanup
    await db`DELETE FROM reservations WHERE id = ${res1.id}`;
  });

  test('optimistic locking detects concurrent updates', async () => {
    const appointmentManager = new AppointmentManager(db);

    // Create an appointment
    const appointment = await appointmentManager.createManualAppointment({
      businessId: testBusinessId,
      serviceId: testServiceId,
      slotStart: new Date('2025-01-15T16:00:00Z'),
      slotEnd: new Date('2025-01-15T17:00:00Z'),
      guestEmail: 'test@example.com',
      idempotencyKey: `manual-test-${uuidv4()}`,
      actorId: 'test-user'
    });

    // Two concurrent updates with same version
    const update1 = appointmentManager.updateAppointment({
      appointmentId: appointment.id,
      status: 'completed',
      expectedVersion: appointment.version,
      actorId: 'user1'
    });

    const update2 = appointmentManager.updateAppointment({
      appointmentId: appointment.id,
      status: 'canceled',
      expectedVersion: appointment.version,
      actorId: 'user2'
    });

    const results = await Promise.allSettled([update1, update2]);

    const fulfilled = results.filter(r => r.status === 'fulfilled').length;
    const rejected = results.filter(r => r.status === 'rejected').length;

    // One should succeed, one should fail
    expect(fulfilled).toBe(1);
    expect(rejected).toBe(1);

    // Check that rejected has CONFLICT code
    const conflictError = results.find(
      r => r.status === 'rejected' && (r.reason as any).code === 'CONFLICT'
    );
    expect(conflictError).toBeDefined();

    // Cleanup
    await db`DELETE FROM appointments WHERE id = ${appointment.id}`;
    await db`DELETE FROM audit_logs WHERE appointment_id = ${appointment.id}`;
  });

  test('expired reservations cannot be committed', async () => {
    const reservationManager = new ReservationManager(db);
    const appointmentManager = new AppointmentManager(db);

    const reservation = await reservationManager.createReservation({
      businessId: testBusinessId,
      serviceId: testServiceId,
      slotStart: new Date('2025-01-15T18:00:00Z'),
      slotEnd: new Date('2025-01-15T19:00:00Z'),
      idempotencyKey: `expiry-test-${uuidv4()}`,
      ttlMinutes: 0.05 // 3 seconds
    });

    // Wait for expiration
    await new Promise(resolve => setTimeout(resolve, 4000));

    // Attempt to commit should fail
    await expect(
      appointmentManager.commitReservation({
        reservationId: reservation.id,
        guestEmail: 'test@example.com'
      })
    ).rejects.toThrow(/expired|invalid/i);

    // Cleanup
    await db`DELETE FROM reservations WHERE id = ${reservation.id}`;
  });

  test('capacity calculation accounts for both reservations and appointments', async () => {
    const reservationManager = new ReservationManager(db);
    const appointmentManager = new AppointmentManager(db);
    const slotStart = new Date('2025-01-15T20:00:00Z');
    const slotEnd = new Date('2025-01-15T21:00:00Z');

    // Initial capacity should be 2
    const initialCapacity = await reservationManager.getAvailableCapacity(
      testBusinessId,
      testServiceId,
      slotStart,
      slotEnd
    );
    expect(initialCapacity).toBe(2);

    // Create 1 reservation
    const reservation = await reservationManager.createReservation({
      businessId: testBusinessId,
      serviceId: testServiceId,
      slotStart,
      slotEnd,
      idempotencyKey: `capacity-test-res-${uuidv4()}`
    });

    // Capacity should now be 1
    const afterReservation = await reservationManager.getAvailableCapacity(
      testBusinessId,
      testServiceId,
      slotStart,
      slotEnd
    );
    expect(afterReservation).toBe(1);

    // Create 1 appointment
    const appointment = await appointmentManager.createManualAppointment({
      businessId: testBusinessId,
      serviceId: testServiceId,
      slotStart,
      slotEnd,
      guestEmail: 'capacity-test@example.com',
      idempotencyKey: `capacity-test-appt-${uuidv4()}`,
      actorId: 'test-user'
    });

    // Capacity should now be 0
    const afterAppointment = await reservationManager.getAvailableCapacity(
      testBusinessId,
      testServiceId,
      slotStart,
      slotEnd
    );
    expect(afterAppointment).toBe(0);

    // Cleanup
    await db`DELETE FROM reservations WHERE id = ${reservation.id}`;
    await db`DELETE FROM appointments WHERE id = ${appointment.id}`;
    await db`DELETE FROM audit_logs WHERE appointment_id = ${appointment.id}`;
  });
});