import { NextRequest, NextResponse } from 'next/server';
import { onboardBusiness, sendWelcomeEmail } from '@/lib/onboarding/business-onboarding';
import { z } from 'zod';

const onboardSchema = z.object({
  yamlFilePath: z.string().min(1, 'YAML file path is required'),
  ownerEmail: z.string().email('Valid email is required'),
  ownerName: z.string().optional(),
  sendWelcomeEmail: z.boolean().default(true),
});

/**
 * POST /api/admin/onboard-business
 *
 * Automated business onboarding endpoint.
 * Creates business, owner account, services, and availability from YAML config.
 *
 * ⚠️  TODO: Add admin authentication to this endpoint!
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const data = onboardSchema.parse(body);

    // TODO: Verify admin authentication here
    // const { isAdmin } = await verifyAdminToken(request);
    // if (!isAdmin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const result = await onboardBusiness({
      yamlFilePath: data.yamlFilePath,
      ownerEmail: data.ownerEmail,
      ownerName: data.ownerName,
      sendWelcomeEmail: data.sendWelcomeEmail,
    });

    if (!result.success) {
      return NextResponse.json(
        {
          success: false,
          errors: result.errors,
          warnings: result.warnings,
        },
        { status: 400 }
      );
    }

    // Send welcome email if requested
    if (data.sendWelcomeEmail && result.temporaryPassword) {
      await sendWelcomeEmail(
        data.ownerEmail,
        result.subdomain!,
        result.temporaryPassword,
        result.verificationUrl!,
        result.bookingPageUrl!
      );
    }

    return NextResponse.json({
      success: true,
      businessId: result.businessId,
      subdomain: result.subdomain,
      temporaryPassword: result.temporaryPassword,
      verificationUrl: result.verificationUrl,
      bookingPageUrl: result.bookingPageUrl,
      warnings: result.warnings,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          success: false,
          errors: error.errors.map(e => `${e.path.join('.')}: ${e.message}`),
        },
        { status: 400 }
      );
    }

    console.error('Onboarding error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Internal server error',
      },
      { status: 500 }
    );
  }
}
