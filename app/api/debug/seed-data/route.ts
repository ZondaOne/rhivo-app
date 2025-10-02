import { NextRequest, NextResponse } from 'next/server';
import { neon } from '@neondatabase/serverless';
import { nanoid } from 'nanoid';

const sql = neon(process.env.DATABASE_URL!);

export async function POST(_request: NextRequest) {
  try {
    const id = nanoid(6);
    const subdomain = `test-${id}`;
    const businessName = `Test Business ${id}`;

    // Create business
    const [business] = await sql`
      INSERT INTO businesses (name, subdomain, timezone, config_yaml_path, status)
      VALUES (${businessName}, ${subdomain}, 'America/New_York', ${`/configs/${subdomain}.yaml`}, 'active')
      RETURNING id, name, subdomain
    `;

    // Create a category
    const [category] = await sql`
      INSERT INTO categories (business_id, name, sort_order)
      VALUES (${business.id}, 'Debug Services', 0)
      RETURNING id, name
    `;

    // Create a service
    const [service] = await sql`
      INSERT INTO services (
        business_id, category_id, name, duration_minutes, price_cents, color, max_simultaneous_bookings, sort_order
      ) VALUES (
        ${business.id}, ${category.id}, 'Haircut', 30, 5000, '#10b981', 2, 0
      )
      RETURNING id, name, duration_minutes
    `;

    // Basic weekday availability (Mon-Fri 9-17)
    const days = [1, 2, 3, 4, 5];
    for (const d of days) {
      await sql`
        INSERT INTO availability (business_id, day_of_week, start_time, end_time)
        VALUES (${business.id}, ${d}, '09:00', '17:00')
      `;
    }

    return NextResponse.json({
      message: 'Seeded test business, category, service, availability',
      business,
      category,
      service,
    });
  } catch (error) {
    console.error('Seed data error:', error);
    return NextResponse.json({ error: 'Failed to seed data' }, { status: 500 });
  }
}
