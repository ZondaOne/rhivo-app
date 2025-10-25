import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';
import { getDbClient } from '@/db/client';
import { CustomerNotificationService } from '@/lib/email/customer-notification-service';
import { z } from 'zod';

const updateSchema = z.object({
  status: z.enum(['confirmed', 'completed', 'cancelled', 'canceled', 'no_show']).optional(),
});

const STATUS_UI_TO_DB: Record<string, 'confirmed' | 'completed' | 'canceled' | 'no_show'> = {
  confirmed: 'confirmed',
  completed: 'completed',
  cancelled: 'canceled',
  canceled: 'canceled',
  no_show: 'no_show',
};

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const token = request.headers.get('authorization')?.replace('Bearer ', '').trim();

  if (!token) {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  }

  let payload: ReturnType<typeof verifyToken>;

  try {
    payload = verifyToken(token);
  } catch {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  }

  if (!payload.business_id || payload.role !== 'owner') {
    return NextResponse.json({ message: 'Forbidden' }, { status: 403 });
  }

  const sql = getDbClient();

  try {
    const body = await request.json();
    const parsed = updateSchema.parse(body);

    if (!parsed.status) {
      return NextResponse.json(
        { message: 'No updates requested' },
        { status: 400 }
      );
    }

    const dbStatus = STATUS_UI_TO_DB[parsed.status];

    const isCancelling = dbStatus === 'canceled';

    const appointmentRows = isCancelling
      ? await sql`
          UPDATE appointments
          SET
            status = ${dbStatus},
            deleted_at = NOW(),
            updated_at = NOW()
          WHERE id = ${id}
            AND business_id = ${payload.business_id}
            AND deleted_at IS NULL
          RETURNING id
        `
      : await sql`
          UPDATE appointments
          SET
            status = ${dbStatus},
            deleted_at = NULL,
            updated_at = NOW()
          WHERE id = ${id}
            AND business_id = ${payload.business_id}
          RETURNING id
        `;

    const appointment = appointmentRows[0];

    if (!appointment) {
      return NextResponse.json({ message: 'Appointment not found' }, { status: 404 });
    }

    // Update the audit log to include the actor (owner) who made the change
    // The audit log is auto-created by the database trigger
    await sql`
      UPDATE audit_logs
      SET actor_id = ${payload.sub}
      WHERE id = (
        SELECT id
        FROM audit_logs
        WHERE appointment_id = ${id}
          AND actor_id IS NULL
        ORDER BY timestamp DESC
        LIMIT 1
      )
    `;

    // If cancelling, send customer email notification
    if (isCancelling) {
      try {
        console.log(`Appointment ${id} cancelled by owner ${payload.sub}`);

        // Fetch appointment details for email notification
        const appointmentDetails = await sql`
          SELECT
            a.id,
            a.business_id,
            a.service_id,
            a.customer_id,
            a.guest_email,
            a.guest_phone,
            a.guest_name,
            a.slot_start,
            a.slot_end,
            a.status,
            u.email as customer_email
          FROM appointments a
          LEFT JOIN users u ON a.customer_id = u.id
          WHERE a.id = ${id}
          LIMIT 1
        `;

        if (appointmentDetails.length > 0) {
          const apt = appointmentDetails[0];
          const email = apt.customer_email || apt.guest_email;

          if (email) {
            const customerNotificationService = new CustomerNotificationService(sql);

            console.log('📧 Triggering cancellation confirmation email:', {
              appointmentId: id,
              email,
            });

            // Send email notification (completely non-blocking)
            customerNotificationService.sendCancellationConfirmation({
              id: apt.id,
              businessId: apt.business_id,
              serviceId: apt.service_id,
              customerId: apt.customer_id || undefined,
              guestEmail: apt.guest_email || undefined,
              guestPhone: apt.guest_phone || undefined,
              guestName: apt.guest_name || undefined,
              slotStart: new Date(apt.slot_start),
              slotEnd: new Date(apt.slot_end),
              status: apt.status,
            }).then(() => {
              console.log('✅ Cancellation confirmation email sent successfully');
            }).catch((error) => {
              console.error('❌ Failed to send cancellation confirmation email:', error);
            });
          }
        }
      } catch (notificationError) {
        console.error('Failed to send cancellation notification:', notificationError);
        // Don't fail the request if notification fails
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { message: 'Validation failed', errors: error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    console.error('Update appointment error:', error);
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
  }
}
