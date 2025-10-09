import { DbClient, withTransaction } from '../../db/client';
import { Appointment, AppointmentStatus } from '../../db/types';
import { ReservationManager } from './reservation-manager';
import { v4 as uuidv4 } from 'uuid';
import { generateBookingId } from '../booking/id';

export interface CommitReservationParams {
  reservationId: string;
  bookingId: string;
  customerId?: string;
  guestEmail?: string;
  guestPhone?: string;
  guestName?: string;
  cancellationToken?: string;
}

export interface CreateManualAppointmentParams {
  businessId: string;
  serviceId: string;
  slotStart: Date;
  slotEnd: Date;
  customerId?: string;
  guestEmail?: string;
  guestPhone?: string;
  idempotencyKey: string;
  actorId: string;
}

export interface UpdateAppointmentParams {
  appointmentId: string;
  slotStart?: Date;
  slotEnd?: Date;
  serviceId?: string;
  status?: AppointmentStatus;
  actorId: string;
  expectedVersion: number;
}

export interface AppointmentConflictError extends Error {
  code: 'CONFLICT';
  currentVersion: number;
}

export class AppointmentManager {
  private reservationManager: ReservationManager;

  constructor(private db: DbClient) {
    this.reservationManager = new ReservationManager(db);
  }

  /**
   * Commits a reservation to an appointment in a single transaction.
   * This is the primary booking flow for customers.
   */
  async commitReservation(params: CommitReservationParams): Promise<Appointment> {
    const {
      reservationId,
      bookingId,
      customerId,
      guestEmail,
      guestPhone,
      guestName,
      cancellationToken
    } = params;

    return withTransaction(async (txDb) => {
      // Validate reservation still exists and is not expired
      const validation = await new ReservationManager(txDb).validateReservation(reservationId);

      if (!validation.isValid) {
        throw new Error(validation.reason || 'Reservation invalid');
      }

      const reservation = validation.reservation!;
      const appointmentId = uuidv4();

      // Create appointment from reservation
      const appointmentResult = await txDb`
        INSERT INTO appointments (
          id,
          booking_id,
          business_id,
          service_id,
          customer_id,
          guest_email,
          guest_phone,
          guest_name,
          slot_start,
          slot_end,
          status,
          idempotency_key,
          reservation_id,
          cancellation_token,
          version,
          created_at,
          updated_at
        ) VALUES (
          ${appointmentId},
          ${bookingId},
          ${reservation.business_id},
          ${reservation.service_id},
          ${customerId || null},
          ${guestEmail || null},
          ${guestPhone || null},
          ${guestName || null},
          ${reservation.slot_start},
          ${reservation.slot_end},
          'confirmed',
          ${reservation.idempotency_key},
          ${reservationId},
          ${cancellationToken || null},
          1,
          NOW(),
          NOW()
        )
        RETURNING *
      `;

      const appointment = appointmentResult[0] as Appointment;

      // Create audit log entry
      await txDb`
        INSERT INTO audit_logs (
          id,
          appointment_id,
          actor_id,
          action,
          old_state,
          new_state,
          timestamp
        ) VALUES (
          ${uuidv4()},
          ${appointmentId},
          ${customerId || null},
          'created',
          NULL,
          ${JSON.stringify(appointment)},
          NOW()
        )
      `;

      // Delete the reservation to free up the slot
      await txDb`
        DELETE FROM reservations
        WHERE id = ${reservationId}
      `;

      return appointment;
    });
  }

  /**
   * Creates a manual appointment directly (for owner/staff use).
   * This bypasses the reservation system and requires appropriate permissions.
   */
  async createManualAppointment(params: CreateManualAppointmentParams): Promise<Appointment> {
    const {
      businessId,
      serviceId,
      slotStart,
      slotEnd,
      customerId,
      guestEmail,
      guestPhone,
      idempotencyKey,
      actorId
    } = params;

    // Check for existing appointment with same idempotency key
    const existing = await this.db`
      SELECT * FROM appointments
      WHERE idempotency_key = ${idempotencyKey}
        AND deleted_at IS NULL
      LIMIT 1
    `;

    if (existing.length > 0) {
      return existing[0] as Appointment;
    }

    return withTransaction(async (txDb) => {
      // Check capacity before creating
      const capacity = await new ReservationManager(txDb).getAvailableCapacity(
        businessId,
        serviceId,
        slotStart,
        slotEnd
      );

      if (capacity < 1) {
        throw new Error('No available capacity for this time slot');
      }

      const appointmentId = uuidv4();
      const bookingId = generateBookingId();

      const result = await txDb`
        INSERT INTO appointments (
          id,
          booking_id,
          business_id,
          service_id,
          customer_id,
          guest_email,
          guest_phone,
          slot_start,
          slot_end,
          status,
          idempotency_key,
          reservation_id,
          cancellation_token,
          version,
          created_at,
          updated_at
        ) VALUES (
          ${appointmentId},
          ${bookingId},
          ${businessId},
          ${serviceId},
          ${customerId || null},
          ${guestEmail || null},
          ${guestPhone || null},
          ${slotStart},
          ${slotEnd},
          'confirmed',
          ${idempotencyKey},
          NULL,
          NULL,
          1,
          NOW(),
          NOW()
        )
        RETURNING *
      `;

      const appointment = result[0] as Appointment;

      // Create audit log
      await txDb`
        INSERT INTO audit_logs (
          id,
          appointment_id,
          actor_id,
          action,
          old_state,
          new_state,
          timestamp
        ) VALUES (
          ${uuidv4()},
          ${appointmentId},
          ${actorId},
          'created',
          NULL,
          ${JSON.stringify(appointment)},
          NOW()
        )
      `;

      return appointment;
    });
  }

  /**
   * Updates an appointment with optimistic locking to prevent conflicts.
   * Uses version field to detect concurrent modifications.
   */
  async updateAppointment(params: UpdateAppointmentParams): Promise<Appointment> {
    const {
      appointmentId,
      slotStart,
      slotEnd,
      serviceId,
      status,
      actorId,
      expectedVersion
    } = params;

    return withTransaction(async (txDb) => {
      // Get current appointment
      const current = await txDb`
        SELECT * FROM appointments
        WHERE id = ${appointmentId}
          AND deleted_at IS NULL
        FOR UPDATE
      `;

      if (current.length === 0) {
        throw new Error('Appointment not found');
      }

      const currentAppointment = current[0] as Appointment;

      // Check version for optimistic locking
      if (currentAppointment.version !== expectedVersion) {
        const error = new Error('Appointment has been modified by another user') as AppointmentConflictError;
        error.code = 'CONFLICT';
        error.currentVersion = currentAppointment.version;
        throw error;
      }

      // If updating time slot or service, check capacity
      if (slotStart || slotEnd || serviceId) {
        const newStart = slotStart || currentAppointment.slot_start;
        const newEnd = slotEnd || currentAppointment.slot_end;
        const newServiceId = serviceId || currentAppointment.service_id;

        // Temporarily exclude current appointment from capacity check
        const capacity = await txDb`
          WITH service_capacity AS (
            SELECT max_simultaneous_bookings
            FROM services
            WHERE id = ${newServiceId}
              AND business_id = ${currentAppointment.business_id}
              AND deleted_at IS NULL
          ),
          occupied_count AS (
            SELECT COUNT(*) as count
            FROM (
              SELECT 1
              FROM appointments
              WHERE business_id = ${currentAppointment.business_id}
                AND service_id = ${newServiceId}
                AND id != ${appointmentId}
                AND deleted_at IS NULL
                AND status = 'confirmed'
                AND slot_start < ${newEnd}
                AND slot_end > ${newStart}

              UNION ALL

              SELECT 1
              FROM reservations
              WHERE business_id = ${currentAppointment.business_id}
                AND service_id = ${newServiceId}
                AND expires_at > NOW()
                AND slot_start < ${newEnd}
                AND slot_end > ${newStart}
            ) AS overlapping_bookings
          )
          SELECT
            GREATEST(
              service_capacity.max_simultaneous_bookings - occupied_count.count,
              0
            ) as available
          FROM service_capacity, occupied_count
        `;

        if (capacity[0]?.available < 1) {
          throw new Error('No available capacity for the new time slot');
        }
      }

      // Update appointment
      const updateResult = await txDb`
        UPDATE appointments
        SET
          slot_start = COALESCE(${slotStart || null}, slot_start),
          slot_end = COALESCE(${slotEnd || null}, slot_end),
          service_id = COALESCE(${serviceId || null}, service_id),
          status = COALESCE(${status || null}, status),
          version = version + 1,
          updated_at = NOW()
        WHERE id = ${appointmentId}
          AND version = ${expectedVersion}
        RETURNING *
      `;

      if (updateResult.length === 0) {
        const error = new Error('Failed to update appointment due to concurrent modification') as AppointmentConflictError;
        error.code = 'CONFLICT';
        throw error;
      }

      const updatedAppointment = updateResult[0] as Appointment;

      // Create audit log
      await txDb`
        INSERT INTO audit_logs (
          id,
          appointment_id,
          actor_id,
          action,
          old_state,
          new_state,
          timestamp
        ) VALUES (
          ${uuidv4()},
          ${appointmentId},
          ${actorId},
          'modified',
          ${JSON.stringify(currentAppointment)},
          ${JSON.stringify(updatedAppointment)},
          NOW()
        )
      `;

      return updatedAppointment;
    });
  }

  /**
   * Cancels an appointment (soft delete with audit trail)
   */
  async cancelAppointment(appointmentId: string, actorId: string): Promise<void> {
    return withTransaction(async (txDb) => {
      const current = await txDb`
        SELECT * FROM appointments
        WHERE id = ${appointmentId}
          AND deleted_at IS NULL
        FOR UPDATE
      `;

      if (current.length === 0) {
        throw new Error('Appointment not found');
      }

      const currentAppointment = current[0] as Appointment;

      await txDb`
        UPDATE appointments
        SET
          status = 'canceled',
          deleted_at = NOW(),
          updated_at = NOW()
        WHERE id = ${appointmentId}
      `;

      await txDb`
        INSERT INTO audit_logs (
          id,
          appointment_id,
          actor_id,
          action,
          old_state,
          new_state,
          timestamp
        ) VALUES (
          ${uuidv4()},
          ${appointmentId},
          ${actorId || null},
          'canceled',
          ${JSON.stringify(currentAppointment)},
          ${JSON.stringify({ ...currentAppointment, status: 'canceled', deleted_at: new Date() })},
          NOW()
        )
      `;
    });
  }

  /**
   * Get appointment by ID
   */
  async getAppointment(appointmentId: string): Promise<Appointment | null> {
    const result = await this.db`
      SELECT * FROM appointments
      WHERE id = ${appointmentId}
        AND deleted_at IS NULL
      LIMIT 1
    `;

    return result.length > 0 ? (result[0] as Appointment) : null;
  }

  /**
   * List appointments for a business with filters
   */
  async listAppointments(
    businessId: string,
    filters?: {
      serviceId?: string;
      status?: AppointmentStatus;
      startDate?: Date;
      endDate?: Date;
    }
  ): Promise<Appointment[]> {
    const { serviceId, status, startDate, endDate } = filters || {};

    const result = await this.db`
      SELECT * FROM appointments
      WHERE business_id = ${businessId}
        AND deleted_at IS NULL
        ${serviceId ? this.db`AND service_id = ${serviceId}` : this.db``}
        ${status ? this.db`AND status = ${status}` : this.db``}
        ${startDate ? this.db`AND slot_start >= ${startDate}` : this.db``}
        ${endDate ? this.db`AND slot_end <= ${endDate}` : this.db``}
      ORDER BY slot_start ASC
    `;

    return result as Appointment[];
  }
}