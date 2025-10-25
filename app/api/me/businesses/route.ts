import { NextRequest, NextResponse } from 'next/server';
import { neon } from '@neondatabase/serverless';
import { withAuth } from '@/middleware/auth';
import { loadConfigBySubdomain } from '@/lib/config/config-loader';

const sql = neon(process.env.DATABASE_URL!);

/**
 * Get all businesses owned by the authenticated user
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

    // Use the get_user_businesses() database function
    const businesses = await sql`
      SELECT * FROM get_user_businesses(${userId}::uuid)
    `;

    // Load config for each business to get branding data
    const businessesWithBranding = await Promise.all(
      businesses.map(async (business) => {
        try {
          const result = await loadConfigBySubdomain(business.subdomain);

          if (result.success && result.config) {
            return {
              id: business.business_id,
              subdomain: business.subdomain,
              name: business.name,
              isPrimary: business.is_primary,
              joinedAt: business.joined_at,
              profileImageUrl: result.config.branding.profileImageUrl,
              logoUrl: result.config.branding.logoUrl,
            };
          }
        } catch (error) {
          console.error(`Failed to load config for ${business.subdomain}:`, error);
        }

        // Return without branding if config load fails
        return {
          id: business.business_id,
          subdomain: business.subdomain,
          name: business.name,
          isPrimary: business.is_primary,
          joinedAt: business.joined_at,
        };
      })
    );

    return NextResponse.json({
      businesses: businessesWithBranding,
    });
  } catch (error) {
    console.error('Get user businesses error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// Export protected route
export const GET = withAuth(handler);
