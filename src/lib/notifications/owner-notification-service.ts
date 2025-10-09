import { DbClient } from '@/db/client';
import { v4 as uuidv4 } from 'uuid';

export type OwnerNotificationType =
  | 'booking_created'
  | 'booking_canceled'
  | 'booking_rescheduled'
  | 'no_show_marked'
  | 'appointment_completed';

export interface CreateOwnerNotificationParams {
  businessId: string;
  appointmentId: string;
  type: OwnerNotificationType;
  title: string;
  message: string;
}

/**
 * Owner Notification Service
 *
 * Creates in-app notifications for business owners in the dashboard.
 * These are separate from customer email/SMS notifications.
 */
export class OwnerNotificationService {
  constructor(private db: DbClient) {}

  /**
   * Create an in-app notification for all owners of a business
   */
  async createNotification(params: CreateOwnerNotificationParams): Promise<void> {
    const { businessId, appointmentId, type, title, message } = params;

    // Get all owners for this business from business_owners junction table
    const owners = await this.db`
      SELECT user_id
      FROM business_owners
      WHERE business_id = ${businessId}
    `;

    // Create a notification for each owner
    for (const owner of owners) {
      await this.db`
        INSERT INTO notifications (
          id,
          business_id,
          user_id,
          type,
          title,
          message,
          appointment_id,
          read,
          created_at
        ) VALUES (
          ${uuidv4()},
          ${businessId},
          ${owner.user_id},
          ${type},
          ${title},
          ${message},
          ${appointmentId},
          false,
          NOW()
        )
      `;
    }
  }

  /**
   * Create a notification when a customer reschedules their appointment
   */
  async notifyOwnerOfReschedule(
    businessId: string,
    appointmentId: string,
    bookingId: string,
    customerName: string | null,
    oldTime: string,
    newTime: string
  ): Promise<void> {
    const oldDate = new Date(oldTime);
    const newDate = new Date(newTime);

    const formatDateTime = (date: Date) => {
      return date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
      });
    };

    const customerDisplay = customerName || 'A customer';

    await this.createNotification({
      businessId,
      appointmentId,
      type: 'booking_rescheduled',
      title: 'Appointment Rescheduled',
      message: `${customerDisplay} rescheduled booking ${bookingId} from ${formatDateTime(oldDate)} to ${formatDateTime(newDate)}`,
    });
  }

  /**
   * Create a notification when a customer cancels their appointment
   */
  async notifyOwnerOfCancellation(
    businessId: string,
    appointmentId: string,
    bookingId: string,
    customerName: string | null,
    appointmentTime: string
  ): Promise<void> {
    const date = new Date(appointmentTime);
    const formatDateTime = (date: Date) => {
      return date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
      });
    };

    const customerDisplay = customerName || 'A customer';

    await this.createNotification({
      businessId,
      appointmentId,
      type: 'booking_canceled',
      title: 'Appointment Canceled',
      message: `${customerDisplay} canceled booking ${bookingId} scheduled for ${formatDateTime(date)}`,
    });
  }

  /**
   * Create a notification when a new booking is made
   */
  async notifyOwnerOfNewBooking(
    businessId: string,
    appointmentId: string,
    bookingId: string,
    customerName: string | null,
    serviceName: string,
    appointmentTime: string
  ): Promise<void> {
    const date = new Date(appointmentTime);
    const formatDateTime = (date: Date) => {
      return date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
      });
    };

    const customerDisplay = customerName || 'A customer';

    await this.createNotification({
      businessId,
      appointmentId,
      type: 'booking_created',
      title: 'New Booking',
      message: `${customerDisplay} booked ${serviceName} for ${formatDateTime(date)} (${bookingId})`,
    });
  }
}
