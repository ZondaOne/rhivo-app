import { NextRequest, NextResponse } from 'next/server';
import { neon } from '@neondatabase/serverless';
import { hashPassword, validatePasswordStrength } from '@/lib/auth/password';
import {
  generateEmailVerificationToken,
  getEmailVerificationExpiry,
  hashToken,
} from '@/lib/auth/tokens';
import { checkRateLimit } from '@/lib/auth/rate-limit';
import { z } from 'zod';

const sql = neon(process.env.DATABASE_URL!);

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
      verificationUrl = `${process.env.NEXT_PUBLIC_APP_URL}/auth/verify-email?token=${verificationToken}`;
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

    // TODO: Send verification email with token after debugging phase
    // Currently skipping email verification for frictionless UX during development

    return NextResponse.json({
      message: 'Account created successfully',
      user: {
        id: user.id,
        email: user.email,
        phone: user.phone,
        name: user.name,
        role: user.role,
      },
      linkedBookings: linkedCount,
      // Remove in production - for debugging only
      ...(verificationUrl && { verificationUrl }),
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