import { NextRequest, NextResponse } from 'next/server';
import { neon } from '@neondatabase/serverless';
import { generatePasswordResetToken, getPasswordResetExpiry, hashToken } from '@/lib/auth/tokens';
import { checkRateLimit } from '@/lib/auth/rate-limit';

const sql = neon(process.env.DATABASE_URL!);

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email } = body;

    if (!email || typeof email !== 'string') {
      return NextResponse.json(
        { error: 'Email is required' },
        { status: 400 }
      );
    }

    // Rate limiting by email to prevent abuse
    const rateLimited = await checkRateLimit(email, 'password_reset');
    if (rateLimited) {
      return NextResponse.json(
        { error: 'Too many password reset requests. Please try again later.' },
        { status: 429 }
      );
    }

    // Find user by email
    const users = await sql`
      SELECT id, email, role
      FROM users
      WHERE email = ${email.toLowerCase()}
        AND deleted_at IS NULL
      LIMIT 1;
    `;

    // Always return success to prevent email enumeration
    // Don't reveal whether email exists or not
    const successResponse = {
      message: 'If an account exists with this email, you will receive a password reset link.',
    };

    if (users.length === 0) {
      // User not found - still return success to prevent enumeration
      return NextResponse.json(successResponse);
    }

    const user = users[0];

    // Generate password reset token
    const resetToken = generatePasswordResetToken();
    const resetTokenHash = hashToken(resetToken);
    const resetExpiry = getPasswordResetExpiry();

    // Store hashed token in database
    await sql`
      UPDATE users
      SET
        password_reset_token = ${resetTokenHash},
        password_reset_expires_at = ${resetExpiry.toISOString()}
      WHERE id = ${user.id};
    `;

    // Generate reset URL
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    const resetUrl = `${appUrl}/auth/reset-password?token=${resetToken}`;

    // TODO: Send email with reset link
    // For now, log to console in development
    if (process.env.NODE_ENV === 'development') {
      console.log('\n=== PASSWORD RESET REQUESTED ===');
      console.log('Email:', user.email);
      console.log('Reset URL:', resetUrl);
      console.log('Token expires at:', resetExpiry.toISOString());
      console.log('================================\n');
    }

    // In production, send email here:
    // await sendPasswordResetEmail(user.email, resetUrl, user.name);

    return NextResponse.json(successResponse);
  } catch (error) {
    console.error('Forgot password error:', error);
    return NextResponse.json(
      { error: 'An error occurred processing your request' },
      { status: 500 }
    );
  }
}
