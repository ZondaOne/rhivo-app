import { NextRequest, NextResponse } from 'next/server';
import { getDbClient } from '@/db/client';

const sql = getDbClient();

/**
 * Health check endpoint for reservation system
 * Returns metrics about reservation status and cleanup health
 */
export async function GET(request: NextRequest) {
  try {
    // Get reservation counts
    const stats = await sql`
      SELECT
        COUNT(*) FILTER (WHERE expires_at > NOW()) as active_count,
        COUNT(*) FILTER (WHERE expires_at <= NOW()) as expired_count,
        COUNT(DISTINCT business_id) as businesses_with_reservations,
        MIN(expires_at) FILTER (WHERE expires_at <= NOW()) as oldest_expired_at,
        MAX(created_at) as last_reservation_at
      FROM reservations
    `;

    const stat = stats[0];
    const activeCount = Number(stat.active_count || 0);
    const expiredCount = Number(stat.expired_count || 0);
    const businessCount = Number(stat.businesses_with_reservations || 0);
    const oldestExpired = stat.oldest_expired_at;
    const lastReservation = stat.last_reservation_at;

    // Get last cleanup metrics
    const lastCleanup = await sql`
      SELECT metric_value, recorded_at
      FROM system_metrics
      WHERE metric_name = 'reservation_cleanup_count'
      ORDER BY recorded_at DESC
      LIMIT 1
    `;

    const lastCleanupTime = lastCleanup[0]?.recorded_at;
    const lastCleanupCount = Number(lastCleanup[0]?.metric_value || 0);

    // Calculate time since last cleanup
    const minutesSinceCleanup = lastCleanupTime
      ? Math.floor((Date.now() - new Date(lastCleanupTime).getTime()) / (60 * 1000))
      : null;

    // Determine health status
    let status = 'healthy';
    const warnings = [];

    if (expiredCount > 100) {
      status = 'warning';
      warnings.push(`High expired reservation count: ${expiredCount}`);
    }

    if (minutesSinceCleanup && minutesSinceCleanup > 15) {
      status = 'warning';
      warnings.push(`Cleanup job hasn't run in ${minutesSinceCleanup} minutes (expected every 5 minutes)`);
    }

    if (expiredCount > 500) {
      status = 'critical';
      warnings.push('CRITICAL: Expired reservation count exceeds 500 - cleanup job may be failing');
    }

    // Get average TTL distribution
    const ttlDistribution = await sql`
      SELECT
        AVG(EXTRACT(EPOCH FROM (expires_at - created_at)) / 60) as avg_ttl_minutes,
        MAX(EXTRACT(EPOCH FROM (expires_at - created_at)) / 60) as max_ttl_minutes
      FROM reservations
      WHERE expires_at > NOW()
    `;

    const avgTtl = Number(ttlDistribution[0]?.avg_ttl_minutes || 0);
    const maxTtl = Number(ttlDistribution[0]?.max_ttl_minutes || 0);

    // Get conversion rate (reservations committed to appointments)
    const conversionStats = await sql`
      SELECT
        COUNT(DISTINCT a.reservation_id) as committed_count,
        (SELECT COUNT(*) FROM reservations WHERE created_at > NOW() - INTERVAL '24 hours') as total_count
      FROM appointments a
      WHERE a.reservation_id IS NOT NULL
        AND a.created_at > NOW() - INTERVAL '24 hours'
    `;

    const committedCount = Number(conversionStats[0]?.committed_count || 0);
    const totalCount = Number(conversionStats[0]?.total_count || 0);
    const conversionRate = totalCount > 0 ? (committedCount / totalCount * 100).toFixed(1) : 'N/A';

    return NextResponse.json({
      status,
      warnings: warnings.length > 0 ? warnings : undefined,
      metrics: {
        active_reservations: activeCount,
        expired_reservations: expiredCount,
        businesses_with_reservations: businessCount,
        oldest_expired_at: oldestExpired,
        last_reservation_at: lastReservation,
        last_cleanup_at: lastCleanupTime,
        last_cleanup_count: lastCleanupCount,
        minutes_since_cleanup: minutesSinceCleanup,
        avg_ttl_minutes: Number(avgTtl.toFixed(1)),
        max_ttl_minutes: Number(maxTtl.toFixed(1)),
        conversion_rate_24h: conversionRate,
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('[Health] Reservation health check failed:', error);
    return NextResponse.json(
      {
        status: 'error',
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    );
  }
}
