import { NextRequest, NextResponse } from 'next/server';
import { getDbClient } from '@/db/client';
import { ReservationManager } from '@/lib/booking';

const sql = getDbClient();

/**
 * Cron job to cleanup expired reservations
 * Should be called every 5 minutes via Vercel Cron or similar
 *
 * Authentication: Requires CRON_SECRET environment variable to match
 */
export async function GET(request: NextRequest) {
  // Verify cron secret
  const authHeader = request.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;

  if (!cronSecret) {
    console.error('[Cron] CRON_SECRET not configured');
    return NextResponse.json(
      { error: 'Cron job not configured' },
      { status: 500 }
    );
  }

  if (authHeader !== `Bearer ${cronSecret}`) {
    console.error('[Cron] Unauthorized cleanup attempt');
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 }
    );
  }

  const startTime = Date.now();

  try {
    const reservationManager = new ReservationManager(sql);
    const deletedCount = await reservationManager.cleanupExpiredReservations();

    const duration = Date.now() - startTime;

    console.log(`[Cron] Cleaned up ${deletedCount} expired reservations in ${duration}ms`);

    // Check if expired count is high (potential issue)
    if (deletedCount > 100) {
      console.warn(`[Cron] High expired reservation count: ${deletedCount} - investigate potential cleanup failures`);
    }

    // Update cleanup metrics in database
    await sql`
      INSERT INTO system_metrics (metric_name, metric_value, recorded_at)
      VALUES
        ('reservation_cleanup_count', ${deletedCount}, NOW()),
        ('reservation_cleanup_duration_ms', ${duration}, NOW())
      ON CONFLICT (metric_name, recorded_at) DO NOTHING
    `;

    return NextResponse.json({
      success: true,
      deletedCount,
      durationMs: duration,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('[Cron] Reservation cleanup failed:', error);

    // Log failure metric
    try {
      await sql`
        INSERT INTO system_metrics (metric_name, metric_value, recorded_at)
        VALUES ('reservation_cleanup_failure', 1, NOW())
      `;
    } catch (metricError) {
      console.error('[Cron] Failed to log cleanup failure metric:', metricError);
    }

    return NextResponse.json(
      { error: 'Cleanup failed', message: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

/**
 * Fallback cleanup trigger when reservation queries detect high expired count
 * This provides automatic cleanup even if cron job fails
 */
export async function POST(request: NextRequest) {
  // This endpoint can be called by internal services without auth
  // to trigger emergency cleanup
  const startTime = Date.now();

  try {
    const reservationManager = new ReservationManager(sql);

    // First check if cleanup is needed
    const expiredCount = await sql`
      SELECT COUNT(*) as count
      FROM reservations
      WHERE expires_at <= NOW()
    `;

    const count = Number(expiredCount[0]?.count || 0);

    // Only run if there are more than 50 expired reservations
    if (count < 50) {
      return NextResponse.json({
        success: true,
        message: 'Cleanup not needed',
        expiredCount: count
      });
    }

    console.warn(`[Cleanup] Fallback cleanup triggered - ${count} expired reservations found`);

    const deletedCount = await reservationManager.cleanupExpiredReservations();
    const duration = Date.now() - startTime;

    console.log(`[Cleanup] Fallback cleanup completed: ${deletedCount} deleted in ${duration}ms`);

    return NextResponse.json({
      success: true,
      deletedCount,
      durationMs: duration,
      trigger: 'fallback',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('[Cleanup] Fallback cleanup failed:', error);
    return NextResponse.json(
      { error: 'Fallback cleanup failed', message: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
