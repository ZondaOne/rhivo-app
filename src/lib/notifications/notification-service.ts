import { DbClient } from '@/db/client';
import { v4 as uuidv4 } from 'uuid';

export type NotificationChannel = 'email' | 'sms' | 'webhook';
export type NotificationStatus = 'pending' | 'sent' | 'failed' | 'retrying';

export interface QueueNotificationParams {
  appointmentId: string;
  recipientEmail?: string;
  recipientPhone?: string;
  channel: NotificationChannel;
  templateName: string;
}

/**
 * Notification Service
 *
 * Handles queueing notifications to the notification_logs table.
 * Actual delivery is handled by a separate worker/cron job.
 */
export class NotificationService {
  constructor(private db: DbClient) {}

  /**
   * Queue a notification for delivery
   * This creates a record in notification_logs that will be processed by a background worker
   */
  async queueNotification(params: QueueNotificationParams): Promise<void> {
    const {
      appointmentId,
      recipientEmail,
      recipientPhone,
      channel,
      templateName,
    } = params;

    // Validate that we have the appropriate recipient info for the channel
    if (channel === 'email' && !recipientEmail) {
      throw new Error('Email address required for email notifications');
    }
    if (channel === 'sms' && !recipientPhone) {
      throw new Error('Phone number required for SMS notifications');
    }

    await this.db`
      INSERT INTO notification_logs (
        id,
        appointment_id,
        recipient_email,
        recipient_phone,
        channel,
        template_name,
        status,
        attempts,
        created_at
      ) VALUES (
        ${uuidv4()},
        ${appointmentId},
        ${recipientEmail || null},
        ${recipientPhone || null},
        ${channel},
        ${templateName},
        'pending',
        0,
        NOW()
      )
    `;
  }

  /**
   * Queue a reschedule notification
   * Sends email to customer about the updated appointment time
   */
  async queueRescheduleNotification(
    appointmentId: string,
    recipientEmail: string,
    recipientPhone?: string
  ): Promise<void> {
    // Queue email notification
    await this.queueNotification({
      appointmentId,
      recipientEmail,
      channel: 'email',
      templateName: 'appointment_rescheduled',
    });

    // Optionally queue SMS if phone is available
    if (recipientPhone) {
      await this.queueNotification({
        appointmentId,
        recipientPhone,
        channel: 'sms',
        templateName: 'appointment_rescheduled',
      });
    }
  }

  /**
   * Queue a confirmation notification
   */
  async queueConfirmationNotification(
    appointmentId: string,
    recipientEmail: string,
    recipientPhone?: string
  ): Promise<void> {
    await this.queueNotification({
      appointmentId,
      recipientEmail,
      channel: 'email',
      templateName: 'appointment_confirmed',
    });

    if (recipientPhone) {
      await this.queueNotification({
        appointmentId,
        recipientPhone,
        channel: 'sms',
        templateName: 'appointment_confirmed',
      });
    }
  }

  /**
   * Queue a cancellation notification
   */
  async queueCancellationNotification(
    appointmentId: string,
    recipientEmail: string,
    recipientPhone?: string
  ): Promise<void> {
    await this.queueNotification({
      appointmentId,
      recipientEmail,
      channel: 'email',
      templateName: 'appointment_cancelled',
    });

    if (recipientPhone) {
      await this.queueNotification({
        appointmentId,
        recipientPhone,
        channel: 'sms',
        templateName: 'appointment_cancelled',
      });
    }
  }
}
