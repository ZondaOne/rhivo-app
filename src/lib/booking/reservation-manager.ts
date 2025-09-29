import { DbClient } from '../../db/client';
import { Reservation } from '../../db/types';
import { v4 as uuidv4 } from 'uuid';

export interface CreateReservationParams {
  businessId: string;
  serviceId: string;
  slotStart: Date;
  slotEnd: Date;
  idempotencyKey: string;
  ttlMinutes?: number;
}

export interface ReservationValidationResult {
  isValid: boolean;
  reason?: string;
  reservation?: Reservation;
}

export class ReservationManager {
  constructor(private db: DbClient) {}

  /**
   * Creates a reservation with atomic capacity checking.
   * This method ensures that the reservation respects the maxSimultaneousBookings
   * constraint by using database-level checks.
   */
  async createReservation(params: CreateReservationParams): Promise<Reservation> {
    const {
      businessId,
      serviceId,
      slotStart,
      slotEnd,
      idempotencyKey,
      ttlMinutes = 15
    } = params;

    // Check for existing reservation with same idempotency key
    const existingReservation = await this.db`
      SELECT * FROM reservations
      WHERE idempotency_key = ${idempotencyKey}
        AND expires_at > NOW()
      LIMIT 1
    `;

    if (existingReservation.length > 0) {
      return existingReservation[0] as Reservation;
    }

    const reservationId = uuidv4();
    const expiresAt = new Date(Date.now() + ttlMinutes * 60 * 1000);

    try {
      // Atomic reservation creation with capacity check
      // This query will fail if creating the reservation would exceed capacity
      const result = await this.db`
        WITH service_capacity AS (
          SELECT max_simultaneous_bookings
          FROM services
          WHERE id = ${serviceId}
            AND business_id = ${businessId}
            AND deleted_at IS NULL
        ),
        overlapping_count AS (
          SELECT COUNT(*) as count
          FROM (
            -- Count confirmed appointments in the slot
            SELECT 1
            FROM appointments
            WHERE business_id = ${businessId}
              AND service_id = ${serviceId}
              AND deleted_at IS NULL
              AND status = 'confirmed'
              AND slot_start < ${slotEnd}
              AND slot_end > ${slotStart}

            UNION ALL

            -- Count active reservations in the slot
            SELECT 1
            FROM reservations
            WHERE business_id = ${businessId}
              AND service_id = ${serviceId}
              AND expires_at > NOW()
              AND slot_start < ${slotEnd}
              AND slot_end > ${slotStart}
          ) AS overlapping_bookings
        )
        INSERT INTO reservations (
          id,
          business_id,
          service_id,
          slot_start,
          slot_end,
          idempotency_key,
          expires_at,
          created_at
        )
        SELECT
          ${reservationId},
          ${businessId},
          ${serviceId},
          ${slotStart},
          ${slotEnd},
          ${idempotencyKey},
          ${expiresAt},
          NOW()
        FROM service_capacity, overlapping_count
        WHERE overlapping_count.count < service_capacity.max_simultaneous_bookings
        RETURNING *
      `;

      if (result.length === 0) {
        throw new Error('SLOT_UNAVAILABLE');
      }

      return result[0] as Reservation;
    } catch (error: any) {
      // Check if it's a capacity error
      if (error.message === 'SLOT_UNAVAILABLE') {
        throw new Error('The selected time slot is no longer available');
      }

      // Check for duplicate idempotency key race condition
      if (error.code === '23505') {
        const retryReservation = await this.db`
          SELECT * FROM reservations
          WHERE idempotency_key = ${idempotencyKey}
            AND expires_at > NOW()
          LIMIT 1
        `;

        if (retryReservation.length > 0) {
          return retryReservation[0] as Reservation;
        }
      }

      throw error;
    }
  }

  /**
   * Validates that a reservation exists and is still valid
   */
  async validateReservation(reservationId: string): Promise<ReservationValidationResult> {
    const result = await this.db`
      SELECT * FROM reservations
      WHERE id = ${reservationId}
        AND expires_at > NOW()
      LIMIT 1
    `;

    if (result.length === 0) {
      return {
        isValid: false,
        reason: 'Reservation not found or expired'
      };
    }

    return {
      isValid: true,
      reservation: result[0] as Reservation
    };
  }

  /**
   * Extends the TTL of an existing reservation
   */
  async extendReservation(reservationId: string, additionalMinutes: number): Promise<void> {
    const result = await this.db`
      UPDATE reservations
      SET expires_at = expires_at + INTERVAL '${additionalMinutes} minutes'
      WHERE id = ${reservationId}
        AND expires_at > NOW()
      RETURNING id
    `;

    if (result.length === 0) {
      throw new Error('Reservation not found or already expired');
    }
  }

  /**
   * Deletes a reservation (used when converting to appointment or on user cancellation)
   */
  async deleteReservation(reservationId: string): Promise<void> {
    await this.db`
      DELETE FROM reservations
      WHERE id = ${reservationId}
    `;
  }

  /**
   * Cleanup expired reservations
   * Should be called periodically by a background job
   */
  async cleanupExpiredReservations(): Promise<number> {
    const result = await this.db`
      DELETE FROM reservations
      WHERE expires_at <= NOW()
      RETURNING id
    `;

    return result.length;
  }

  /**
   * Get available capacity for a specific time slot
   */
  async getAvailableCapacity(
    businessId: string,
    serviceId: string,
    slotStart: Date,
    slotEnd: Date
  ): Promise<number> {
    const result = await this.db`
      WITH service_capacity AS (
        SELECT max_simultaneous_bookings
        FROM services
        WHERE id = ${serviceId}
          AND business_id = ${businessId}
          AND deleted_at IS NULL
      ),
      occupied_count AS (
        SELECT COUNT(*) as count
        FROM (
          -- Count confirmed appointments
          SELECT 1
          FROM appointments
          WHERE business_id = ${businessId}
            AND service_id = ${serviceId}
            AND deleted_at IS NULL
            AND status = 'confirmed'
            AND slot_start < ${slotEnd}
            AND slot_end > ${slotStart}

          UNION ALL

          -- Count active reservations
          SELECT 1
          FROM reservations
          WHERE business_id = ${businessId}
            AND service_id = ${serviceId}
            AND expires_at > NOW()
            AND slot_start < ${slotEnd}
            AND slot_end > ${slotStart}
        ) AS overlapping_bookings
      )
      SELECT
        GREATEST(
          service_capacity.max_simultaneous_bookings - occupied_count.count,
          0
        ) as available
      FROM service_capacity, occupied_count
    `;

    return result[0]?.available ?? 0;
  }
}