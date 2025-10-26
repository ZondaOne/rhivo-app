import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/middleware/auth';
import { getDbClient } from '@/db/client';

const sql = getDbClient();

/**
 * Get current authenticated user profile
 */
async function handler(request: NextRequest) {
  try {
    const userId = request.headers.get('x-user-id');

    if (!userId) {
      return NextResponse.json(
        { error: 'User ID not found' },
        { status: 401 }
      );
    }

    // Get user details
    const [user] = await sql`
      SELECT
        u.id,
        u.email,
        u.name,
        u.phone,
        u.role,
        u.business_id,
        u.email_verified,
        b.name as business_name,
        b.subdomain as business_subdomain
      FROM users u
      LEFT JOIN businesses b ON b.id = u.business_id
      WHERE u.id = ${userId}
        AND u.deleted_at IS NULL
    `;

    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        phone: user.phone,
        role: user.role,
        emailVerified: user.email_verified,
        business: user.business_id ? {
          id: user.business_id,
          name: user.business_name,
          subdomain: user.business_subdomain,
        } : null,
      },
    });
  } catch (error) {
    console.error('Get profile error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// Export protected route
export const GET = withAuth(handler);