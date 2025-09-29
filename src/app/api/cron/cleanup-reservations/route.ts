import { NextRequest, NextResponse } from 'next/server';
import { cleanupExpiredReservations, checkReservationHealth } from '../../../../lib/booking';

/**
 * Cron endpoint for cleaning up expired reservations.
 * Should be called every 1-5 minutes by a scheduler (e.g., Vercel Cron, AWS EventBridge).
 *
 * Example cron configuration (vercel.json):
 * {
 *   "crons": [{
 *     "path": "/api/cron/cleanup-reservations",
 *     "schedule": "*/5 * * * *"
 *   }]
 * }
 */
export async function GET(request: NextRequest) {
  try {
    // Verify cron secret to prevent unauthorized access
    const authHeader = request.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;

    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Run cleanup
    const cleanupResult = await cleanupExpiredReservations();

    // Check system health
    const health = await checkReservationHealth();

    return NextResponse.json({
      success: true,
      cleaned: cleanupResult.cleaned,
      timestamp: cleanupResult.timestamp,
      health: {
        healthy: health.healthy,
        issues: health.issues
      }
    });
  } catch (error: any) {
    console.error('Cleanup job error:', error);
    return NextResponse.json(
      { success: false, error: 'Cleanup job failed', message: error.message },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  return GET(request);
}