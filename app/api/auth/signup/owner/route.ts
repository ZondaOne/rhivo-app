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
import { validateSubdomainFormat, checkSubdomainAvailability } from '@/lib/validation/subdomain';

const sql = getDbClient();

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

    // Generate unique subdomain with collision handling
    const subdomain = await generateUniqueSubdomain(validatedData.businessName);

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
        ${subdomain},
        ${validatedData.timezone},
        ${`/configs/${subdomain}.yaml`},
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

    // Send verification email
    const emailService = createEmailService(sql);
    const verificationUrl = `${env.NEXT_PUBLIC_APP_URL}/auth/verify-email?token=${verificationToken}`;

    const emailHtml = await renderEmailVerification({
      userName: user.name,
      verificationUrl,
      expiryHours: 24,
    });

    const emailResult = await emailService.sendEmail({
      to: user.email,
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

    // DO NOT return tokens until email is verified
    return NextResponse.json({
      message: 'Account created successfully. Please check your email to verify your account.',
      requiresVerification: true,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
      },
      // NO tokens, NO verificationUrl
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
 * Generate unique subdomain from business name with collision handling
 * If base subdomain is taken, appends random suffix (e.g., "blues-barber-a3x9")
 */
async function generateUniqueSubdomain(businessName: string): Promise<string> {
  // Generate base subdomain from business name
  const baseSubdomain = businessName
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .substring(0, 63);

  // Check format validity
  const formatCheck = validateSubdomainFormat(baseSubdomain);
  if (!formatCheck.valid) {
    // If base format is invalid, throw error - business name is too problematic
    throw new Error(`Cannot generate valid subdomain from business name: ${formatCheck.error}`);
  }

  // Check if base subdomain is available
  const availabilityCheck = await checkSubdomainAvailability(baseSubdomain);
  if (availabilityCheck.available) {
    return baseSubdomain;
  }

  // Base is taken - try with random suffix (max 10 attempts)
  for (let attempt = 0; attempt < 10; attempt++) {
    // Generate 4-character random suffix (alphanumeric)
    const suffix = Math.random().toString(36).substring(2, 6);
    const candidateSubdomain = `${baseSubdomain}-${suffix}`.substring(0, 63);

    const candidateCheck = await checkSubdomainAvailability(candidateSubdomain);
    if (candidateCheck.available) {
      return candidateSubdomain;
    }
  }

  // If still no luck after 10 attempts, use timestamp-based suffix
  const timestamp = Date.now().toString(36);
  return `${baseSubdomain}-${timestamp}`.substring(0, 63);
}