import { NextRequest, NextResponse } from 'next/server';
import { neon } from '@neondatabase/serverless';
import { verifyPassword } from '@/lib/auth/password';
import {
  generateAccessToken,
  generateRefreshToken,
  getRefreshTokenExpiry,
  hashToken,
} from '@/lib/auth/tokens';
import { checkRateLimit, resetRateLimit } from '@/lib/auth/rate-limit';
import { z } from 'zod';

const sql = neon(process.env.DATABASE_URL!);

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validatedData = loginSchema.parse(body);

    // Get IP for rate limiting
    const ip = request.headers.get('x-forwarded-for') || 'unknown';
    const identifier = `${ip}:${validatedData.email}`;

    // Check rate limit
    const isRateLimited = await checkRateLimit(identifier, 'login');
    if (isRateLimited) {
      return NextResponse.json(
        { error: 'Too many login attempts. Please try again later.' },
        { status: 429 }
      );
    }

    // Find user by email
    const [user] = await sql`
      SELECT
        u.id,
        u.email,
        u.name,
        u.role,
        u.business_id,
        u.password_hash,
        u.email_verified,
        u.deleted_at
      FROM users u
      WHERE u.email = ${validatedData.email}
        AND u.deleted_at IS NULL
    `;

    if (!user) {
      return NextResponse.json(
        { error: 'Invalid email or password' },
        { status: 401 }
      );
    }

    // Verify password
    const isValidPassword = await verifyPassword(validatedData.password, user.password_hash);
    if (!isValidPassword) {
      return NextResponse.json(
        { error: 'Invalid email or password' },
        { status: 401 }
      );
    }

    // Check if email is verified
    if (!user.email_verified) {
      return NextResponse.json(
        { error: 'Please verify your email before logging in' },
        { status: 403 }
      );
    }

    // Generate tokens
    const accessToken = generateAccessToken({
      sub: user.id,
      role: user.role,
      business_id: user.business_id,
      email: user.email,
    });

    const refreshToken = generateRefreshToken();
    const refreshTokenHash = hashToken(refreshToken);
    const refreshTokenExpiry = getRefreshTokenExpiry();

    // Get device fingerprint from headers
    const userAgent = request.headers.get('user-agent') || 'unknown';
    const deviceFingerprint = hashToken(userAgent + ip);

    // Store refresh token
    await sql`
      INSERT INTO refresh_tokens (
        user_id,
        token_hash,
        device_fingerprint,
        expires_at
      ) VALUES (
        ${user.id},
        ${refreshTokenHash},
        ${deviceFingerprint},
        ${refreshTokenExpiry}
      )
    `;

    // Reset rate limit on successful login
    await resetRateLimit(identifier, 'login');

    // Set refresh token as httpOnly cookie
    const response = NextResponse.json({
      message: 'Login successful',
      accessToken,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        business_id: user.business_id,
      },
    });

    response.cookies.set('refresh_token', refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 30 * 24 * 60 * 60, // 30 days
      path: '/',
    });

    return response;
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation failed', details: error.issues },
        { status: 400 }
      );
    }

    console.error('Login error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}