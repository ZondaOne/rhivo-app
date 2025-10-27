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
  maxSimultaneousBookings: number; // YAML config capacity (single source of truth)
}

export interface ReservationValidationResult {
  isValid: boolean;
  reason?: string;
  reservation?: Reservation;
}

export class ReservationManager {
  constructor(private db: DbClient) {}

  /**
   * Creates a reservation with atomic capacity checking using advisory locks.
   * This method ensures that the reservation respects the maxSimultaneousBookings
   * constraint by using database-level checks AND PostgreSQL advisory locks
   * to prevent race conditions.
   *
   * IMPORTANT: maxSimultaneousBookings MUST come from YAML config (single source of truth),
   * NOT from the database. This ensures consistency between slot generation and reservation logic.
   *
   * CRITICAL: Advisory locks serialize concurrent reservation attempts for the same time slot,
   * eliminating the time-of-check-to-time-of-use (TOCTOU) race condition.
   */
  async createReservation(params: CreateReservationParams): Promise<Reservation> {
    const {
      businessId,
      serviceId,
      slotStart,
      slotEnd,
      idempotencyKey,
      ttlMinutes = 15,
      maxSimultaneousBookings
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

    // Generate deterministic lock key for this slot
    // Combines business_id, service_id, and slot_start to create unique int8 lock
    const lockKey = this.generateAdvisoryLockKey(businessId, serviceId, slotStart);

    try {
      // Atomic reservation creation with advisory lock to prevent TOCTOU race conditions
      // The lock is acquired first, then capacity is checked, then insertion happens
      // All within the transaction scope - lock is released automatically at transaction end
      const result = await this.db`
        WITH slot_lock AS (
          -- Acquire advisory lock for this specific slot
          -- This serializes all concurrent reservation attempts for the same slot
          SELECT pg_advisory_xact_lock(${lockKey})
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
        FROM slot_lock, overlapping_count
        WHERE overlapping_count.count < ${maxSimultaneousBookings}
        RETURNING *
      `;

      if (result.length === 0) {
        throw new Error('SLOT_UNAVAILABLE');
      }

      return result[0] as Reservation;
    } catch (error: unknown) {
      const err = error as { message?: string; code?: string };
      // Check if it's a capacity error
      if (err.message === 'SLOT_UNAVAILABLE') {
        throw new Error('The selected time slot is no longer available');
      }

      // Check for duplicate idempotency key race condition
      if (err.code === '23505') {
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
   * Generate a deterministic advisory lock key for a time slot.
   * Combines business_id, service_id, and slot_start into a unique int8.
   *
   * Uses a simple hash function that creates a 64-bit integer suitable
   * for pg_advisory_xact_lock.
   */
  private generateAdvisoryLockKey(businessId: string, serviceId: string, slotStart: Date): bigint {
    // Convert UUIDs and timestamp to a deterministic hash
    // We use the first 8 bytes of business_id + first 8 bytes of service_id + timestamp
    const businessHash = this.hashUuid(businessId);
    const serviceHash = this.hashUuid(serviceId);
    const timeHash = BigInt(Math.floor(slotStart.getTime() / 1000)); // Unix timestamp in seconds

    // Combine hashes using bitwise operations
    // This creates a unique lock key for each business + service + time slot combination
    const maxInt64 = BigInt('0x7FFFFFFFFFFFFFFF'); // Max positive int8 (63 bits)
    return (businessHash ^ serviceHash ^ timeHash) & maxInt64;
  }

  /**
   * Hash a UUID string into a bigint for lock key generation
   */
  private hashUuid(uuid: string): bigint {
    // Remove hyphens and take first 16 hex characters (8 bytes)
    const hex = uuid.replace(/-/g, '').substring(0, 16);
    return BigInt('0x' + hex);
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
   *
   * IMPORTANT: maxSimultaneousBookings MUST come from YAML config (single source of truth),
   * NOT from the database. This ensures consistency between slot generation and reservation logic.
   */
  async getAvailableCapacity(
    businessId: string,
    serviceId: string,
    slotStart: Date,
    slotEnd: Date,
    maxSimultaneousBookings: number
  ): Promise<number> {
    const result = await this.db`
      WITH occupied_count AS (
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
          ${maxSimultaneousBookings} - occupied_count.count,
          0
        ) as available
      FROM occupied_count
    `;

    return result[0]?.available ?? 0;
  }
}