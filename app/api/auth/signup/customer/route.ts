import { NextRequest, NextResponse } from 'next/server';
import { hashPassword, validatePasswordStrength } from '@/lib/auth/password';
import {
  generateEmailVerificationToken,
  getEmailVerificationExpiry,
  hashToken,
} from '@/lib/auth/tokens';
import { checkRateLimit } from '@/lib/auth/rate-limit';
import { z } from 'zod';
import { createEmailService } from '@/lib/email/email-service';
import { renderEmailVerification } from '@/lib/email/templates';
import { getDbClient } from '@/db/client';
import { env } from '@/lib/env';

const sql = getDbClient();

const signupSchema = z.object({
  email: z.string().email().optional(),
  phone: z.string().optional(),
  password: z.string().min(8),
  name: z.string().optional(),
}).refine(
  (data) => data.email || data.phone,
  {
    message: 'At least one contact method (email or phone) is required',
  }
);

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validatedData = signupSchema.parse(body);

    // Get IP for rate limiting
    const ip = request.headers.get('x-forwarded-for') || 'unknown';

    // Check rate limit
    const isRateLimited = await checkRateLimit(ip, 'login');
    if (isRateLimited) {
      return NextResponse.json(
        { error: 'Too many signup attempts. Please try again later.' },
        { status: 429 }
      );
    }

    // Validate password strength
    const passwordValidation = validatePasswordStrength(validatedData.password);
    if (!passwordValidation.valid) {
      return NextResponse.json(
        { error: 'Password does not meet requirements', details: passwordValidation.errors },
        { status: 400 }
      );
    }

    // Check if email already exists (if email provided)
    if (validatedData.email) {
      const existingUserByEmail = await sql`
        SELECT id FROM users WHERE LOWER(email) = LOWER(${validatedData.email}) AND deleted_at IS NULL
      `;

      if (existingUserByEmail.length > 0) {
        return NextResponse.json(
          { error: 'Email already registered' },
          { status: 400 }
        );
      }
    }

    // Check if phone already exists (if phone provided)
    if (validatedData.phone) {
      const existingUserByPhone = await sql`
        SELECT id FROM users WHERE LOWER(phone) = LOWER(${validatedData.phone}) AND deleted_at IS NULL
      `;

      if (existingUserByPhone.length > 0) {
        return NextResponse.json(
          { error: 'Phone number already registered' },
          { status: 400 }
        );
      }
    }

    // Hash password
    const passwordHash = await hashPassword(validatedData.password);

    // Generate email verification token (only if email provided)
    let verificationToken = null;
    let verificationTokenHash = null;
    let verificationExpiry = null;
    let verificationUrl = null;

    if (validatedData.email) {
      verificationToken = generateEmailVerificationToken();
      verificationTokenHash = hashToken(verificationToken);
      verificationExpiry = getEmailVerificationExpiry();
      verificationUrl = `${env.NEXT_PUBLIC_APP_URL}/auth/verify-email?token=${verificationToken}`;
    }

    // Create customer user
    const [user] = await sql`
      INSERT INTO users (
        email,
        name,
        phone,
        role,
        password_hash,
        email_verified,
        email_verification_token,
        email_verification_expires_at
      ) VALUES (
        ${validatedData.email || null},
        ${validatedData.name || null},
        ${validatedData.phone || null},
        'customer',
        ${passwordHash},
        false,
        ${verificationTokenHash},
        ${verificationExpiry}
      )
      RETURNING id, email, name, phone, role
    `;

    // Link any existing guest bookings to this new customer account
    let linkedCount = 0;
    if (validatedData.email) {
      const result = await sql`
        UPDATE appointments
        SET customer_id = ${user.id}
        WHERE guest_email = ${validatedData.email}
          AND customer_id IS NULL
          AND deleted_at IS NULL
      `;
      linkedCount = result.count || 0;
    }

    // Also link bookings by phone if provided
    if (validatedData.phone) {
      const result = await sql`
        UPDATE appointments
        SET customer_id = ${user.id}
        WHERE guest_phone = ${validatedData.phone}
          AND customer_id IS NULL
          AND deleted_at IS NULL
      `;
      linkedCount += result.count || 0;
    }

    if (linkedCount > 0) {
      console.log(`Linked ${linkedCount} guest bookings to new customer account ${user.id}`);
    }

    // Send verification email if email was provided
    if (validatedData.email && verificationUrl) {
      const emailService = createEmailService(sql);

      const emailHtml = await renderEmailVerification({
        userName: user.name || 'Customer',
        verificationUrl,
        expiryHours: 24,
      });

      const emailResult = await emailService.sendEmail({
        to: validatedData.email,
        subject: 'Verifica la tua Email - Verify Your Email | Rhivo',
        html: emailHtml,
        templateName: 'email_verification',
        appointmentId: undefined,
      });

      if (!emailResult.success) {
        console.error('Failed to send verification email:', emailResult.error);
        // Note: We still return success because the user was created
        // They can request a new verification email later
      }
    }

    return NextResponse.json({
      message: validatedData.email
        ? 'Account created successfully. Please check your email to verify your account.'
        : 'Account created successfully.',
      requiresVerification: !!validatedData.email,
      user: {
        id: user.id,
        email: user.email,
        phone: user.phone,
        name: user.name,
        role: user.role,
      },
      linkedBookings: linkedCount,
      // NO verificationUrl in response
    }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation failed', details: error.issues },
        { status: 400 }
      );
    }

    console.error('Customer signup error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}