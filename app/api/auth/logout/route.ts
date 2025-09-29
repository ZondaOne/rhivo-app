import { NextRequest, NextResponse } from 'next/server';
import { neon } from '@neondatabase/serverless';
import { hashToken } from '@/lib/auth/tokens';

const sql = neon(process.env.DATABASE_URL!);

export async function POST(request: NextRequest) {
  try {
    // Get refresh token from cookie
    const refreshToken = request.cookies.get('refresh_token')?.value;

    if (refreshToken) {
      const refreshTokenHash = hashToken(refreshToken);

      // Revoke refresh token
      await sql`
        UPDATE refresh_tokens
        SET revoked_at = NOW()
        WHERE token_hash = ${refreshTokenHash}
      `;
    }

    // Clear refresh token cookie
    const response = NextResponse.json({
      message: 'Logout successful',
    });

    response.cookies.set('refresh_token', '', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 0,
      path: '/',
    });

    return response;
  } catch (error) {
    console.error('Logout error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}