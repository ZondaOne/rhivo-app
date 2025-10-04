import { NextRequest, NextResponse } from 'next/server';
import { loadConfigBySubdomain } from '@/lib/config/config-loader';
import { neon } from '@neondatabase/serverless';

const sql = neon(process.env.DATABASE_URL!);

export async function GET(request: NextRequest) {
  try {
    // Fetch all active businesses from database
    const businesses = await sql`
      SELECT
        subdomain,
        name,
        config_yaml_path,
        status
      FROM businesses
      WHERE status = 'active'
        AND deleted_at IS NULL
      ORDER BY name ASC
    `;

    // Load config for each business to get additional data
    const businessSummaries = await Promise.all(
      businesses.map(async (business) => {
        try {
          const result = await loadConfigBySubdomain(business.subdomain);

          if (!result.success || !result.config) {
            throw new Error('Config load failed');
          }

          const config = result.config;

          // Extract category summaries
          const categories = config.categories.map(cat => ({
            id: cat.id,
            name: cat.name,
            serviceCount: cat.services.filter(s => s.enabled).length
          }));

          // Calculate price range from all enabled services
          const allPrices = config.categories.flatMap(cat =>
            cat.services.filter(s => s.enabled).map(s => s.price)
          );
          const minPrice = allPrices.length > 0 ? Math.min(...allPrices) / 100 : 0; // Convert cents to dollars
          const maxPrice = allPrices.length > 0 ? Math.max(...allPrices) / 100 : 0;

          return {
            subdomain: business.subdomain,
            name: config.business.name,
            description: config.business.description,
            address: {
              street: config.contact.address.street,
              city: config.contact.address.city,
              state: config.contact.address.state,
              country: config.contact.address.country,
            },
            categories,
            coverImageUrl: config.branding.coverImageUrl,
            primaryColor: config.branding.primaryColor,
            // Include geolocation from YAML if available
            latitude: config.contact.latitude,
            longitude: config.contact.longitude,
            // Price range
            priceRange: {
              min: minPrice,
              max: maxPrice
            }
          };
        } catch (error) {
          console.error(`Failed to load config for ${business.subdomain}:`, error);
          // Return minimal data if config load fails
          return {
            subdomain: business.subdomain,
            name: business.name,
            description: undefined,
            address: {
              street: '',
              city: '',
              state: '',
              country: '',
            },
            categories: [],
            coverImageUrl: undefined,
            primaryColor: undefined,
            priceRange: {
              min: 0,
              max: 0
            }
          };
        }
      })
    );

    return NextResponse.json({
      success: true,
      businesses: businessSummaries,
      count: businessSummaries.length
    });

  } catch (error) {
    console.error('Discovery API error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to load businesses' },
      { status: 500 }
    );
  }
}
