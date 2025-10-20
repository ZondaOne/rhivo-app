import { NextRequest, NextResponse } from 'next/server';
import { getDbClient } from '@/db/client';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const businessId = searchParams.get('businessId');
    const timeRange = searchParams.get('timeRange') || '30d';

    if (!businessId) {
      return NextResponse.json(
        { error: 'Business ID is required' },
        { status: 400 }
      );
    }

    // Calculate date range
    const now = new Date();
    const daysMap = { '7d': 7, '30d': 30, '90d': 90 };
    const days = daysMap[timeRange as keyof typeof daysMap] || 30;
    const startDate = new Date(now);
    startDate.setDate(startDate.getDate() - days);

    const sql = getDbClient();

    // Fetch appointments for the time range
    const appointments = await sql`
      SELECT 
        DATE(start_time AT TIME ZONE 'UTC') as date,
        status,
        COUNT(*) as count
      FROM appointments
      WHERE business_id = ${businessId}
        AND start_time >= ${startDate.toISOString()}
        AND start_time <= ${now.toISOString()}
        AND deleted_at IS NULL
      GROUP BY DATE(start_time AT TIME ZONE 'UTC'), status
      ORDER BY date ASC
    `;

    // Generate all dates in range (to show days with 0 bookings)
    const dateMap = new Map<string, number>();
    for (let d = new Date(startDate); d <= now; d.setDate(d.getDate() + 1)) {
      const dateStr = d.toISOString().split('T')[0];
      dateMap.set(dateStr, 0);
    }

    // Fill in actual booking counts
    let totalCompleted = 0;
    let totalCancelled = 0;
    let totalUpcoming = 0;

    appointments.forEach((row: any) => {
      const dateStr = row.date;
      const count = parseInt(row.count, 10);
      dateMap.set(dateStr, (dateMap.get(dateStr) || 0) + count);

      if (row.status === 'completed') {
        totalCompleted += count;
      } else if (row.status === 'cancelled') {
        totalCancelled += count;
      } else if (row.status === 'confirmed') {
        totalUpcoming += count;
      }
    });

    // Convert map to array for chart
    const chartData = Array.from(dateMap.entries()).map(([date, count]) => ({
      date,
      count
    }));

    const stats = {
      total: totalCompleted + totalCancelled + totalUpcoming,
      completed: totalCompleted,
      cancelled: totalCancelled,
      upcoming: totalUpcoming
    };

    return NextResponse.json({
      chartData,
      stats
    });
  } catch (error) {
    console.error('Insights API error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch insights data' },
      { status: 500 }
    );
  }
}
