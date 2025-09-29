import { NextRequest, NextResponse } from 'next/server';
import { neon } from '@neondatabase/serverless';
import { hashToken } from '@/lib/auth/tokens';
import { checkRateLimit } from '@/lib/auth/rate-limit';
import { z } from 'zod';

const sql = neon(process.env.DATABASE_URL!);

const verifySchema = z.object({
  token: z.string().min(1),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validatedData = verifySchema.parse(body);

    // Get IP for rate limiting
    const ip = request.headers.get('x-forwarded-for') || 'unknown';

    // Check rate limit
    const isRateLimited = await checkRateLimit(ip, 'email_verification');
    if (isRateLimited) {
      return NextResponse.json(
        { error: 'Too many verification attempts. Please try again later.' },
        { status: 429 }
      );
    }

    const tokenHash = hashToken(validatedData.token);

    // Find user with matching token
    const [user] = await sql`
      SELECT id, email, email_verified, email_verification_expires_at
      FROM users
      WHERE email_verification_token = ${tokenHash}
        AND deleted_at IS NULL
    `;

    if (!user) {
      return NextResponse.json(
        { error: 'Invalid verification token' },
        { status: 400 }
      );
    }

    // Check if already verified
    if (user.email_verified) {
      return NextResponse.json(
        { message: 'Email already verified' },
        { status: 200 }
      );
    }

    // Check if token expired
    if (new Date(user.email_verification_expires_at) < new Date()) {
      return NextResponse.json(
        { error: 'Verification token expired' },
        { status: 400 }
      );
    }

    // Verify email
    await sql`
      UPDATE users
      SET
        email_verified = true,
        email_verification_token = NULL,
        email_verification_expires_at = NULL
      WHERE id = ${user.id}
    `;

    return NextResponse.json({
      message: 'Email verified successfully',
      email: user.email,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation failed', details: error.errors },
        { status: 400 }
      );
    }

    console.error('Email verification error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}