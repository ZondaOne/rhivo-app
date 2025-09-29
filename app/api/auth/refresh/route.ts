import { NextRequest, NextResponse } from 'next/server';
import { neon } from '@neondatabase/serverless';
import {
  generateAccessToken,
  generateRefreshToken,
  getRefreshTokenExpiry,
  hashToken,
} from '@/lib/auth/tokens';

const sql = neon(process.env.DATABASE_URL!);

export async function POST(request: NextRequest) {
  try {
    // Get refresh token from cookie
    const refreshToken = request.cookies.get('refresh_token')?.value;

    if (!refreshToken) {
      return NextResponse.json(
        { error: 'Refresh token not found' },
        { status: 401 }
      );
    }

    const refreshTokenHash = hashToken(refreshToken);

    // Find refresh token in database
    const [tokenRecord] = await sql`
      SELECT
        rt.id,
        rt.user_id,
        rt.expires_at,
        rt.revoked_at,
        u.email,
        u.name,
        u.role,
        u.business_id,
        u.deleted_at
      FROM refresh_tokens rt
      JOIN users u ON u.id = rt.user_id
      WHERE rt.token_hash = ${refreshTokenHash}
    `;

    if (!tokenRecord) {
      return NextResponse.json(
        { error: 'Invalid refresh token' },
        { status: 401 }
      );
    }

    // Check if token is expired
    if (new Date(tokenRecord.expires_at) < new Date()) {
      return NextResponse.json(
        { error: 'Refresh token expired' },
        { status: 401 }
      );
    }

    // Check if token is revoked
    if (tokenRecord.revoked_at) {
      // Potential replay attack - revoke all tokens for this user
      await sql`
        UPDATE refresh_tokens
        SET revoked_at = NOW()
        WHERE user_id = ${tokenRecord.user_id} AND revoked_at IS NULL
      `;

      return NextResponse.json(
        { error: 'Token already used. All sessions have been revoked for security.' },
        { status: 401 }
      );
    }

    // Check if user is deleted
    if (tokenRecord.deleted_at) {
      return NextResponse.json(
        { error: 'User account no longer exists' },
        { status: 401 }
      );
    }

    // Generate new tokens
    const accessToken = generateAccessToken({
      sub: tokenRecord.user_id,
      role: tokenRecord.role,
      business_id: tokenRecord.business_id,
      email: tokenRecord.email,
    });

    const newRefreshToken = generateRefreshToken();
    const newRefreshTokenHash = hashToken(newRefreshToken);
    const refreshTokenExpiry = getRefreshTokenExpiry();

    // Get device fingerprint
    const ip = request.headers.get('x-forwarded-for') || 'unknown';
    const userAgent = request.headers.get('user-agent') || 'unknown';
    const deviceFingerprint = hashToken(userAgent + ip);

    // Rotate refresh token (revoke old, create new)
    await sql.transaction(async (tx) => {
      // Revoke old token
      await tx`
        UPDATE refresh_tokens
        SET revoked_at = NOW()
        WHERE id = ${tokenRecord.id}
      `;

      // Create new token
      await tx`
        INSERT INTO refresh_tokens (
          user_id,
          token_hash,
          device_fingerprint,
          expires_at
        ) VALUES (
          ${tokenRecord.user_id},
          ${newRefreshTokenHash},
          ${deviceFingerprint},
          ${refreshTokenExpiry}
        )
      `;
    });

    // Set new refresh token in cookie
    const response = NextResponse.json({
      message: 'Token refreshed successfully',
      accessToken,
      user: {
        id: tokenRecord.user_id,
        email: tokenRecord.email,
        name: tokenRecord.name,
        role: tokenRecord.role,
        business_id: tokenRecord.business_id,
      },
    });

    response.cookies.set('refresh_token', newRefreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 30 * 24 * 60 * 60, // 30 days
      path: '/',
    });

    return response;
  } catch (error) {
    console.error('Refresh token error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}