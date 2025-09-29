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
  email: z.string().email(),
  password: z.string().min(8),
  name: z.string().min(1),
  phone: z.string().optional(),
});

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

    // Check if email already exists
    const existingUser = await sql`
      SELECT id FROM users WHERE email = ${validatedData.email} AND deleted_at IS NULL
    `;

    if (existingUser.length > 0) {
      return NextResponse.json(
        { error: 'Email already registered' },
        { status: 400 }
      );
    }

    // Hash password
    const passwordHash = await hashPassword(validatedData.password);

    // Generate email verification token
    const verificationToken = generateEmailVerificationToken();
    const verificationTokenHash = hashToken(verificationToken);
    const verificationExpiry = getEmailVerificationExpiry();

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
        ${validatedData.email},
        ${validatedData.name},
        ${validatedData.phone || null},
        'customer',
        ${passwordHash},
        false,
        ${verificationTokenHash},
        ${verificationExpiry}
      )
      RETURNING id, email, name, role
    `;

    // TODO: Send verification email with token
    const verificationUrl = `${process.env.NEXT_PUBLIC_APP_URL}/auth/verify-email?token=${verificationToken}`;

    return NextResponse.json({
      message: 'Account created successfully. Please verify your email.',
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
      },
      // Remove in production
      verificationUrl,
    }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation failed', details: error.errors },
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