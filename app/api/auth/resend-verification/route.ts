import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { createEmailService } from '@/lib/email/email-service';
import { renderEmailVerification } from '@/lib/email/templates';
import { hashToken } from '@/lib/auth/tokens';
import { z } from 'zod';
import { getDbClient } from '@/db/client';
import { env } from '@/lib/env';

const sql = getDbClient();

const resendSchema = z.object({
  email: z.string().email(),
});

/**
 * POST /api/auth/resend-verification
 * Resend email verification link
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email } = resendSchema.parse(body);

    // Find user by email
    const [user] = await sql`
      SELECT
        id,
        email,
        name,
        email_verified,
        deleted_at
      FROM users
      WHERE email = ${email}
        AND deleted_at IS NULL
    `;

    // Don't reveal if email exists or not (timing attack mitigation)
    if (!user) {
      // Return success anyway to prevent email enumeration
      return NextResponse.json({
        message: 'If an account exists with this email, a verification link has been sent.',
      });
    }

    // Check if already verified
    if (user.email_verified) {
      return NextResponse.json(
        {
          error: 'Email already verified',
          message: 'This email address is already verified. You can log in now.',
        },
        { status: 400 }
      );
    }

    // Generate new verification token
    const verificationToken = crypto.randomBytes(32).toString('hex');
    const verificationTokenHash = hashToken(verificationToken);
    const verificationExpiry = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

    // Update user with new verification token
    await sql`
      UPDATE users
      SET
        email_verification_token = ${verificationTokenHash},
        email_verification_expires_at = ${verificationExpiry}
      WHERE id = ${user.id}
    `;

    // Send verification email
    try {
      const emailService = createEmailService(sql);
      const verificationUrl = `${env.NEXT_PUBLIC_APP_URL}/auth/verify-email?token=${verificationToken}`;

      const emailHtml = await renderEmailVerification({
        userName: user.name || 'User',
        verificationUrl,
        expiryHours: 24,
      });

      await emailService.sendEmail({
        to: user.email,
        subject: 'Verify your Rivo account',
        html: emailHtml,
        templateName: 'email_verification',
        appointmentId: undefined,
      });

      console.log('✅ Verification email resent to:', user.email);

      return NextResponse.json({
        message: 'Verification email sent successfully. Please check your inbox.',
      });
    } catch (emailError) {
      console.error('❌ Failed to send verification email:', emailError);
      return NextResponse.json(
        {
          error: 'Failed to send email',
          message: 'There was an error sending the verification email. Please try again later.',
        },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('Resend verification error:', error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          error: 'Invalid email',
          message: 'Please provide a valid email address.',
        },
        { status: 400 }
      );
    }

    return NextResponse.json(
      {
        error: 'Internal server error',
        message: 'An unexpected error occurred. Please try again later.',
      },
      { status: 500 }
    );
  }
}
