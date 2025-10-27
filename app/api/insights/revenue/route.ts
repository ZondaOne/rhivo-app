import { NextRequest, NextResponse } from 'next/server';
import { getDbClient } from '@/db/client';
import { verifyToken } from '@/lib/auth';
import { requireBusinessOwnership } from '@/lib/auth/verify-ownership';

export async function GET(request: NextRequest) {
  try {
    // Verify authentication
    const token = request.headers.get('authorization')?.replace('Bearer ', '').trim();
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    let payload: ReturnType<typeof verifyToken>;
    try {
      payload = verifyToken(token);
    } catch {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (payload.role !== 'owner' || !payload.business_id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const searchParams = request.nextUrl.searchParams;
    const businessId = searchParams.get('businessId');
    const timeRange = searchParams.get('timeRange') || '30d';

    if (!businessId) {
      return NextResponse.json(
        { error: 'Business ID is required' },
        { status: 400 }
      );
    }

    const sql = getDbClient();

    // CRITICAL: Verify user owns this business before querying data
    const unauthorizedResponse = await requireBusinessOwnership(sql, payload.sub, businessId);
    if (unauthorizedResponse) return unauthorizedResponse;

    // Calculate date range
    const now = new Date();
    const daysMap = { '7d': 7, '30d': 30, '90d': 90 };
    const days = daysMap[timeRange as keyof typeof daysMap] || 30;
    const startDate = new Date(now);
    startDate.setDate(startDate.getDate() - days);

    // Fetch revenue data grouped by date
    const revenueData = await sql`
      SELECT
        DATE(a.slot_start AT TIME ZONE 'UTC') as date,
        COALESCE(SUM(s.price_cents), 0) as revenue,
        COUNT(*) as booking_count
      FROM appointments a
      LEFT JOIN services s ON a.service_id = s.id
      WHERE a.business_id = ${businessId}
        AND a.slot_start >= ${startDate.toISOString()}
        AND a.slot_start <= ${now.toISOString()}
        AND a.status IN ('confirmed', 'completed')
        AND a.deleted_at IS NULL
      GROUP BY DATE(a.slot_start AT TIME ZONE 'UTC')
      ORDER BY date ASC
    `;

    // Generate all dates in range (to show days with 0 revenue)
    const dateMap = new Map<string, { revenue: number; count: number }>();
    for (let d = new Date(startDate); d <= now; d.setDate(d.getDate() + 1)) {
      const dateStr = d.toISOString().split('T')[0];
      dateMap.set(dateStr, { revenue: 0, count: 0 });
    }

    // Fill in actual revenue data
    let totalRevenue = 0;
    let totalBookings = 0;

    revenueData.forEach((row: { date: string; revenue: string; booking_count: string }) => {
      const dateStr = row.date;
      const revenue = parseFloat(row.revenue) || 0;
      const count = parseInt(row.booking_count, 10);

      dateMap.set(dateStr, { revenue, count });
      totalRevenue += revenue;
      totalBookings += count;
    });

    // Convert map to array for chart
    const chartData = Array.from(dateMap.entries()).map(([date, data]) => ({
      date,
      revenue: data.revenue,
      count: data.count
    }));

    // Calculate average booking value
    const averageBookingValue = totalBookings > 0 ? totalRevenue / totalBookings : 0;

    const stats = {
      totalRevenue: totalRevenue / 100, // Convert cents to dollars
      totalBookings,
      averageBookingValue: averageBookingValue / 100 // Convert cents to dollars
    };

    return NextResponse.json({
      chartData: chartData.map(d => ({
        ...d,
        revenue: d.revenue / 100 // Convert cents to dollars for chart
      })),
      stats
    });
  } catch (error) {
    console.error('Revenue insights API error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch revenue data' },
      { status: 500 }
    );
  }
}
