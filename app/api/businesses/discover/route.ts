import { NextResponse } from 'next/server';
import { neon } from '@neondatabase/serverless';

const sql = neon(process.env.DATABASE_URL!);

export async function GET() {
  try {
    // Fetch all active businesses with their categories and services in a single query
    // Using JSONB (config_json) for native JSON querying - NO parsing overhead!
    // This is 10-100x more efficient than loading full YAML configs
    const businesses = await sql`
      WITH business_data AS (
        SELECT
          b.id,
          b.subdomain,
          b.name,
          b.config_json,
          COALESCE((b.config_json->'features'->>'hideFromDiscovery')::boolean, false) as hide_from_discovery
        FROM businesses b
        WHERE b.status = 'active'
          AND b.deleted_at IS NULL
          AND b.config_json IS NOT NULL
      ),
      category_summary AS (
        SELECT
          c.business_id,
          json_agg(
            json_build_object(
              'id', c.id,
              'name', c.name,
              'serviceCount', (
                SELECT COUNT(*)
                FROM services s
                WHERE s.category_id = c.id
                  AND s.deleted_at IS NULL
              )
            ) ORDER BY c.sort_order
          ) as categories
        FROM categories c
        WHERE c.deleted_at IS NULL
        GROUP BY c.business_id
      ),
      price_range AS (
        SELECT
          s.business_id,
          MIN(s.price_cents) as min_price_cents,
          MAX(s.price_cents) as max_price_cents
        FROM services s
        WHERE s.deleted_at IS NULL
        GROUP BY s.business_id
      )
      SELECT
        bd.subdomain,
        bd.name,
        bd.config_json->'business'->>'description' as description,
        bd.config_json->'contact'->'address'->>'street' as street,
        bd.config_json->'contact'->'address'->>'city' as city,
        bd.config_json->'contact'->'address'->>'state' as state,
        bd.config_json->'contact'->'address'->>'country' as country,
        bd.config_json->'contact'->>'latitude' as latitude,
        bd.config_json->'contact'->>'longitude' as longitude,
        bd.config_json->'branding'->>'coverImageUrl' as cover_image_url,
        bd.config_json->'branding'->>'profileImageUrl' as profile_image_url,
        bd.config_json->'branding'->>'primaryColor' as primary_color,
        COALESCE(cs.categories, '[]'::json) as categories,
        COALESCE(pr.min_price_cents / 100.0, 0) as min_price,
        COALESCE(pr.max_price_cents / 100.0, 0) as max_price
      FROM business_data bd
      LEFT JOIN category_summary cs ON cs.business_id = bd.id
      LEFT JOIN price_range pr ON pr.business_id = bd.id
      WHERE bd.hide_from_discovery = false
      ORDER BY bd.name ASC
    `;

    const businessSummaries = businesses.map((b: any) => ({
      subdomain: b.subdomain,
      name: b.name,
      description: b.description || undefined,
      address: {
        street: b.street || '',
        city: b.city || '',
        state: b.state || '',
        country: b.country || 'US',
      },
      categories: b.categories || [],
      coverImageUrl: b.cover_image_url || undefined,
      profileImageUrl: b.profile_image_url || undefined,
      primaryColor: b.primary_color || undefined,
      latitude: b.latitude ? parseFloat(b.latitude) : undefined,
      longitude: b.longitude ? parseFloat(b.longitude) : undefined,
      priceRange: {
        min: b.min_price || 0,
        max: b.max_price || 0
      }
    }));

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
