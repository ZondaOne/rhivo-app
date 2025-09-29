/**
 * Booking Transaction & Concurrency Module
 *
 * This module implements the booking flow with proper concurrency controls:
 *
 * 1. Reservation Phase:
 *    - Client creates a short-lived reservation (15min TTL by default)
 *    - Atomic capacity checking ensures no overbooking
 *    - Idempotency keys prevent duplicate reservations on retry
 *
 * 2. Commit Phase:
 *    - Client converts reservation to confirmed appointment
 *    - Transaction ensures reservation is valid and not expired
 *    - Audit trail created automatically
 *
 * 3. Concurrency Controls:
 *    - Database-level capacity constraints
 *    - Optimistic locking (version field) for updates
 *    - Idempotency keys for safe retries
 *    - TTL-based reservation expiry
 *
 * 4. Cleanup:
 *    - Background job removes expired reservations
 *    - Health monitoring for reservation system
 */

export { ReservationManager } from './reservation-manager';
export type { CreateReservationParams, ReservationValidationResult } from './reservation-manager';

export { AppointmentManager } from './appointment-manager';
export type {
  CommitReservationParams,
  CreateManualAppointmentParams,
  UpdateAppointmentParams,
  AppointmentConflictError
} from './appointment-manager';

export {
  cleanupExpiredReservations,
  getReservationMetrics,
  checkReservationHealth
} from './reservation-cleanup';