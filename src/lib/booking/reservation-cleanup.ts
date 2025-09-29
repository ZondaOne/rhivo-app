import { getDbClient } from '../../db/client';
import { ReservationManager } from './reservation-manager';

/**
 * Cleanup job for expired reservations.
 * Should be run periodically (e.g., every 1-5 minutes) via cron or scheduled job.
 */
export async function cleanupExpiredReservations(): Promise<{
  cleaned: number;
  timestamp: Date;
}> {
  const db = getDbClient();
  const manager = new ReservationManager(db);

  const cleaned = await manager.cleanupExpiredReservations();

  return {
    cleaned,
    timestamp: new Date()
  };
}

/**
 * Get metrics about reservation system health
 */
export async function getReservationMetrics() {
  const db = getDbClient();

  const metrics = await db`
    SELECT
      COUNT(*) FILTER (WHERE expires_at > NOW()) as active_reservations,
      COUNT(*) FILTER (WHERE expires_at <= NOW()) as expired_reservations,
      PERCENTILE_CONT(0.5) WITHIN GROUP (
        ORDER BY EXTRACT(EPOCH FROM (expires_at - created_at))
      ) as median_ttl_seconds,
      MIN(created_at) FILTER (WHERE expires_at > NOW()) as oldest_active_reservation
    FROM reservations
  `;

  return metrics[0];
}

/**
 * Alert if there are too many expired reservations (indicates cleanup job may not be running)
 */
export async function checkReservationHealth(): Promise<{
  healthy: boolean;
  issues: string[];
}> {
  const metrics = await getReservationMetrics();
  const issues: string[] = [];

  // Alert if expired reservations exceed threshold
  if (metrics.expired_reservations > 100) {
    issues.push(
      `High number of expired reservations: ${metrics.expired_reservations}. Cleanup job may not be running.`
    );
  }

  // Alert if oldest active reservation is too old
  if (metrics.oldest_active_reservation) {
    const oldestAge = Date.now() - new Date(metrics.oldest_active_reservation).getTime();
    const maxAgeMinutes = 30;

    if (oldestAge > maxAgeMinutes * 60 * 1000) {
      issues.push(
        `Oldest active reservation is ${Math.floor(oldestAge / 60000)} minutes old (max expected: ${maxAgeMinutes} minutes)`
      );
    }
  }

  return {
    healthy: issues.length === 0,
    issues
  };
}