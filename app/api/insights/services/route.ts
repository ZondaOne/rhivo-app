import { NextRequest, NextResponse } from 'next/server';
import { getDbClient } from '@/db/client';
import { verifyToken } from '@/lib/auth';
import { requireBusinessOwnership } from '@/lib/auth/verify-ownership';
import { checkFeatureAccess } from '@/lib/subscription/feature-gates';

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

    // Check if business has access to analytics feature
    const featureCheck = await checkFeatureAccess(businessId, 'analyticsLevel');
    if (!featureCheck.hasAccess) {
      return NextResponse.json({
        error: 'Feature not available',
        message: featureCheck.upgradeMessage,
        currentTier: featureCheck.currentTier,
        suggestedTier: featureCheck.suggestedTier,
        upgradeRequired: true,
      }, { status: 403 });
    }

    // Calculate date range
    const now = new Date();
    const daysMap = { '7d': 7, '30d': 30, '90d': 90 };
    const days = daysMap[timeRange as keyof typeof daysMap] || 30;
    const startDate = new Date(now);
    startDate.setDate(startDate.getDate() - days);

    // Fetch service performance data
    const servicesData = await sql`
      SELECT
        s.id,
        s.name,
        s.color,
        s.price_cents,
        s.duration_minutes,
        COUNT(a.id) as booking_count,
        COALESCE(SUM(s.price_cents), 0) as total_revenue,
        COUNT(CASE WHEN a.status = 'completed' THEN 1 END) as completed_count,
        COUNT(CASE WHEN a.status = 'canceled' THEN 1 END) as cancelled_count
      FROM services s
      LEFT JOIN appointments a ON s.id = a.service_id
        AND a.slot_start >= ${startDate.toISOString()}
        AND a.slot_start <= ${now.toISOString()}
        AND a.deleted_at IS NULL
      WHERE s.business_id = ${businessId}
        AND s.deleted_at IS NULL
      GROUP BY s.id, s.name, s.color, s.price_cents, s.duration_minutes
      ORDER BY booking_count DESC, total_revenue DESC
      LIMIT 10
    `;

    // Calculate total bookings for percentage
    const totalBookings = servicesData.reduce((sum: number, service: { booking_count: string }) => {
      return sum + parseInt(service.booking_count, 10);
    }, 0);

    // Format the data
    const services = servicesData.map((service: {
      id: string;
      name: string;
      color: string;
      price_cents: number;
      booking_count: string;
      completed_count: string;
      cancelled_count: string;
      total_revenue: string;
    }) => {
      const bookingCount = parseInt(service.booking_count, 10);
      const completedCount = parseInt(service.completed_count, 10);
      const cancelledCount = parseInt(service.cancelled_count, 10);
      const totalRevenue = parseFloat(service.total_revenue) || 0;

      return {
        id: service.id,
        name: service.name,
        color: service.color,
        price: service.price_cents / 100, // Convert cents to dollars
        durationMinutes: service.duration_minutes,
        bookingCount,
        completedCount,
        cancelledCount,
        totalRevenue: totalRevenue / 100, // Convert cents to dollars
        percentage: totalBookings > 0 ? (bookingCount / totalBookings) * 100 : 0,
        completionRate: bookingCount > 0 ? (completedCount / bookingCount) * 100 : 0
      };
    });

    // Calculate overall stats
    const stats = {
      totalServices: servicesData.length,
      totalBookings,
      mostPopular: services[0] || null
    };

    return NextResponse.json({
      services,
      stats
    });
  } catch (error) {
    console.error('Services insights API error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch services data' },
      { status: 500 }
    );
  }
}
