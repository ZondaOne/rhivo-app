import { NextRequest, NextResponse } from 'next/server';
import { getDbClient } from '@/db/client';
import { AppointmentManager } from '@/lib/booking';
import { OwnerNotificationService } from '@/lib/notifications/owner-notification-service';
import { CustomerNotificationService } from '@/lib/email/customer-notification-service';
import { z } from 'zod';
import { v4 as uuidv4 } from 'uuid';
import { generateBookingId } from '@/lib/booking/id';

const commitSchema = z.object({
  reservationId: z.string().min(1),
  customerId: z.string().min(1).optional(),
  guestEmail: z.string().email().optional(),
  guestPhone: z.string().optional(),
  guestName: z.string().min(1).optional()
}).refine(
  (data) => data.customerId || data.guestEmail,
  { message: 'Either customerId or guestEmail must be provided' }
);

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const data = commitSchema.parse(body);

    const db = getDbClient();
    const manager = new AppointmentManager(db);
    const bookingId = generateBookingId();

    // Generate cancellation token for guest bookings
    const cancellationToken = data.guestEmail ? uuidv4() : undefined;

    const appointment = await manager.commitReservation({
      reservationId: data.reservationId,
      bookingId: bookingId,
      customerId: data.customerId,
      guestEmail: data.guestEmail,
      guestPhone: data.guestPhone,
      guestName: data.guestName,
      cancellationToken
    });

    // Send owner notification (non-blocking)
    try {
      const ownerNotificationService = new OwnerNotificationService(db);

      // Fetch service name for the notification
      const serviceResult = await db`
        SELECT name FROM services WHERE id = ${appointment.service_id} LIMIT 1
      `;
      const serviceName = serviceResult[0]?.name || 'Service';

      // Get customer name
      const customerName = data.guestName || data.customerId || null;

      await ownerNotificationService.notifyOwnerOfNewBooking(
        appointment.business_id,
        appointment.id,
        appointment.booking_id,
        customerName,
        serviceName,
        appointment.slot_start.toISOString()
      );
    } catch (notificationError) {
      console.error('Failed to send owner notification:', notificationError);
      // Don't fail the booking if notification fails
    }

    // Send booking confirmation email to customer
    console.log('📧 Triggering booking confirmation email:', {
      appointmentId: appointment.id,
      guestEmail: data.guestEmail,
      bookingId: appointment.booking_id,
      slotStart: appointment.slot_start,
      slotEnd: appointment.slot_end,
    });

    const customerNotificationService = new CustomerNotificationService(db);

    // Await email send to ensure DB connection stays active
    if (appointment.slot_start && appointment.slot_end) {
      try {
        await customerNotificationService.sendBookingConfirmation({
          id: appointment.id,
          businessId: appointment.business_id,
          serviceId: appointment.service_id,
          customerId: data.customerId,
          guestEmail: data.guestEmail,
          guestPhone: data.guestPhone,
          guestName: data.guestName,
          slotStart: new Date(appointment.slot_start),
          slotEnd: new Date(appointment.slot_end),
          status: appointment.status,
          bookingId: appointment.booking_id,
          cancellationToken: appointment.cancellation_token || undefined,
        });
        console.log('✅ Booking confirmation email sent successfully');
      } catch (error) {
        console.error('❌ Failed to send booking confirmation email:', error);
        // Don't fail the booking if email fails
      }
    } else {
      console.error('❌ Cannot send booking confirmation: missing slot_start or slot_end');
    }

    return NextResponse.json({
      success: true,
      appointment: {
        id: appointment.id,
        bookingId: appointment.booking_id,
        businessId: appointment.business_id,
        serviceId: appointment.service_id,
        slotStart: appointment.slot_start,
        slotEnd: appointment.slot_end,
        status: appointment.status,
        cancellationToken: appointment.cancellation_token
      }
    });
  } catch (error: unknown) {
    if (error.message.includes('Reservation')) {
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 400 }
      );
    }

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, error: 'Invalid request data', details: error.issues },
        { status: 400 }
      );
    }

    console.error('Commit error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to confirm booking' },
      { status: 500 }
    );
  }
}