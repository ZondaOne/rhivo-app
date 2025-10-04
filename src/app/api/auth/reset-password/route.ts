import { NextRequest, NextResponse } from 'next/server';
import { neon } from '@neondatabase/serverless';
import { hashToken } from '@/lib/auth/tokens';
import { hashPassword, validatePasswordStrength } from '@/lib/auth/password';

const sql = neon(process.env.DATABASE_URL!);

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { token, newPassword } = body;

    if (!token || typeof token !== 'string') {
      return NextResponse.json(
        { error: 'Reset token is required' },
        { status: 400 }
      );
    }

    if (!newPassword || typeof newPassword !== 'string') {
      return NextResponse.json(
        { error: 'New password is required' },
        { status: 400 }
      );
    }

    // Validate password strength
    const passwordValidation = validatePasswordStrength(newPassword);
    if (!passwordValidation.valid) {
      return NextResponse.json(
        { error: 'Password does not meet requirements', errors: passwordValidation.errors },
        { status: 400 }
      );
    }

    // Hash the token to look it up in database
    const tokenHash = hashToken(token);

    // Find user with matching token that hasn't expired
    const users = await sql`
      SELECT id, email, role
      FROM users
      WHERE password_reset_token = ${tokenHash}
        AND password_reset_expires_at > NOW()
        AND deleted_at IS NULL
      LIMIT 1;
    `;

    if (users.length === 0) {
      return NextResponse.json(
        { error: 'Invalid or expired reset token' },
        { status: 400 }
      );
    }

    const user = users[0];

    // Hash new password
    const passwordHash = await hashPassword(newPassword);

    // Update password and clear reset token
    await sql`
      UPDATE users
      SET
        password_hash = ${passwordHash},
        password_reset_token = NULL,
        password_reset_expires_at = NULL,
        requires_password_change = FALSE
      WHERE id = ${user.id};
    `;

    // Revoke all existing refresh tokens for security
    await sql`
      UPDATE refresh_tokens
      SET revoked_at = NOW()
      WHERE user_id = ${user.id}
        AND revoked_at IS NULL;
    `;

    return NextResponse.json({
      message: 'Password reset successful. You can now login with your new password.',
    });
  } catch (error) {
    console.error('Reset password error:', error);
    return NextResponse.json(
      { error: 'An error occurred processing your request' },
      { status: 500 }
    );
  }
}
