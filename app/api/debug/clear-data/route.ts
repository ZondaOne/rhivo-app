import { NextRequest, NextResponse } from 'next/server';
import { neon } from '@neondatabase/serverless';

const sql = neon(process.env.DATABASE_URL!);

export async function POST(_request: NextRequest) {
  try {
    // Delete in dependency-safe order
    await sql`DELETE FROM audit_logs WHERE appointment_id IN (SELECT id FROM appointments WHERE business_id IN (SELECT id FROM businesses WHERE subdomain LIKE 'test-%'))`;
    await sql`DELETE FROM notification_logs WHERE appointment_id IN (SELECT id FROM appointments WHERE business_id IN (SELECT id FROM businesses WHERE subdomain LIKE 'test-%'))`;
    await sql`DELETE FROM appointments WHERE business_id IN (SELECT id FROM businesses WHERE subdomain LIKE 'test-%')`;
    await sql`DELETE FROM reservations WHERE business_id IN (SELECT id FROM businesses WHERE subdomain LIKE 'test-%')`;
    await sql`DELETE FROM services WHERE business_id IN (SELECT id FROM businesses WHERE subdomain LIKE 'test-%')`;
    await sql`DELETE FROM categories WHERE business_id IN (SELECT id FROM businesses WHERE subdomain LIKE 'test-%')`;
    await sql`DELETE FROM availability WHERE business_id IN (SELECT id FROM businesses WHERE subdomain LIKE 'test-%')`;
    await sql`DELETE FROM refresh_tokens WHERE user_id IN (SELECT id FROM users WHERE email LIKE 'test-%@test.com')`;
    await sql`DELETE FROM users WHERE email LIKE 'test-%@test.com'`;
    await sql`DELETE FROM businesses WHERE subdomain LIKE 'test-%'`;

    return NextResponse.json({ message: 'Cleared test data' });
  } catch (error) {
    console.error('Clear data error:', error);
    return NextResponse.json({ error: 'Failed to clear data' }, { status: 500 });
  }
}
