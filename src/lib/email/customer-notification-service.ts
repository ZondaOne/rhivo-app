import { DbClient } from '@/db/client';
import { EmailService } from './email-service';
import { loadConfigBySubdomain } from '@/lib/config/config-loader';
import {
  renderBookingConfirmation,
  renderCancellationConfirmation,
  renderRescheduleConfirmation,
  renderAppointmentReminder,
  getEmailSubject,
  type BookingConfirmationData,
  type CancellationConfirmationData,
  type RescheduleConfirmationData,
  type AppointmentReminderData,
} from './templates';
import { env } from '@/lib/env';

export interface AppointmentData {
  id: string;
  businessId: string;
  serviceId: string;
  customerId?: string;
  guestEmail?: string;
  guestPhone?: string;
  guestName?: string;
  slotStart: Date;
  slotEnd: Date;
  status: string;
  bookingId?: string;
  cancellationToken?: string;
}

/**
 * Customer Notification Service
 *
 * Handles sending email notifications to customers for booking events.
 * Supports both authenticated customers and guest bookings.
 */
export class CustomerNotificationService {
  private emailService: EmailService;

  constructor(private db: DbClient) {
    this.emailService = new EmailService(db);
  }

  /**
   * Send booking confirmation email
   * Handles both guest and authenticated customer cases
   */
  async sendBookingConfirmation(
    appointmentData: AppointmentData
  ): Promise<void> {
    console.log('📧 sendBookingConfirmation called with:', {
      appointmentId: appointmentData.id,
      guestEmail: appointmentData.guestEmail,
      customerId: appointmentData.customerId,
    });

    try {
      // Fetch full appointment details including business and service info
      console.log('🔍 Fetching appointment details from database...');
      const details = await this.fetchAppointmentDetails(appointmentData.id);

      if (!details) {
        console.error('❌ Appointment details not found for ID:', appointmentData.id);
        throw new Error('Appointment details not found');
      }

      console.log('✅ Appointment details fetched:', {
        businessName: details.businessName,
        serviceName: details.serviceName,
        customerEmail: details.customerEmail,
      });

      // Determine recipient email
      const recipientEmail = appointmentData.customerId
        ? details.customerEmail
        : appointmentData.guestEmail;

      if (!recipientEmail) {
        throw new Error('No recipient email available');
      }

      // Generate cancellation and reschedule links with bookingId and email params
      const baseUrl = env.NEXT_PUBLIC_APP_URL;
      const bookingIdParam = appointmentData.bookingId || appointmentData.id;

      const cancellationLink = appointmentData.cancellationToken
        ? `${baseUrl}/book/manage/${bookingIdParam}?token=${appointmentData.cancellationToken}&bookingId=${bookingIdParam}&email=${encodeURIComponent(recipientEmail)}`
        : `${baseUrl}/book/manage?bookingId=${bookingIdParam}&email=${encodeURIComponent(recipientEmail)}`;

      const rescheduleLink = appointmentData.cancellationToken
        ? `${baseUrl}/book/manage/${bookingIdParam}/reschedule?token=${appointmentData.cancellationToken}&bookingId=${bookingIdParam}&email=${encodeURIComponent(recipientEmail)}`
        : undefined;

      // Format date and time
      const appointmentDate = this.formatDate(details.slotStart);
      const appointmentTime = this.formatTimeRange(
        details.slotStart,
        details.slotEnd
      );

      // Prepare email data
      const emailData: BookingConfirmationData = {
        customerName: details.customerName || 'Valued Customer',
        businessName: details.businessName,
        serviceName: details.serviceName,
        appointmentDate,
        appointmentTime,
        bookingId: appointmentData.bookingId || appointmentData.id,
        price: details.price ? this.formatPrice(details.price) : undefined,
        cancellationLink,
        rescheduleLink,
        businessAddress: details.businessAddress,
        businessPhone: details.businessPhone,
        businessEmail: details.businessEmail,
      };

      // Render HTML
      const html = await renderBookingConfirmation(emailData);
      console.log('✅ HTML rendered successfully. Length:', html.length);

      const subject = getEmailSubject('appointment_confirmed', details.businessName);

      // Send email
      await this.emailService.sendEmail({
        to: recipientEmail,
        subject,
        html,
        templateName: 'appointment_confirmed',
        appointmentId: appointmentData.id,
      });

      console.log(`Booking confirmation sent to ${recipientEmail}`);
    } catch (error) {
      console.error('Failed to send booking confirmation:', error);
      // Don't throw - email failure shouldn't block booking completion
    }
  }

  /**
   * Send cancellation confirmation email
   */
  async sendCancellationConfirmation(
    appointmentData: AppointmentData
  ): Promise<void> {
    try {
      const details = await this.fetchAppointmentDetails(appointmentData.id);
      if (!details) return;

      const recipientEmail = appointmentData.customerId
        ? details.customerEmail
        : appointmentData.guestEmail;

      if (!recipientEmail) return;

      const baseUrl = env.NEXT_PUBLIC_APP_URL;
      const rebookingLink = `${baseUrl}/book/${details.businessSubdomain}`;

      const emailData: CancellationConfirmationData = {
        customerName: details.customerName || 'Valued Customer',
        businessName: details.businessName,
        serviceName: details.serviceName,
        appointmentDate: this.formatDate(details.slotStart),
        appointmentTime: this.formatTimeRange(details.slotStart, details.slotEnd),
        bookingId: appointmentData.bookingId || appointmentData.id,
        rebookingLink,
        businessPhone: details.businessPhone,
        businessEmail: details.businessEmail,
      };

      const html = await renderCancellationConfirmation(emailData);
      const subject = getEmailSubject('appointment_cancelled', details.businessName);

      await this.emailService.sendEmail({
        to: recipientEmail,
        subject,
        html,
        templateName: 'appointment_cancelled',
        appointmentId: appointmentData.id,
      });

      console.log(`Cancellation confirmation sent to ${recipientEmail}`);
    } catch (error) {
      console.error('Failed to send cancellation confirmation:', error);
    }
  }

  /**
   * Send reschedule confirmation email
   */
  async sendRescheduleConfirmation(
    appointmentData: AppointmentData,
    oldSlotStart: Date,
    oldSlotEnd: Date
  ): Promise<void> {
    try {
      const details = await this.fetchAppointmentDetails(appointmentData.id);
      if (!details) return;

      const recipientEmail = appointmentData.customerId
        ? details.customerEmail
        : appointmentData.guestEmail;

      if (!recipientEmail) return;

      const baseUrl = env.NEXT_PUBLIC_APP_URL;
      const bookingIdParam = appointmentData.bookingId || appointmentData.id;

      const cancellationLink = appointmentData.cancellationToken
        ? `${baseUrl}/book/manage/${bookingIdParam}?token=${appointmentData.cancellationToken}&bookingId=${bookingIdParam}&email=${encodeURIComponent(recipientEmail)}`
        : `${baseUrl}/book/manage?bookingId=${bookingIdParam}&email=${encodeURIComponent(recipientEmail)}`;

      const rescheduleLink = appointmentData.cancellationToken
        ? `${baseUrl}/book/manage/${bookingIdParam}/reschedule?token=${appointmentData.cancellationToken}&bookingId=${bookingIdParam}&email=${encodeURIComponent(recipientEmail)}`
        : undefined;

      const emailData: RescheduleConfirmationData = {
        customerName: details.customerName || 'Valued Customer',
        businessName: details.businessName,
        serviceName: details.serviceName,
        oldAppointmentDate: this.formatDate(oldSlotStart),
        oldAppointmentTime: this.formatTimeRange(oldSlotStart, oldSlotEnd),
        newAppointmentDate: this.formatDate(details.slotStart),
        newAppointmentTime: this.formatTimeRange(details.slotStart, details.slotEnd),
        bookingId: appointmentData.bookingId || appointmentData.id,
        price: details.price ? this.formatPrice(details.price) : undefined,
        cancellationLink,
        rescheduleLink,
        businessAddress: details.businessAddress,
        businessPhone: details.businessPhone,
        businessEmail: details.businessEmail,
      };

      const html = await renderRescheduleConfirmation(emailData);
      const subject = getEmailSubject('appointment_rescheduled', details.businessName);

      await this.emailService.sendEmail({
        to: recipientEmail,
        subject,
        html,
        templateName: 'appointment_rescheduled',
        appointmentId: appointmentData.id,
      });

      console.log(`Reschedule confirmation sent to ${recipientEmail}`);
    } catch (error) {
      console.error('Failed to send reschedule confirmation:', error);
    }
  }

  /**
   * Send appointment reminder (24 hours before)
   * TODO: Implement cron job to send reminders automatically
   */
  async sendAppointmentReminder(appointmentId: string): Promise<void> {
    try {
      const details = await this.fetchAppointmentDetails(appointmentId);
      if (!details) return;

      const recipientEmail = details.customerEmail;
      if (!recipientEmail) return;

      const baseUrl = env.NEXT_PUBLIC_APP_URL;
      const cancellationLink = `${baseUrl}/book/manage/${appointmentId}`;
      const rescheduleLink = `${baseUrl}/book/manage/${appointmentId}/reschedule`;

      // TODO: Fetch unsubscribe preference from customer_preferences table
      const unsubscribeLink = undefined;

      const emailData: AppointmentReminderData = {
        customerName: details.customerName || 'Valued Customer',
        businessName: details.businessName,
        serviceName: details.serviceName,
        appointmentDate: this.formatDate(details.slotStart),
        appointmentTime: this.formatTimeRange(details.slotStart, details.slotEnd),
        bookingId: appointmentId,
        businessAddress: details.businessAddress,
        businessPhone: details.businessPhone,
        businessEmail: details.businessEmail,
        cancellationLink,
        rescheduleLink,
        unsubscribeLink,
      };

      const html = await renderAppointmentReminder(emailData);
      const subject = getEmailSubject('appointment_reminder', details.businessName);

      await this.emailService.sendEmail({
        to: recipientEmail,
        subject,
        html,
        templateName: 'appointment_reminder',
        appointmentId,
      });

      console.log(`Appointment reminder sent to ${recipientEmail}`);
    } catch (error) {
      console.error('Failed to send appointment reminder:', error);
    }
  }

  /**
   * Fetch full appointment details from database and YAML config
   */
  private async fetchAppointmentDetails(appointmentId: string): Promise<any> {
    const result = await this.db`
      SELECT
        a.id,
        a.slot_start,
        a.slot_end,
        a.guest_name,
        a.guest_email,
        s.name as service_name,
        s.price_cents,
        b.name as business_name,
        b.subdomain as business_subdomain,
        b.timezone as business_timezone,
        u.name as customer_name,
        u.email as customer_email
      FROM appointments a
      JOIN services s ON a.service_id = s.id
      JOIN businesses b ON a.business_id = b.id
      LEFT JOIN users u ON a.customer_id = u.id
      WHERE a.id = ${appointmentId}
      LIMIT 1
    `;

    if (result.length === 0) {
      return null;
    }

    const row = result[0];

    // Load business config to get contact info
    const configResult = await loadConfigBySubdomain(row.business_subdomain);
    const contact = configResult.success && configResult.config
      ? configResult.config.contact
      : null;

    // Format address object to string
    let formattedAddress: string | undefined = undefined;
    if (contact?.address) {
      const addr = contact.address;
      if (typeof addr === 'string') {
        formattedAddress = addr;
      } else if (typeof addr === 'object') {
        const parts = [
          addr.street,
          addr.city,
          addr.state && addr.postalCode ? `${addr.state} ${addr.postalCode}` : addr.state || addr.postalCode,
          addr.country
        ].filter(Boolean);
        formattedAddress = parts.join(', ');
      }
    }

    return {
      slotStart: row.slot_start,
      slotEnd: row.slot_end,
      serviceName: row.service_name,
      price: row.price_cents,
      businessName: row.business_name,
      businessSubdomain: row.business_subdomain,
      businessTimezone: row.business_timezone,
      businessAddress: formattedAddress,
      businessPhone: contact?.phone,
      businessEmail: contact?.email,
      customerName: row.customer_name || row.guest_name,
      customerEmail: row.customer_email || row.guest_email,
    };
  }

  /**
   * Format date to readable string
   */
  private formatDate(date: Date): string {
    return new Intl.DateTimeFormat('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    }).format(date);
  }

  /**
   * Format time range
   */
  private formatTimeRange(start: Date, end: Date): string {
    const startTime = new Intl.DateTimeFormat('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    }).format(start);

    const endTime = new Intl.DateTimeFormat('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    }).format(end);

    return `${startTime} - ${endTime}`;
  }

  /**
   * Format price from cents to currency string
   */
  private formatPrice(cents: number): string {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(cents / 100);
  }
}
