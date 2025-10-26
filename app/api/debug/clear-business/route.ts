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

    // Get business ID first
    const businessResult = await sql`SELECT id FROM businesses WHERE subdomain = ${subdomain}`;
    if (businessResult.length === 0) {
      return NextResponse.json({ error: 'Business not found' }, { status: 404 });
    }
    const businessId = businessResult[0].id;

    // Delete in correct order (child tables first to avoid constraint violations)
    await sql`DELETE FROM audit_logs WHERE appointment_id IN (SELECT id FROM appointments WHERE business_id = ${businessId})`;
    console.log('  ✓ Cleared audit_logs');

    await sql`DELETE FROM notification_logs WHERE appointment_id IN (SELECT id FROM appointments WHERE business_id = ${businessId})`;
    console.log('  ✓ Cleared notification_logs');

    // Delete appointments BEFORE users to avoid constraint violation
    await sql`DELETE FROM appointments WHERE business_id = ${businessId}`;
    console.log('  ✓ Cleared appointments');

    await sql`DELETE FROM reservations WHERE business_id = ${businessId}`;
    console.log('  ✓ Cleared reservations');

    await sql`DELETE FROM services WHERE business_id = ${businessId}`;
    console.log('  ✓ Cleared services');

    await sql`DELETE FROM categories WHERE business_id = ${businessId}`;
    console.log('  ✓ Cleared categories');

    await sql`DELETE FROM availability WHERE business_id = ${businessId}`;
    console.log('  ✓ Cleared availability');

    await sql`DELETE FROM refresh_tokens WHERE user_id IN (SELECT id FROM users WHERE business_id = ${businessId})`;
    console.log('  ✓ Cleared refresh_tokens');

    // Delete from business_owners junction table
    await sql`DELETE FROM business_owners WHERE business_id = ${businessId}`;
    console.log('  ✓ Cleared business_owners');

    // Update users to remove business_id reference (set to NULL) before deleting business
    // This prevents cascade updates that would violate constraints on appointments
    await sql`UPDATE users SET business_id = NULL WHERE business_id = ${businessId}`;
    console.log('  ✓ Unlinked users from business');

    // Final cleanup: ensure absolutely no appointments reference this business
    await sql`DELETE FROM appointments WHERE business_id = ${businessId}`;

    // Verify no appointments remain
    const check = await sql`SELECT COUNT(*) as count FROM appointments WHERE business_id = ${businessId}`;
    if (check[0].count !== '0') {
      throw new Error(`Still ${check[0].count} appointments remaining for business!`);
    }

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
