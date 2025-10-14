import { render } from '@react-email/render';
import React from 'react';
import BookingConfirmationEmail from './BookingConfirmation';
import CancellationConfirmationEmail from './CancellationConfirmation';
import RescheduleConfirmationEmail from './RescheduleConfirmation';
import AppointmentReminderEmail from './AppointmentReminder';

// Re-export templates for direct use
export {
  BookingConfirmationEmail,
  CancellationConfirmationEmail,
  RescheduleConfirmationEmail,
  AppointmentReminderEmail,
};

// Template data interfaces
export interface BookingConfirmationData {
  customerName: string;
  businessName: string;
  businessLogo?: string;
  serviceName: string;
  appointmentDate: string;
  appointmentTime: string;
  bookingId: string;
  price?: string;
  cancellationLink?: string;
  rescheduleLink?: string;
  businessAddress?: string;
  businessPhone?: string;
  businessEmail?: string;
}

export interface CancellationConfirmationData {
  customerName: string;
  businessName: string;
  serviceName: string;
  appointmentDate: string;
  appointmentTime: string;
  bookingId: string;
  rebookingLink?: string;
  businessPhone?: string;
  businessEmail?: string;
}

export interface RescheduleConfirmationData {
  customerName: string;
  businessName: string;
  serviceName: string;
  oldAppointmentDate: string;
  oldAppointmentTime: string;
  newAppointmentDate: string;
  newAppointmentTime: string;
  bookingId: string;
  price?: string;
  cancellationLink?: string;
  rescheduleLink?: string;
  businessAddress?: string;
  businessPhone?: string;
  businessEmail?: string;
}

export interface AppointmentReminderData {
  customerName: string;
  businessName: string;
  serviceName: string;
  appointmentDate: string;
  appointmentTime: string;
  bookingId: string;
  businessAddress?: string;
  businessPhone?: string;
  businessEmail?: string;
  parkingInstructions?: string;
  preparationInstructions?: string;
  cancellationLink?: string;
  rescheduleLink?: string;
  unsubscribeLink?: string;
}

/**
 * Render email templates to HTML string
 * Note: render() is async in @react-email/render v1.3.2+
 */
export async function renderBookingConfirmation(
  data: BookingConfirmationData
): Promise<string> {
  const element = React.createElement(BookingConfirmationEmail, data);
  const html = await render(element);
  return html;
}

export async function renderCancellationConfirmation(
  data: CancellationConfirmationData
): Promise<string> {
  const element = React.createElement(CancellationConfirmationEmail, data);
  return await render(element);
}

export async function renderRescheduleConfirmation(
  data: RescheduleConfirmationData
): Promise<string> {
  const element = React.createElement(RescheduleConfirmationEmail, data);
  return await render(element);
}

export async function renderAppointmentReminder(
  data: AppointmentReminderData
): Promise<string> {
  const element = React.createElement(AppointmentReminderEmail, data);
  return await render(element);
}

/**
 * Get email subject line for each template
 */
export function getEmailSubject(
  templateName: string,
  businessName: string
): string {
  switch (templateName) {
    case 'appointment_confirmed':
      return `Booking Confirmed - ${businessName}`;
    case 'appointment_cancelled':
      return `Appointment Cancelled - ${businessName}`;
    case 'appointment_rescheduled':
      return `Appointment Rescheduled - ${businessName}`;
    case 'appointment_reminder':
      return `Reminder: Your appointment at ${businessName} is tomorrow`;
    default:
      return `Update from ${businessName}`;
  }
}
