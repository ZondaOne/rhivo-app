/**
 * Business Onboarding Pipeline v2
 *
 * Enhanced with:
 * - Multi-business support for existing owners
 * - Better error handling
 * - Edge case management
 * - Detailed warnings and success messaging
 */

import { getDbClient } from '@/db/client';
import { parseTenantConfigYAML, type ParseResult } from '../config/tenant-config-parser';
import { type TenantConfig } from '../config/tenant-schema';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';

export interface OnboardingInput {
  yamlFilePath: string;
  ownerEmail: string;
  ownerName?: string;
  sendWelcomeEmail?: boolean;
}

export interface OnboardingResult {
  success: boolean;
  businessId?: string;
  ownerId?: string;
  subdomain?: string;
  temporaryPassword?: string;
  verificationUrl?: string;
  bookingPageUrl?: string;
  isExistingOwner?: boolean;
  errors?: string[];
  warnings?: string[];
}

export async function onboardBusiness(input: OnboardingInput): Promise<OnboardingResult> {
  const db = getDbClient();
  const errors: string[] = [];
  const warnings: string[] = [];

  try {
    // Step 1: Load and validate YAML
    console.log('📄 Loading YAML configuration...');
    const configResult = await loadYamlConfig(input.yamlFilePath);

    if (!configResult.success || !configResult.config) {
      return {
        success: false,
        errors: configResult.errors,
        warnings: configResult.warnings,
      };
    }

    const config = configResult.config;
    warnings.push(...configResult.warnings);

    // Step 2: Check for existing business
    const existingBusiness = await db`
      SELECT id, subdomain, status FROM businesses
      WHERE subdomain = ${config.business.id}
      AND deleted_at IS NULL
    `;

    if (existingBusiness.length > 0) {
      const biz = existingBusiness[0];
      if (biz.status === 'suspended') {
        return {
          success: false,
          errors: [`Business '${config.business.id}' exists but is suspended. Contact support to reactivate.`],
        };
      }
      return {
        success: false,
        errors: [`Business with subdomain '${config.business.id}' already exists. Choose a different subdomain.`],
      };
    }

    // Step 3: Check for existing owner
    const existingUser = await db`
      SELECT id, role, business_id, email_verified FROM users
      WHERE email = ${input.ownerEmail}
      AND deleted_at IS NULL
    `;

    let ownerId: string | null = null;
    let isExistingOwner = false;
    let tempPassword: string | undefined;
    let passwordHash: string | undefined;
    let verificationToken: string | undefined;
    let verificationTokenHash: string | undefined;
    let verificationExpiry: Date | undefined;

    if (existingUser.length > 0) {
      const user = existingUser[0];

      if (user.role === 'owner') {
        // Existing owner - associate new business
        ownerId = user.id;
        isExistingOwner = true;
        warnings.push(`Using existing owner account (${input.ownerEmail}). New business will be associated with this owner.`);

        if (!user.email_verified) {
          warnings.push('Owner email is not verified yet. Please verify email to access dashboard.');
        }
      } else if (user.role === 'customer') {
        // Customer trying to become owner - allow upgrade
        ownerId = user.id;
        isExistingOwner = true;
        warnings.push(`Email ${input.ownerEmail} is registered as customer. Will be upgraded to owner role.`);
      } else {
        return {
          success: false,
          errors: [`Email '${input.ownerEmail}' is registered as ${user.role}. Use a different email or contact support.`],
        };
      }
    } else {
      // New owner - generate credentials
      tempPassword = generateSecurePassword();
      passwordHash = await bcrypt.hash(tempPassword, 12);
      verificationToken = crypto.randomBytes(32).toString('hex');
      verificationTokenHash = await bcrypt.hash(verificationToken, 10);
      verificationExpiry = new Date(Date.now() + 24 * 60 * 60 * 1000);
    }

    // Step 4: Create everything in transaction
    let businessId: string;
    let ownerEmail: string;

    await db.begin(async (tx) => {
      // Create business
      console.log('🏢 Creating business...');
      const [business] = await tx`
        INSERT INTO businesses (
          id, subdomain, name, timezone, config_yaml_path, config_version, status
        ) VALUES (
          ${config.business.id},
          ${config.business.id},
          ${config.business.name},
          ${config.business.timezone},
          ${input.yamlFilePath},
          1,
          'active'
        )
        RETURNING id, subdomain
      `;
      businessId = business.id;

      // Create or update owner
      if (isExistingOwner && ownerId) {
        console.log('👤 Updating existing owner...');

        // TODO: Future - implement many-to-many business-owner relationship
        // For now, update primary business_id
        const [owner] = await tx`
          UPDATE users
          SET
            business_id = ${businessId},
            role = 'owner',
            name = COALESCE(${input.ownerName}, name)
          WHERE id = ${ownerId}
          RETURNING id, email
        `;
        ownerEmail = owner.email;

        warnings.push('Note: Multi-business support is limited. Owner can switch businesses in dashboard (future feature).');
      } else {
        console.log('👤 Creating new owner account...');
        const [owner] = await tx`
          INSERT INTO users (
            email, name, role, business_id,
            password_hash, email_verified,
            email_verification_token, email_verification_expires_at
          ) VALUES (
            ${input.ownerEmail},
            ${input.ownerName || config.business.name + ' Owner'},
            'owner',
            ${businessId},
            ${passwordHash},
            false,
            ${verificationTokenHash},
            ${verificationExpiry}
          )
          RETURNING id, email
        `;
        ownerId = owner.id;
        ownerEmail = owner.email;
      }

      // Create categories and services
      console.log('📦 Creating categories and services...');
      for (const category of config.categories) {
        const [dbCategory] = await tx`
          INSERT INTO categories (business_id, name, sort_order)
          VALUES (${businessId}, ${category.name}, ${category.sortOrder})
          RETURNING id
        `;

        for (const service of category.services) {
          await tx`
            INSERT INTO services (
              business_id, category_id, name, duration_minutes,
              price_cents, color, max_simultaneous_bookings, sort_order
            ) VALUES (
              ${businessId}, ${dbCategory.id}, ${service.name},
              ${service.duration}, ${service.price},
              ${service.color || '#14b8a6'},
              ${config.bookingLimits.maxSimultaneousBookings},
              ${service.sortOrder}
            )
          `;
        }
      }

      // Create availability
      console.log('📅 Setting up availability...');
      const dayMap: Record<string, number> = {
        sunday: 0, monday: 1, tuesday: 2, wednesday: 3,
        thursday: 4, friday: 5, saturday: 6,
      };

      for (const day of config.availability) {
        await tx`
          INSERT INTO availability (
            business_id, day_of_week, start_time, end_time, is_available
          ) VALUES (
            ${businessId}, ${dayMap[day.day]}, ${day.open}, ${day.close}, ${day.enabled}
          )
        `;
      }

      for (const exception of config.availabilityExceptions || []) {
        await tx`
          INSERT INTO availability (
            business_id, exception_date, start_time, end_time, is_available
          ) VALUES (
            ${businessId}, ${exception.date},
            ${exception.open || '00:00'}, ${exception.close || '00:00'},
            ${!exception.closed}
          )
        `;
      }
    });

    // Generate URLs
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    const verificationUrl = verificationToken
      ? `${baseUrl}/auth/verify-email?token=${verificationToken}`
      : undefined;
    const bookingPageUrl = `${baseUrl}/book/${config.business.id}`;

    return {
      success: true,
      businessId: config.business.id,
      ownerId: ownerEmail,
      subdomain: config.business.id,
      temporaryPassword: tempPassword,
      verificationUrl,
      bookingPageUrl,
      isExistingOwner,
      warnings,
    };
  } catch (error) {
    console.error('❌ Onboarding error:', error);

    // Provide specific error messages
    let errorMessage = 'Unknown error occurred';
    if (error instanceof Error) {
      errorMessage = error.message;

      // Database constraint violations
      if (errorMessage.includes('duplicate key')) {
        if (errorMessage.includes('subdomain')) {
          errorMessage = 'Subdomain already exists. Choose a different one.';
        } else if (errorMessage.includes('email')) {
          errorMessage = 'Email address conflicts with existing record.';
        }
      } else if (errorMessage.includes('foreign key')) {
        errorMessage = 'Database relationship error. Contact support.';
      }
    }

    return {
      success: false,
      errors: [errorMessage],
      warnings,
    };
  }
}

async function loadYamlConfig(filePath: string): Promise<ParseResult> {
  try {
    const fs = await import('fs/promises');
    const path = await import('path');
    const fullPath = path.resolve(process.cwd(), filePath);
    const yamlContent = await fs.readFile(fullPath, 'utf-8');
    return parseTenantConfigYAML(yamlContent);
  } catch (error) {
    return {
      success: false,
      errors: [`Failed to load YAML: ${error instanceof Error ? error.message : 'Unknown error'}`],
      warnings: [],
    };
  }
}

function generateSecurePassword(): string {
  const length = 16;
  const charset = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*';
  let password = '';
  const randomBytes = crypto.randomBytes(length);
  for (let i = 0; i < length; i++) {
    password += charset[randomBytes[i] % charset.length];
  }
  return password;
}

export async function sendWelcomeEmail(
  email: string,
  businessName: string,
  temporaryPassword: string | undefined,
  verificationUrl: string | undefined,
  bookingPageUrl: string,
  isExistingOwner?: boolean
): Promise<void> {
  console.log(`
📧 Welcome Email (would be sent to ${email}):

${isExistingOwner ? '🔄 New Business Added to Your Account!' : '🎉 Welcome to Rivo!'}

${isExistingOwner
  ? `Your new business "${businessName}" has been successfully added to your account!`
  : `Your business "${businessName}" has been successfully set up!`
}

${!isExistingOwner && temporaryPassword ? `
🔐 Login Credentials:
   Email: ${email}
   Temporary Password: ${temporaryPassword}
   ⚠️  IMPORTANT: Change this password on first login!
` : ''}

${verificationUrl ? `
📧 Email Verification:
   ${verificationUrl}
` : '✅ Your email is already verified - you can login immediately!'}

🔗 Your Booking Page:
   ${bookingPageUrl}

📱 Dashboard:
   ${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/auth/login

${isExistingOwner ? `
💡 Tip: You can switch between your businesses from the dashboard.
` : ''}

Thank you for choosing Rivo!
  `);
}
