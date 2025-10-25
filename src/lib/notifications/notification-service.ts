import { DbClient } from '@/db/client';
import { v4 as uuidv4 } from 'uuid';
import { createEmailService } from '@/lib/email/email-service';
import { loadConfigBySubdomain } from '@/lib/config/config-loader';
import {
  renderBookingConfirmation,
  renderCancellationConfirmation,
  renderRescheduleConfirmation
} from '@/lib/email/templates';

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
   * Send reschedule notification immediately
   * Sends email to customer about the updated appointment time
   */
  async queueRescheduleNotification(
    appointmentId: string,
    recipientEmail: string,
    recipientPhone?: string,
    oldSlotStart?: string,
    oldSlotEnd?: string
  ): Promise<void> {
    // Fetch appointment details for email
    const [appointment] = await this.db`
      SELECT
        a.id,
        a.booking_id,
        a.slot_start,
        a.slot_end,
        COALESCE(u.name, a.guest_name) as customer_name,
        COALESCE(u.email, a.guest_email) as customer_email,
        s.price_cents,
        s.name as service_name,
        b.name as business_name,
        b.subdomain as business_subdomain
      FROM appointments a
      JOIN services s ON a.service_id = s.id
      JOIN businesses b ON a.business_id = b.id
      LEFT JOIN users u ON a.customer_id = u.id
      WHERE a.id = ${appointmentId}
    `;

    if (!appointment) {
      console.error('Appointment not found for reschedule email:', appointmentId);
      return;
    }

    // Load business config to get currency and contact info
    const configResult = await loadConfigBySubdomain(appointment.business_subdomain);
    const config = configResult.success ? configResult.config : null;
    const currency = config?.business?.currency || 'EUR';
    const contact = config?.contact;

    // Format address from config
    let businessAddress: string | undefined;
    if (contact?.address) {
      const addr = contact.address;
      if (typeof addr === 'string') {
        businessAddress = addr;
      } else if (typeof addr === 'object') {
        const parts = [
          addr.street,
          addr.city,
          addr.state && addr.postalCode ? `${addr.state} ${addr.postalCode}` : addr.state || addr.postalCode,
          addr.country
        ].filter(Boolean);
        businessAddress = parts.join(', ');
      }
    }

    // Send email immediately
    try {
      const emailService = createEmailService(this.db);

      const formatPrice = (cents: number, curr: string) => {
        const amount = cents / 100;
        return new Intl.NumberFormat('it-IT', {
          style: 'currency',
          currency: curr,
        }).format(amount);
      };

      const emailHtml = await renderRescheduleConfirmation({
        customerName: appointment.customer_name,
        businessName: appointment.business_name,
        serviceName: appointment.service_name,
        oldAppointmentDate: oldSlotStart
          ? new Date(oldSlotStart).toLocaleDateString('it-IT', {
              weekday: 'long',
              year: 'numeric',
              month: 'long',
              day: 'numeric',
            })
          : 'N/A',
        oldAppointmentTime: oldSlotStart
          ? new Date(oldSlotStart).toLocaleTimeString('it-IT', {
              hour: '2-digit',
              minute: '2-digit',
            })
          : 'N/A',
        newAppointmentDate: new Date(appointment.slot_start).toLocaleDateString('it-IT', {
          weekday: 'long',
          year: 'numeric',
          month: 'long',
          day: 'numeric',
        }),
        newAppointmentTime: new Date(appointment.slot_start).toLocaleTimeString('it-IT', {
          hour: '2-digit',
          minute: '2-digit',
        }),
        bookingId: appointment.booking_id,
        price: appointment.price_cents ? formatPrice(appointment.price_cents, currency) : undefined,
        businessAddress,
        businessPhone: contact?.phone,
        businessEmail: contact?.email,
        cancellationLink: undefined,
        rescheduleLink: undefined,
      });

      await emailService.sendEmail({
        to: recipientEmail,
        subject: `Appuntamento Riprogrammato - ${appointment.business_name}`,
        html: emailHtml,
        templateName: 'appointment_rescheduled',
        appointmentId,
      });

      console.log('✅ Reschedule email sent to:', recipientEmail);
    } catch (error) {
      console.error('❌ Failed to send reschedule email:', error);
      // Log to notification_logs for tracking
      await this.queueNotification({
        appointmentId,
        recipientEmail,
        channel: 'email',
        templateName: 'appointment_rescheduled',
      });
    }

    // Note: SMS not implemented yet
    if (recipientPhone) {
      console.log('SMS notification not implemented for:', recipientPhone);
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
   * Send cancellation notification immediately
   */
  async queueCancellationNotification(
    appointmentId: string,
    recipientEmail: string,
    recipientPhone?: string
  ): Promise<void> {
    // Fetch appointment details for email
    const [appointment] = await this.db`
      SELECT
        a.id,
        a.booking_id,
        a.slot_start,
        a.slot_end,
        COALESCE(u.name, a.guest_name) as customer_name,
        COALESCE(u.email, a.guest_email) as customer_email,
        s.name as service_name,
        b.name as business_name,
        b.subdomain as business_subdomain
      FROM appointments a
      JOIN services s ON a.service_id = s.id
      JOIN businesses b ON a.business_id = b.id
      LEFT JOIN users u ON a.customer_id = u.id
      WHERE a.id = ${appointmentId}
    `;

    if (!appointment) {
      console.error('Appointment not found for cancellation email:', appointmentId);
      return;
    }

    // Load business config to get contact info
    const configResult = await loadConfigBySubdomain(appointment.business_subdomain);
    const config = configResult.success ? configResult.config : null;
    const contact = config?.contact;

    // Send email immediately
    try {
      const emailService = createEmailService(this.db);

      const emailHtml = await renderCancellationConfirmation({
        customerName: appointment.customer_name,
        businessName: appointment.business_name,
        serviceName: appointment.service_name,
        appointmentDate: new Date(appointment.slot_start).toLocaleDateString('it-IT', {
          weekday: 'long',
          year: 'numeric',
          month: 'long',
          day: 'numeric',
        }),
        appointmentTime: new Date(appointment.slot_start).toLocaleTimeString('it-IT', {
          hour: '2-digit',
          minute: '2-digit',
        }),
        bookingId: appointment.booking_id,
        businessPhone: contact?.phone,
        businessEmail: contact?.email,
        rebookingLink: `${process.env.NEXT_PUBLIC_APP_URL}/book/${appointment.business_subdomain}`,
      });

      await emailService.sendEmail({
        to: recipientEmail,
        subject: `Cancellazione Confermata - ${appointment.business_name}`,
        html: emailHtml,
        templateName: 'appointment_cancelled',
        appointmentId,
      });

      console.log('✅ Cancellation email sent to:', recipientEmail);
    } catch (error) {
      console.error('❌ Failed to send cancellation email:', error);
      // Log to notification_logs for tracking
      await this.queueNotification({
        appointmentId,
        recipientEmail,
        channel: 'email',
        templateName: 'appointment_cancelled',
      });
    }

    // Note: SMS not implemented yet
    if (recipientPhone) {
      console.log('SMS notification not implemented for:', recipientPhone);
    }
  }
}
