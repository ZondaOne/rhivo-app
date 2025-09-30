import { NextRequest, NextResponse } from 'next/server';
import { neon } from '@neondatabase/serverless';
import { hashPassword, validatePasswordStrength } from '@/lib/auth/password';
import {
  generateEmailVerificationToken,
  getEmailVerificationExpiry,
  hashToken,
  generateAccessToken,
  generateRefreshToken,
} from '@/lib/auth/tokens';
import { checkRateLimit } from '@/lib/auth/rate-limit';
import { z } from 'zod';

const sql = neon(process.env.DATABASE_URL!);

const signupSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  name: z.string().min(1),
  businessName: z.string().min(1),
  businessPhone: z.string().optional(),
  timezone: z.string().min(1),
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

    // Create business and owner user
    // Create business first
    const [business] = await sql`
      INSERT INTO businesses (
        name,
        subdomain,
        timezone,
        config_yaml_path,
        status
      ) VALUES (
        ${validatedData.businessName},
        ${generateSubdomain(validatedData.businessName)},
        ${validatedData.timezone},
        ${`/configs/${generateSubdomain(validatedData.businessName)}.yaml`},
        'active'
      )
      RETURNING id, subdomain
    `;

    // Create owner user
    const [user] = await sql`
      INSERT INTO users (
        email,
        name,
        phone,
        role,
        business_id,
        password_hash,
        email_verified,
        email_verification_token,
        email_verification_expires_at
      ) VALUES (
        ${validatedData.email},
        ${validatedData.name},
        ${validatedData.businessPhone || null},
        'owner',
        ${business.id},
        ${passwordHash},
        false,
        ${verificationTokenHash},
        ${verificationExpiry}
      )
      RETURNING id, email, name, role
    `;

    const result = { business, user };

    // Generate tokens for testing (in production, only after email verification)
    const accessToken = generateAccessToken({
      sub: user.id,
      email: user.email,
      role: 'owner',
      business_id: business.id,
    });

    const refreshToken = generateRefreshToken();

    // Store refresh token
    await sql`
      INSERT INTO refresh_tokens (user_id, token_hash, expires_at)
      VALUES (${user.id}, ${hashToken(refreshToken)}, NOW() + INTERVAL '30 days')
    `;

    // TODO: Send verification email with token
    // For now, return the token in response (development only)
    const verificationUrl = `${process.env.NEXT_PUBLIC_APP_URL}/auth/verify-email?token=${verificationToken}`;

    return NextResponse.json({
      message: 'Account created successfully. Please verify your email.',
      user: {
        id: result.user.id,
        email: result.user.email,
        name: result.user.name,
        role: result.user.role,
      },
      business: {
        id: result.business.id,
        subdomain: result.business.subdomain,
      },
      // Tokens for testing (remove after implementing email verification flow)
      accessToken,
      refreshToken,
      // Remove in production
      verificationUrl,
    }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation failed', details: error.issues },
        { status: 400 }
      );
    }

    console.error('Signup error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * Generate subdomain from business name
 */
function generateSubdomain(businessName: string): string {
  return businessName
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .substring(0, 63);
}