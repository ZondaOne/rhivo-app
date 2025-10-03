import { NextRequest, NextResponse } from 'next/server';
import { neon } from '@neondatabase/serverless';

const sql = neon(process.env.DATABASE_URL!);

export async function POST(request: NextRequest) {
  try {
    const { subdomain } = await request.json();
    
    if (!subdomain) {
      return NextResponse.json({ error: 'Subdomain required' }, { status: 400 });
    }

    console.log(`🗑️  Clearing ${subdomain} data...`);
    
    await sql`DELETE FROM audit_logs WHERE appointment_id IN (SELECT id FROM appointments WHERE business_id IN (SELECT id FROM businesses WHERE subdomain = ${subdomain}))`;
    console.log('  ✓ Cleared audit_logs');
    
    await sql`DELETE FROM notification_logs WHERE appointment_id IN (SELECT id FROM appointments WHERE business_id IN (SELECT id FROM businesses WHERE subdomain = ${subdomain}))`;
    console.log('  ✓ Cleared notification_logs');
    
    await sql`DELETE FROM appointments WHERE business_id IN (SELECT id FROM businesses WHERE subdomain = ${subdomain})`;
    console.log('  ✓ Cleared appointments');
    
    await sql`DELETE FROM reservations WHERE business_id IN (SELECT id FROM businesses WHERE subdomain = ${subdomain})`;
    console.log('  ✓ Cleared reservations');
    
    await sql`DELETE FROM services WHERE business_id IN (SELECT id FROM businesses WHERE subdomain = ${subdomain})`;
    console.log('  ✓ Cleared services');
    
    await sql`DELETE FROM categories WHERE business_id IN (SELECT id FROM businesses WHERE subdomain = ${subdomain})`;
    console.log('  ✓ Cleared categories');
    
    await sql`DELETE FROM availability WHERE business_id IN (SELECT id FROM businesses WHERE subdomain = ${subdomain})`;
    console.log('  ✓ Cleared availability');
    
    await sql`DELETE FROM refresh_tokens WHERE user_id IN (SELECT id FROM users WHERE business_id IN (SELECT id FROM businesses WHERE subdomain = ${subdomain}))`;
    console.log('  ✓ Cleared refresh_tokens');
    
    await sql`DELETE FROM users WHERE business_id IN (SELECT id FROM businesses WHERE subdomain = ${subdomain})`;
    console.log('  ✓ Cleared users');
    
    await sql`DELETE FROM businesses WHERE subdomain = ${subdomain}`;
    console.log('  ✓ Cleared businesses');
    
    console.log('✅ All data cleared!');

    return NextResponse.json({ 
      success: true,
      message: `Cleared all data for ${subdomain}` 
    });
  } catch (error) {
    console.error('Clear business data error:', error);
    return NextResponse.json({ error: 'Failed to clear business data' }, { status: 500 });
  }
}
