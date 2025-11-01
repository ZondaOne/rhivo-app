import { NextRequest, NextResponse } from 'next/server';
import { getDbClient } from '@/db/client';
import { createEmailService } from '@/lib/email/email-service';
import { v4 as uuidv4 } from 'uuid';

interface PricingInquiryRequest {
  email: string;
  planId: string;
  planName: string;
  newsletterSubscribed: boolean;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json() as PricingInquiryRequest;
    const { email, planId, planName, newsletterSubscribed } = body;

    // Validate required fields
    if (!email || !planId || !planName) {
      return NextResponse.json(
        { error: 'Missing required fields: email, planId, planName' },
        { status: 400 }
      );
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { error: 'Invalid email address' },
        { status: 400 }
      );
    }

    // Collect metadata
    const metadata = {
      userAgent: request.headers.get('user-agent'),
      referer: request.headers.get('referer'),
      ip: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip'),
    };

    // Get database client
    const sql = getDbClient();

    // Check if user has already submitted an inquiry for this plan in the last 7 days
    const existingInquiry = await sql`
      SELECT id, plan_name, created_at
      FROM pricing_inquiries
      WHERE email = ${email}
        AND plan_id = ${planId}
        AND created_at > NOW() - INTERVAL '7 days'
      ORDER BY created_at DESC
      LIMIT 1
    `;

    if (existingInquiry.length > 0) {
      const inquiry = existingInquiry[0];
      const createdAt = new Date(inquiry.created_at);
      const daysAgo = Math.floor((Date.now() - createdAt.getTime()) / (1000 * 60 * 60 * 24));

      return NextResponse.json(
        {
          error: 'duplicate_inquiry',
          message: 'You have already submitted an inquiry for this plan',
          existingInquiry: {
            planName: inquiry.plan_name,
            submittedAt: createdAt.toISOString(),
            daysAgo,
          }
        },
        { status: 409 } // Conflict
      );
    }

    // Store inquiry in database
    const inquiryId = uuidv4();
    await sql`
      INSERT INTO pricing_inquiries (
        id,
        email,
        plan_id,
        plan_name,
        newsletter_subscribed,
        metadata,
        created_at
      ) VALUES (
        ${inquiryId},
        ${email},
        ${planId},
        ${planName},
        ${newsletterSubscribed},
        ${JSON.stringify(metadata)},
        NOW()
      )
    `;

    // Send notification email to team
    const emailService = createEmailService(sql);

    const emailHtml = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <style>
            body {
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Helvetica', 'Arial', sans-serif;
              line-height: 1.6;
              color: #333;
              max-width: 600px;
              margin: 0 auto;
              padding: 20px;
            }
            .header {
              background: linear-gradient(135deg, #14b8a6 0%, #22c55e 100%);
              color: white;
              padding: 30px;
              border-radius: 12px 12px 0 0;
              text-align: center;
            }
            .header h1 {
              margin: 0;
              font-size: 24px;
            }
            .content {
              background: #f9fafb;
              border: 1px solid #e5e7eb;
              border-top: none;
              padding: 30px;
              border-radius: 0 0 12px 12px;
            }
            .info-row {
              margin: 15px 0;
              padding: 12px;
              background: white;
              border-radius: 8px;
              border-left: 3px solid #14b8a6;
            }
            .label {
              font-weight: 600;
              color: #6b7280;
              font-size: 12px;
              text-transform: uppercase;
              letter-spacing: 0.5px;
              margin-bottom: 4px;
            }
            .value {
              color: #111827;
              font-size: 16px;
            }
            .badge {
              display: inline-block;
              background: #dcfce7;
              color: #166534;
              padding: 4px 12px;
              border-radius: 12px;
              font-size: 13px;
              font-weight: 600;
            }
            .footer {
              margin-top: 30px;
              text-align: center;
              color: #6b7280;
              font-size: 12px;
            }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>🎯 New Pricing Inquiry</h1>
          </div>
          <div class="content">
            <p>A new customer has expressed interest in one of our pricing plans!</p>

            <div class="info-row">
              <div class="label">Customer Email</div>
              <div class="value"><strong>${email}</strong></div>
            </div>

            <div class="info-row">
              <div class="label">Interested Plan</div>
              <div class="value"><strong>${planName}</strong> <span class="badge">${planId}</span></div>
            </div>

            <div class="info-row">
              <div class="label">Newsletter Subscription</div>
              <div class="value">${newsletterSubscribed ? '✅ Yes - Opted in' : '❌ No'}</div>
            </div>

            <div class="info-row">
              <div class="label">Inquiry ID</div>
              <div class="value"><code style="background: #f3f4f6; padding: 2px 6px; border-radius: 4px; font-size: 13px;">${inquiryId}</code></div>
            </div>

            ${metadata.referer ? `
              <div class="info-row">
                <div class="label">Referrer</div>
                <div class="value" style="font-size: 13px; word-break: break-all;">${metadata.referer}</div>
              </div>
            ` : ''}

            <div style="margin-top: 25px; padding-top: 25px; border-top: 1px solid #e5e7eb;">
              <p style="margin: 0; color: #6b7280; font-size: 14px;">
                💡 <strong>Next steps:</strong> Reach out to the customer within 24 hours to discuss their needs and provide a personalized quote.
              </p>
            </div>
          </div>
          <div class="footer">
            <p>This is an automated notification from Rhivo Pricing System</p>
          </div>
        </body>
      </html>
    `;

    // Send email notification (non-blocking)
    emailService.sendEmail({
      to: 'team@zonda.one',
      subject: `🎯 New Pricing Inquiry: ${planName} - ${email}`,
      html: emailHtml,
      templateName: 'email_verification', // Reusing existing template type
    }).catch(error => {
      // Log error but don't fail the request
      console.error('Failed to send notification email:', error);
    });

    return NextResponse.json({
      success: true,
      message: 'Inquiry submitted successfully',
      inquiryId,
    });

  } catch (error) {
    console.error('Error processing pricing inquiry:', error);
    return NextResponse.json(
      { error: 'Failed to process inquiry' },
      { status: 500 }
    );
  }
}
