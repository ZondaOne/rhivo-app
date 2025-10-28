import { Resend } from 'resend';
import { DbClient } from '@/db/client';
import { v4 as uuidv4 } from 'uuid';
import { env } from '@/lib/env';

// Lazy initialization of Resend client to ensure env vars are loaded
let resendClient: Resend | null = null;
function getResendClient(): Resend {
  if (!resendClient) {
    resendClient = new Resend(env.RESEND_API_KEY);
  }
  return resendClient;
}

export type EmailTemplate =
  | 'appointment_confirmed'
  | 'appointment_cancelled'
  | 'appointment_rescheduled'
  | 'appointment_reminder'
  | 'email_verification';

export interface SendEmailParams {
  to: string;
  subject: string;
  html: string;
  templateName: EmailTemplate;
  appointmentId?: string;
}

export interface EmailDeliveryResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

/**
 * Email Service
 *
 * Handles sending emails via Resend and logging delivery status.
 * Implements immediate delivery with retry logic and exponential backoff.
 *
 * TODO: If email volume grows significantly, refactor to use a queue-based worker system
 */
export class EmailService {
  constructor(private db: DbClient) {}

  /**
   * Send an email and log the delivery attempt
   * Implements retry logic with exponential backoff for transient failures
   */
  async sendEmail(params: SendEmailParams): Promise<EmailDeliveryResult> {
    const { to, subject, html, templateName, appointmentId } = params;

    console.log(`🔔 EmailService.sendEmail called for template: ${templateName}, recipient: ${to}`);

    const maxRetries = 3;
    const baseDelay = 1000; // 1 second

    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        console.log('📨 Calling Resend API:', { to, subject, from: env.EMAIL_FROM });

        // Send email via Resend
        // Use Resend's onboarding domain for testing (or your verified domain)
        const fromEmail = env.EMAIL_FROM || 'Rhivo <onboarding@resend.dev>';

        const resend = getResendClient();
        const { data, error } = await resend.emails.send({
          from: fromEmail,
          to,
          subject,
          html,
        });

        console.log('📬 Resend API response:', { data, error });

        if (error) {
          console.error('❌ Resend API error:', error);
          throw new Error(error.message || 'Failed to send email');
        }

        console.log('✅ Email sent successfully via Resend. Message ID:', data?.id);

        // Log successful delivery
        await this.logEmailDelivery({
          appointmentId,
          recipientEmail: to,
          templateName,
          status: 'sent',
          attempts: attempt + 1,
          messageId: data?.id,
        });

        return {
          success: true,
          messageId: data?.id,
        };

      } catch (error) {
        const isLastAttempt = attempt === maxRetries - 1;
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';

        // Log failed attempt
        await this.logEmailDelivery({
          appointmentId,
          recipientEmail: to,
          templateName,
          status: isLastAttempt ? 'failed' : 'retrying',
          attempts: attempt + 1,
          errorMessage,
        });

        // If not last attempt, wait with exponential backoff
        if (!isLastAttempt) {
          const delay = baseDelay * Math.pow(2, attempt);
          await new Promise(resolve => setTimeout(resolve, delay));
          continue;
        }

        // Last attempt failed
        return {
          success: false,
          error: errorMessage,
        };
      }
    }

    return {
      success: false,
      error: 'Max retries exceeded',
    };
  }

  /**
   * Log email delivery attempt to notification_logs table
   */
  private async logEmailDelivery(params: {
    appointmentId?: string;
    recipientEmail: string;
    templateName: EmailTemplate;
    status: 'sent' | 'failed' | 'retrying';
    attempts: number;
    messageId?: string;
    errorMessage?: string;
  }): Promise<void> {
    const {
      appointmentId,
      recipientEmail,
      templateName,
      status,
      attempts,
      errorMessage,
    } = params;

    await this.db`
      INSERT INTO notification_logs (
        id,
        appointment_id,
        recipient_email,
        channel,
        template_name,
        status,
        attempts,
        error_message,
        last_attempt_at,
        created_at
      ) VALUES (
        ${uuidv4()},
        ${appointmentId || null},
        ${recipientEmail},
        'email',
        ${templateName},
        ${status === 'sent' ? 'sent' : 'failed'},
        ${attempts},
        ${errorMessage || null},
        NOW(),
        NOW()
      )
      ON CONFLICT (id) DO UPDATE SET
        status = EXCLUDED.status,
        attempts = EXCLUDED.attempts,
        error_message = EXCLUDED.error_message,
        last_attempt_at = EXCLUDED.last_attempt_at
    `;
  }

  /**
   * Check email delivery status from Resend API
   * Can be used to update notification_logs with delivery/open/click events
   *
   * TODO: Implement webhook endpoint to receive delivery status updates from Resend
   */
  async checkDeliveryStatus(messageId: string): Promise<unknown> {
    // TODO: Implement Resend API call to check email status
    // This will require Resend API support for email status queries
    console.warn('checkDeliveryStatus not yet implemented');
    return null;
  }
}

/**
 * Helper function to get or create email service instance
 */
export function createEmailService(db: DbClient): EmailService {
  return new EmailService(db);
}
