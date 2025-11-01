import { NextRequest, NextResponse } from 'next/server';
import { getDbClient } from '@/db/client';

/**
 * Main health check endpoint for uptime monitoring
 * Used by BetterUptime and other monitoring services
 *
 * Returns:
 * - 200 OK: All systems operational
 * - 503 Service Unavailable: Critical system failure
 */
export async function GET(request: NextRequest) {
  const startTime = Date.now();
  const checks: Record<string, { status: 'healthy' | 'unhealthy' | 'degraded', responseTime?: number, error?: string }> = {};

  // 1. Database connectivity check
  try {
    const dbStart = Date.now();
    const sql = getDbClient();
    const result = await sql`SELECT 1 as health_check`;
    const dbTime = Date.now() - dbStart;

    if (result.length > 0) {
      checks.database = {
        status: dbTime < 1000 ? 'healthy' : 'degraded',
        responseTime: dbTime,
      };
    } else {
      checks.database = { status: 'unhealthy', error: 'No response from database' };
    }
  } catch (error) {
    checks.database = {
      status: 'unhealthy',
      error: error instanceof Error ? error.message : 'Database connection failed',
    };
  }

  // 2. Database pool status (check active connections)
  try {
    const sql = getDbClient();
    const poolStats = await sql`
      SELECT
        count(*) as total_connections,
        count(*) FILTER (WHERE state = 'active') as active_connections,
        count(*) FILTER (WHERE state = 'idle') as idle_connections
      FROM pg_stat_activity
      WHERE datname = current_database()
    `;

    const stats = poolStats[0];
    const totalConnections = Number(stats.total_connections);
    const activeConnections = Number(stats.active_connections);

    // Neon free tier has 100 connection limit
    const isHealthy = totalConnections < 80;
    checks.database_pool = {
      status: isHealthy ? 'healthy' : 'degraded',
      responseTime: Number(stats.total_connections),
    };
  } catch (error) {
    // Pool check is non-critical
    checks.database_pool = {
      status: 'degraded',
      error: 'Could not check pool status',
    };
  }

  // 3. Check for stuck reservations (data integrity)
  try {
    const sql = getDbClient();
    const expiredReservations = await sql`
      SELECT COUNT(*) as expired_count
      FROM reservations
      WHERE expires_at <= NOW()
    `;

    const expiredCount = Number(expiredReservations[0].expired_count);
    checks.reservation_cleanup = {
      status: expiredCount < 100 ? 'healthy' : (expiredCount < 500 ? 'degraded' : 'unhealthy'),
      responseTime: expiredCount,
    };
  } catch (error) {
    checks.reservation_cleanup = {
      status: 'degraded',
      error: 'Could not check reservations',
    };
  }

  // Determine overall status
  const hasUnhealthy = Object.values(checks).some(check => check.status === 'unhealthy');
  const hasDegraded = Object.values(checks).some(check => check.status === 'degraded');

  let overallStatus: 'healthy' | 'degraded' | 'unhealthy';
  if (hasUnhealthy) {
    overallStatus = 'unhealthy';
  } else if (hasDegraded) {
    overallStatus = 'degraded';
  } else {
    overallStatus = 'healthy';
  }

  const totalTime = Date.now() - startTime;

  const response = {
    status: overallStatus,
    timestamp: new Date().toISOString(),
    responseTime: totalTime,
    checks,
  };

  // Return appropriate HTTP status
  if (overallStatus === 'unhealthy') {
    return NextResponse.json(response, { status: 503 });
  }

  return NextResponse.json(response, { status: 200 });
}
