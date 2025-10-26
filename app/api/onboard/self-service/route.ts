import { NextRequest, NextResponse } from 'next/server';
import { getDbClient } from '@/db/client';
import { generateYAML, validateOnboardingForm, type OnboardingFormData } from '@/lib/onboarding/yaml-generator';
import { validateSubdomain } from '@/lib/validation/subdomain';
import { onboardBusiness } from '@/lib/onboarding/business-onboarding';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { stringify } from 'yaml';
import { createEmailService } from '@/lib/email/email-service';
import { renderEmailVerification } from '@/lib/email/templates';
import { hashToken } from '@/lib/auth/tokens';

/**
 * POST /api/onboard/self-service
 * Self-service business registration endpoint
 *
 * This endpoint handles the complete flow:
 * 1. Validate form data
 * 2. Check subdomain availability
 * 3. Create or authenticate owner account
 * 4. Generate YAML config from form data
 * 5. Create business and services in database
 * 6. Send verification email (if new owner)
 */
export async function POST(request: NextRequest) {
  const db = getDbClient();

  try {
    const formData: OnboardingFormData = await request.json();

    console.log('📥 Received form data:', JSON.stringify(formData, null, 2));

    // Step 1: Validate form data
    console.log('📋 Validating form data...');
    const validation = validateOnboardingForm(formData);
    console.log('Validation result:', validation);
    if (!validation.valid) {
      return NextResponse.json(
        { success: false, errors: validation.errors },
        { status: 400 }
      );
    }

    // Step 2: Validate subdomain
    console.log('🔍 Checking subdomain availability...');
    const subdomainCheck = await validateSubdomain(formData.businessId);
    if (!subdomainCheck.valid || !subdomainCheck.available) {
      return NextResponse.json(
        { success: false, errors: { subdomain: subdomainCheck.error || 'Subdomain not available' } },
        { status: 400 }
      );
    }

    // Step 3: Generate YAML config (in-memory only, don't write to disk yet)
    console.log('📝 Generating YAML configuration...');
    const yamlResult = generateYAML(formData);
    console.log('YAML generation result:', yamlResult.success ? 'success' : 'failed');
    if (!yamlResult.success) {
      console.error('YAML errors:', yamlResult.errors);
    }
    if (!yamlResult.success || !yamlResult.config || !yamlResult.yaml) {
      return NextResponse.json(
        { success: false, errors: { yaml: yamlResult.errors || ['Failed to generate config'] } },
        { status: 400 }
      );
    }
    console.log('✅ YAML config generated successfully (not saved yet)');

    // NOTE: YAML file will be saved AFTER successful database creation to prevent orphaned files

    const yamlPath = `config/tenants/${formData.businessId}.yaml`;

    // Step 4: Check for existing owner
    console.log('🔍 Checking for existing owner with email:', formData.email);
    const existingUser = await db`
      SELECT id, email, role, email_verified
      FROM users
      WHERE email = ${formData.email}
      AND deleted_at IS NULL
    `;

    let isExistingOwner = existingUser.length > 0;
    console.log('Existing owner?', isExistingOwner);
    let ownerUserId: string | null = null;
    let requiresAuth = false;

    // Step 5: Handle owner account
    if (isExistingOwner) {
      console.log('Found existing user:', existingUser[0]);
      const user = existingUser[0];

      // Check if user is a customer trying to become an owner
      if (user.role === 'customer') {
        console.log('Customer trying to register as business owner - treating as new owner');
        // Treat as new owner registration - customer accounts are separate from owner accounts
        // Customer will upgrade to owner role with a password
        if (!formData.password) {
          return NextResponse.json(
            { success: false, errors: { password: 'Password is required to create a business account' } },
            { status: 400 }
          );
        }
        // Will create new owner account below
        ownerUserId = null; // Force new owner creation
        isExistingOwner = false; // Treat as new owner for password generation
      } else if (user.role === 'owner') {
        // Existing owner - authenticate
        if (!formData.password) {
          return NextResponse.json(
            {
              success: false,
              errors: {
                email: 'An owner account with this email already exists. Please login with your password.'
              },
              requiresAuth: true,
            },
            { status: 409 }
          );
        }

        console.log('Password provided for existing owner - authenticating...');
        // Authenticate
        const [userWithPassword] = await db`
          SELECT password_hash FROM users WHERE id = ${user.id}
        `;

        if (!userWithPassword.password_hash) {
          console.error('Owner has no password hash in database');
          return NextResponse.json(
            { success: false, errors: { auth: 'Invalid credentials - password not set' } },
            { status: 401 }
          );
        }

        const passwordValid = await bcrypt.compare(formData.password, userWithPassword.password_hash);
        console.log('Password valid?', passwordValid);
        if (!passwordValid) {
          return NextResponse.json(
            { success: false, errors: { auth: 'Invalid credentials' } },
            { status: 401 }
          );
        }

        ownerUserId = user.id;
      } else {
        // Unknown role
        return NextResponse.json(
          { success: false, errors: { auth: 'Invalid account type' } },
          { status: 403 }
        );
      }
    } else {
      console.log('New user registration - creating account');
      // New owner - must have password
      if (!formData.password) {
        return NextResponse.json(
          { success: false, errors: { password: 'Password is required for new accounts' } },
          { status: 400 }
        );
      }
      console.log('Password provided for new user ✓');
    }

    // Step 6: Create business and owner account
    console.log('🏢 Creating business...');

    const tempPassword = isExistingOwner ? null : formData.password;
    const passwordHash = !isExistingOwner ? await bcrypt.hash(formData.password!, 12) : null;
    const verificationToken = !isExistingOwner ? crypto.randomBytes(32).toString('hex') : null;
    const verificationTokenHash = verificationToken ? hashToken(verificationToken) : null;
    const verificationExpiry = !isExistingOwner ? new Date(Date.now() + 24 * 60 * 60 * 1000) : null;

    try {
      // Create business with YAML config stored in database
      const [business] = await db`
        INSERT INTO businesses (
          subdomain,
          name,
          timezone,
          config_yaml_path,
          config_yaml,
          config_version,
          status
        ) VALUES (
          ${formData.businessId},
          ${formData.businessName},
          ${formData.timezone},
          ${yamlPath},
          ${yamlResult.yaml},
          1,
          'active'
        )
        RETURNING id, subdomain
      `;

      // Create or link owner
      let owner: { id: string; email: string };

      if (isExistingOwner && ownerUserId) {
        // Existing owner linking to new business
        owner = { id: ownerUserId, email: formData.email };
      } else {
        // New owner OR customer upgrading to owner
        // Check if a customer record exists that we need to upgrade
        const existingCustomer = await db`
          SELECT id FROM users 
          WHERE email = ${formData.email} 
          AND role = 'customer' 
          AND deleted_at IS NULL
        `;

        if (existingCustomer.length > 0) {
          // Upgrade existing customer to owner
          console.log('Upgrading customer to owner role');
          const [upgradedOwner] = await db`
            UPDATE users
            SET 
              role = 'owner',
              name = ${formData.ownerName},
              password_hash = ${passwordHash},
              email_verification_token = ${verificationTokenHash},
              email_verification_expires_at = ${verificationExpiry}
            WHERE id = ${existingCustomer[0].id}
            RETURNING id, email
          `;
          owner = { id: upgradedOwner.id, email: upgradedOwner.email };
        } else {
          // Create completely new owner
          console.log('Creating new owner account');
          const [newOwner] = await db`
            INSERT INTO users (
              email,
              name,
              role,
              business_id,
              password_hash,
              email_verified,
              email_verification_token,
              email_verification_expires_at
            ) VALUES (
              ${formData.email},
              ${formData.ownerName},
              'owner',
              ${business.id},
              ${passwordHash},
              false,
              ${verificationTokenHash},
              ${verificationExpiry}
            )
            RETURNING id, email
          `;
          owner = { id: newOwner.id, email: newOwner.email };
        }
      }

      // Create business-owner relationship
      const existingBusinesses = await db`
        SELECT COUNT(*) as count
        FROM business_owners
        WHERE user_id = ${owner.id}
      `;
      const isFirstBusiness = existingBusinesses[0].count === '0';

      await db`
        INSERT INTO business_owners (user_id, business_id, is_primary)
        VALUES (${owner.id}, ${business.id}, ${isFirstBusiness})
      `;

      // Create default category and service
      const config = yamlResult.config;
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
              ${config.bookingLimits.maxSimultaneousBookings},
              ${service.sortOrder},
              ${service.id}
            )
          `;
        }
      }

      // Create availability schedule
      const dayMap: Record<string, number> = {
        sunday: 0,
        monday: 1,
        tuesday: 2,
        wednesday: 3,
        thursday: 4,
        friday: 5,
        saturday: 6,
      };

      for (const day of formData.availability) {
        // Only insert availability for enabled days with slots
        // Closed days (enabled=false) are represented by the absence of records
        if (day.enabled && day.slots && day.slots.length > 0) {
          // Insert each time slot for the day
          for (const slot of day.slots) {
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
                ${slot.open},
                ${slot.close},
                false
              )
            `;
          }
        }
        // Note: Closed days (enabled=false) don't get any records
        // The absence of an availability record means the business is closed that day
      }

      // Generate URLs
      const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
      const bookingPageUrl = `${baseUrl}/book/${formData.businessId}`;

      // Send verification email for new owners
      if (!isExistingOwner && verificationToken) {
        try {
          const emailService = createEmailService(db);
          const verificationUrl = `${baseUrl}/auth/verify-email?token=${verificationToken}`;
          const emailHtml = await renderEmailVerification({
            userName: formData.ownerName,
            verificationUrl,
            expiryHours: 24,
          });

          await emailService.sendEmail({
            to: formData.email,
            subject: 'Verify your Rhivo account',
            html: emailHtml,
            templateName: 'email_verification',
            appointmentId: undefined,
          });

          console.log('✅ Verification email sent to:', formData.email);
        } catch (emailError) {
          console.error('❌ Failed to send verification email:', emailError);
          // Don't fail the whole request if email fails - user can resend later
        }
      }

      // OPTIONALLY save YAML file for local development (not required for production)
      // Production uses database-stored config (config_yaml column)
      try {
        const fs = await import('fs/promises');
        const path = await import('path');
        const fullPath = path.resolve(process.cwd(), yamlPath);

        // Ensure directory exists
        const dir = path.dirname(fullPath);
        await fs.mkdir(dir, { recursive: true });

        // Write YAML file (best effort, not critical)
        await fs.writeFile(fullPath, yamlResult.yaml, 'utf-8');
        console.log('✅ YAML file saved to filesystem (local copy):', yamlPath);
      } catch (err) {
        console.warn('⚠️ Could not save YAML to filesystem (not critical, using database):', err);
        // Don't fail - config is stored in database
      }

      // Return success (NO verification URL in response for security)
      return NextResponse.json({
        success: true,
        businessId: business.id,
        subdomain: formData.businessId,
        bookingPageUrl,
        requiresVerification: !isExistingOwner,
        email: formData.email,
        message: isExistingOwner
          ? 'Business created successfully and linked to your account!'
          : 'Business created! Please check your email to verify your account.',
      });

    } catch (dbError) {
      console.error('Database error during onboarding:', dbError);
      return NextResponse.json(
        { success: false, errors: { database: 'Failed to create business. Please try again.' } },
        { status: 500 }
      );
    }

  } catch (error) {
    console.error('Onboarding error:', error);
    return NextResponse.json(
      { success: false, errors: { general: 'An unexpected error occurred' } },
      { status: 500 }
    );
  }
}
