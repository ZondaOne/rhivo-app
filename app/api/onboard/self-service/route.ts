import { NextRequest, NextResponse } from 'next/server';
import { getDbClient } from '@/db/client';
import { generateYAML, validateOnboardingForm, type OnboardingFormData } from '@/lib/onboarding/yaml-generator';
import { validateSubdomain } from '@/lib/validation/subdomain';
import { onboardBusiness } from '@/lib/onboarding/business-onboarding';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { stringify } from 'yaml';

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

    // Step 3: Generate YAML config
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
    console.log('✅ YAML config generated successfully');

    // Save YAML to file
    const yamlPath = `config/tenants/${formData.businessId}.yaml`;
    try {
      const fs = await import('fs/promises');
      const path = await import('path');
      const fullPath = path.resolve(process.cwd(), yamlPath);

      // Ensure directory exists
      const dir = path.dirname(fullPath);
      await fs.mkdir(dir, { recursive: true });

      // Write YAML file
      await fs.writeFile(fullPath, yamlResult.yaml, 'utf-8');
      console.log('✅ YAML file saved:', yamlPath);
    } catch (err) {
      console.error('Failed to save YAML file:', err);
      // Continue anyway - not critical
    }

    // Step 4: Check for existing owner
    const existingUser = await db`
      SELECT id, email, role, email_verified
      FROM users
      WHERE email = ${formData.email}
      AND deleted_at IS NULL
    `;

    const isExistingOwner = existingUser.length > 0;
    let ownerUserId: string | null = null;
    let requiresAuth = false;

    // Step 5: Handle owner account
    if (isExistingOwner) {
      const user = existingUser[0];

      // If password provided, it's a login attempt for existing owner
      if (formData.password) {
        // Authenticate
        const [userWithPassword] = await db`
          SELECT password_hash FROM users WHERE id = ${user.id}
        `;

        if (!userWithPassword.password_hash) {
          return NextResponse.json(
            { success: false, errors: { auth: 'Invalid credentials' } },
            { status: 401 }
          );
        }

        const passwordValid = await bcrypt.compare(formData.password, userWithPassword.password_hash);
        if (!passwordValid) {
          return NextResponse.json(
            { success: false, errors: { auth: 'Invalid credentials' } },
            { status: 401 }
          );
        }

        // Check role
        if (user.role !== 'owner') {
          return NextResponse.json(
            { success: false, errors: { auth: 'Only owners can register businesses' } },
            { status: 403 }
          );
        }

        ownerUserId = user.id;
      } else {
        // Existing user but no password provided - return error asking for login
        return NextResponse.json(
          {
            success: false,
            errors: {
              email: 'An account with this email already exists. Please login with your password.'
            },
            requiresAuth: true,
          },
          { status: 409 }
        );
      }
    } else {
      // New owner - must have password
      if (!formData.password) {
        return NextResponse.json(
          { success: false, errors: { password: 'Password is required for new accounts' } },
          { status: 400 }
        );
      }
    }

    // Step 6: Create business and owner account
    console.log('🏢 Creating business...');

    const tempPassword = isExistingOwner ? null : formData.password;
    const passwordHash = !isExistingOwner ? await bcrypt.hash(formData.password!, 12) : null;
    const verificationToken = !isExistingOwner ? crypto.randomBytes(32).toString('hex') : null;
    const verificationTokenHash = verificationToken ? await bcrypt.hash(verificationToken, 10) : null;
    const verificationExpiry = !isExistingOwner ? new Date(Date.now() + 24 * 60 * 60 * 1000) : null;

    try {
      // Create business
      const [business] = await db`
        INSERT INTO businesses (
          subdomain,
          name,
          timezone,
          config_yaml_path,
          config_version,
          status
        ) VALUES (
          ${formData.businessId},
          ${formData.businessName},
          ${formData.timezone},
          ${yamlPath},
          1,
          'active'
        )
        RETURNING id, subdomain
      `;

      // Create or link owner
      let owner: { id: string; email: string };

      if (isExistingOwner && ownerUserId) {
        owner = { id: ownerUserId, email: formData.email };
      } else {
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
        owner = newOwner;
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
            ${day.open},
            ${day.close},
            ${!day.enabled}
          )
        `;
      }

      // Generate URLs
      const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
      const verificationUrl = verificationToken ? `${baseUrl}/auth/verify-email?token=${verificationToken}` : undefined;
      const bookingPageUrl = `${baseUrl}/book/${formData.businessId}`;

      // Return success
      return NextResponse.json({
        success: true,
        businessId: business.id,
        subdomain: formData.businessId,
        verificationUrl,
        bookingPageUrl,
        isExistingOwner,
        message: isExistingOwner
          ? 'Business created successfully and linked to your account!'
          : 'Business created! Please verify your email to activate your account.',
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
