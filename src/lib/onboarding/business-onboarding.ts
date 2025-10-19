/**
 * Business Onboarding Pipeline
 *
 * Automated setup that creates:
 * 1. Business from YAML config
 * 2. Owner account with temporary password
 * 3. Categories and services from YAML
 * 4. Availability schedule from YAML
 * 5. Booking page configuration
 *
 * Ensures complete consistency between YAML, DB, and booking system
 */

import { getDbClient } from '@/db/client';
import { parseTenantConfigYAML, type ParseResult } from '../config/tenant-config-parser';
import { type TenantConfig } from '../config/tenant-schema';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';

export interface OnboardingInput {
  yamlFilePath: string;          // Path to YAML config file
  ownerEmail: string;             // Owner's email for account
  ownerName?: string;             // Owner's name (optional, can come from YAML)
  sendWelcomeEmail?: boolean;     // Whether to send welcome email with credentials
}

export interface OnboardingResult {
  success: boolean;
  businessId?: string;
  ownerId?: string;
  subdomain?: string;
  temporaryPassword?: string;
  verificationUrl?: string;
  bookingPageUrl?: string;
  isExistingOwner?: boolean;      // True if owner email already existed
  businessCount?: number;          // Total businesses owned by this owner
  errors?: string[];
  warnings?: string[];
}

/**
 * Main onboarding function - orchestrates entire setup
 */
export async function onboardBusiness(input: OnboardingInput): Promise<OnboardingResult> {
  const db = getDbClient();
  const errors: string[] = [];
  const warnings: string[] = [];

  try {
    // Step 1: Load and validate YAML config
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

    // Step 2: Check for existing business with same subdomain
    const existingBusiness = await db`
      SELECT id FROM businesses
      WHERE subdomain = ${config.business.id}
      AND deleted_at IS NULL
    `;

    if (existingBusiness.length > 0) {
      return {
        success: false,
        errors: [`Business with subdomain '${config.business.id}' already exists`],
      };
    }

    // Step 3: Check for existing owner email
    const existingUser = await db`
      SELECT id, email, role FROM users
      WHERE email = ${input.ownerEmail}
      AND deleted_at IS NULL
    `;

    const isExistingOwner = existingUser.length > 0;
    let ownerUserId: string | null = null;

    if (isExistingOwner) {
      const user = existingUser[0];

      // Only allow owners to own multiple businesses
      if (user.role !== 'owner') {
        return {
          success: false,
          errors: [`User with email '${input.ownerEmail}' exists but is not an owner (role: ${user.role}). Only owners can manage multiple businesses.`],
        };
      }

      ownerUserId = user.id;
      warnings.push(`Owner account already exists. Adding new business to existing owner: ${input.ownerEmail}`);
    }

    // Step 4: Generate temporary password (only for new owners)
    const tempPassword = isExistingOwner ? null : generateSecurePassword();
    const passwordHash = tempPassword ? await bcrypt.hash(tempPassword, 12) : null;

    // Step 5: Generate email verification token (only for new owners)
    const verificationToken = isExistingOwner ? null : crypto.randomBytes(32).toString('hex');
    const verificationTokenHash = verificationToken ? await bcrypt.hash(verificationToken, 10) : null;
    const verificationExpiry = isExistingOwner ? null : new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

    // Step 6: Create database records (without transaction since Neon doesn't support it)
    try {
      // Create business
      console.log('🏢 Creating business...');
      const [business] = await db`
        INSERT INTO businesses (
          subdomain,
          name,
          timezone,
          config_yaml_path,
          config_version,
          status
        ) VALUES (
          ${config.business.id},
          ${config.business.name},
          ${config.business.timezone},
          ${input.yamlFilePath},
          1,
          'active'
        )
        RETURNING id, subdomain
      `;

      // Create or link owner account
      let owner: { id: string; email: string };

      if (isExistingOwner && ownerUserId) {
        // Use existing owner
        console.log('🔗 Linking business to existing owner account...');
        owner = { id: ownerUserId, email: input.ownerEmail };
      } else {
        // Create new owner account
        console.log('👤 Creating new owner account...');
        const [newOwner] = await db`
          INSERT INTO users (
            email,
            name,
            role,
            business_id,
            password_hash,
            email_verified,
            email_verification_token,
            email_verification_expires_at,
            requires_password_change
          ) VALUES (
            ${input.ownerEmail},
            ${input.ownerName || config.business.name + ' Owner'},
            'owner',
            ${business.id},
            ${passwordHash},
            false,
            ${verificationTokenHash},
            ${verificationExpiry},
            true
          )
          RETURNING id, email
        `;
        owner = newOwner;
      }

      // Create business-owner relationship in junction table
      console.log('🔗 Creating business-owner relationship...');

      // Check if this is the first business for this owner
      const existingBusinesses = await db`
        SELECT COUNT(*) as count
        FROM business_owners
        WHERE user_id = ${owner.id}
      `;
      const isFirstBusiness = existingBusinesses[0].count === '0';

      // Insert into junction table (is_primary = true if first business)
      await db`
        INSERT INTO business_owners (user_id, business_id, is_primary)
        VALUES (${owner.id}, ${business.id}, ${isFirstBusiness})
      `;

      console.log(`✅ Business-owner relationship created (primary: ${isFirstBusiness})`);

      // If this is an existing owner and not their first business, ensure they keep their existing primary
      if (isExistingOwner && !isFirstBusiness) {
        warnings.push(`Business added as secondary business. Owner's primary business remains unchanged.`);
      }

      // Create categories and services from YAML
      console.log('📦 Creating categories and services...');
      for (const category of config.categories) {
        const [dbCategory] = await db`
          INSERT INTO categories (
            id,
            business_id,
            name,
            sort_order
          ) VALUES (
            gen_random_uuid(),
            ${business.id},
            ${category.name},
            ${category.sortOrder}
          )
          RETURNING id
        `;

        // Create services for this category
        for (const service of category.services) {
          await db`
            INSERT INTO services (
              id,
              business_id,
              category_id,
              name,
              duration_minutes,
              price_cents,
              color,
              max_simultaneous_bookings,
              buffer_before_minutes,
              buffer_after_minutes,
              sort_order,
              external_id
            ) VALUES (
              gen_random_uuid(),
              ${business.id},
              ${dbCategory.id},
              ${service.name},
              ${service.duration},
              ${service.price},
              ${service.color || '#14b8a6'},
              ${service.maxSimultaneousBookings ?? config.bookingLimits.maxSimultaneousBookings},
              ${service.bufferBefore || 0},
              ${service.bufferAfter || 0},
              ${service.sortOrder},
              ${service.id}
            )
          `;
        }
      }

      // Create availability schedule from YAML
      console.log('📅 Setting up availability...');
      const dayMap: Record<string, number> = {
        sunday: 0,
        monday: 1,
        tuesday: 2,
        wednesday: 3,
        thursday: 4,
        friday: 5,
        saturday: 6,
      };

      for (const day of config.availability) {
        // Handle slots array (step 7F1/7F2 changes)
        // If day has multiple slots, use first slot's open time and last slot's close time for DB
        if (day.enabled && day.slots && day.slots.length > 0) {
          const firstSlot = day.slots[0];
          const lastSlot = day.slots[day.slots.length - 1];

          await db`
            INSERT INTO availability (
              business_id,
              day_of_week,
              start_time,
              end_time,
              is_closed
            ) VALUES (
              ${business.id},
              ${dayMap[day.day]},
              ${firstSlot.open},
              ${lastSlot.close},
              false
            )
          `;
        } else {
          // Day is disabled (closed)
          await db`
            INSERT INTO availability (
              business_id,
              day_of_week,
              start_time,
              end_time,
              is_closed
            ) VALUES (
              ${business.id},
              ${dayMap[day.day]},
              '00:00',
              '23:59',
              true
            )
          `;
        }
      }

      // Create availability exceptions (holidays, etc.)
      for (const exception of config.availabilityExceptions || []) {
        await db`
          INSERT INTO availability (
            business_id,
            exception_date,
            start_time,
            end_time,
            is_closed
          ) VALUES (
            ${business.id},
            ${exception.date},
            ${exception.open || '00:00'},
            ${exception.close || '23:59'},
            ${exception.closed}
          )
        `;
      }

      console.log('✅ Business setup complete!');
    } catch (dbError) {
      console.error('Database error during onboarding:', dbError);
      throw dbError;
    }

    // Step 7: Get total business count for owner
    const businessCountResult = await db`
      SELECT COUNT(*) as count
      FROM business_owners
      WHERE user_id = ${ownerUserId || (await db`SELECT id FROM users WHERE email = ${input.ownerEmail}`)[0].id}
    `;
    const businessCount = parseInt(businessCountResult[0].count, 10);

    // Step 8: Generate URLs
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    const verificationUrl = verificationToken ? `${baseUrl}/auth/verify-email?token=${verificationToken}` : undefined;
    const bookingPageUrl = `${baseUrl}/book/${config.business.id}`;

    return {
      success: true,
      businessId: config.business.id,
      ownerId: input.ownerEmail,
      subdomain: config.business.id,
      temporaryPassword: tempPassword || undefined,
      verificationUrl,
      bookingPageUrl,
      isExistingOwner,
      businessCount,
      warnings,
    };
  } catch (error) {
    console.error('❌ Onboarding error:', error);
    return {
      success: false,
      errors: [error instanceof Error ? error.message : 'Unknown error occurred'],
      warnings,
    };
  }
}

/**
 * Load YAML config from file
 */
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
      errors: [`Failed to load YAML file: ${error instanceof Error ? error.message : 'Unknown error'}`],
      warnings: [],
    };
  }
}

/**
 * Generate a secure temporary password
 */
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

/**
 * Send welcome email with credentials (placeholder)
 */
export async function sendWelcomeEmail(
  email: string,
  businessName: string,
  temporaryPassword: string,
  verificationUrl: string,
  bookingPageUrl: string
): Promise<void> {
  // TODO: Implement email sending
  console.log(`
📧 Welcome Email (would be sent to ${email}):

Welcome to Rivo, ${businessName}!

Your business has been successfully set up. Here are your details:

🔐 Login Credentials:
   Email: ${email}
   Temporary Password: ${temporaryPassword}

   ⚠️  IMPORTANT: Please change this password on first login!

🔗 Next Steps:
   1. Verify your email: ${verificationUrl}
   2. Login to your dashboard: ${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/auth/login
   3. Your booking page is live at: ${bookingPageUrl}

📚 Resources:
   - Dashboard: Manage your appointments
   - Settings: Customize your business details
   - Support: help@rivo.app

Thank you for choosing Rivo!
  `);
}
