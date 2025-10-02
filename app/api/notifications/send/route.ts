import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';
import { getDbClient } from '@/db/client';
import { nanoid } from 'nanoid';

const NOTIFICATION_TEMPLATES = {
  confirmation: {
    email: {
      subject: 'Appointment Confirmation',
      template: 'Your appointment on {date} at {time} has been confirmed.',
    },
    sms: {
      template: 'Your appointment on {date} at {time} is confirmed.',
    },
  },
  reminder: {
    email: {
      subject: 'Appointment Reminder',
      template: 'Reminder: You have an appointment tomorrow at {time}.',
    },
    sms: {
      template: 'Reminder: Appointment tomorrow at {time}.',
    },
  },
  cancellation: {
    email: {
      subject: 'Appointment Cancelled',
      template: 'Your appointment on {date} at {time} has been cancelled.',
    },
    sms: {
      template: 'Your appointment on {date} at {time} is cancelled.',
    },
  },
  reschedule: {
    email: {
      subject: 'Appointment Rescheduled',
      template: 'Your appointment has been rescheduled to {date} at {time}.',
    },
    sms: {
      template: 'Your appointment is rescheduled to {date} at {time}.',
    },
  },
};

export async function POST(request: NextRequest) {
  try {
    // Verify authentication
    const token = request.headers.get('authorization')?.replace('Bearer ', '');
    if (!token) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const payload = verifyToken(token);
    if (!payload || payload.role !== 'owner') {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const { appointmentId, type, template } = await request.json();

    if (!appointmentId || !type || !template) {
      return NextResponse.json(
        { message: 'Missing required fields' },
        { status: 400 }
      );
    }

    if (!['email', 'sms'].includes(type)) {
      return NextResponse.json(
        { message: 'Invalid notification type' },
        { status: 400 }
      );
    }

    const sql = getDbClient();

    // Get appointment details
    const appointments = await sql`
      SELECT
        a.id,
        a.business_id,
        a.slot_start,
        a.slot_end,
        a.customer_id,
        a.guest_email,
        a.guest_phone,
        u.email AS customer_email,
        u.phone AS customer_phone
      FROM appointments a
      LEFT JOIN users u ON u.id = a.customer_id
      WHERE a.id = ${appointmentId}
        AND a.business_id = ${payload.business_id}
        AND a.deleted_at IS NULL
      LIMIT 1
    `;

    if (appointments.length === 0) {
      return NextResponse.json({ message: 'Appointment not found' }, { status: 404 });
    }

    const apt = appointments[0];

    // Get template
    const templateGroup = NOTIFICATION_TEMPLATES[template as keyof typeof NOTIFICATION_TEMPLATES];
    if (!templateGroup) {
      return NextResponse.json({ message: 'Invalid template' }, { status: 400 });
    }
    
    const templateData = templateGroup[type as keyof typeof templateGroup];
    if (!templateData) {
      return NextResponse.json({ message: 'Invalid notification type' }, { status: 400 });
    }

    // Format message
    const startTime = new Date(apt.slot_start);
    const message = templateData.template
      .replace('{date}', startTime.toLocaleDateString())
      .replace('{time}', startTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));

    const subject = 'subject' in templateData ? templateData.subject : undefined;

    // Determine recipient
    const recipientEmail = apt.customer_email ?? apt.guest_email ?? null;
    const recipientPhone = apt.customer_phone ?? apt.guest_phone ?? null;

    const channel = type === 'email' ? 'email' : 'sms';
    const recipient = channel === 'email' ? recipientEmail : recipientPhone;

    if (!recipient) {
      return NextResponse.json(
        { message: `Customer ${type === 'email' ? 'email' : 'phone'} not available` },
        { status: 400 }
      );
    }

    // Create notification log entry
    const notificationId = nanoid();
    await sql`
      INSERT INTO notification_logs (
        id,
        appointment_id,
        recipient_email,
        recipient_phone,
        channel,
        template_name,
        status,
        attempts,
        last_attempt_at,
        error_message
      ) VALUES (
        ${notificationId},
        ${appointmentId},
        ${channel === 'email' ? recipientEmail : null},
        ${channel === 'sms' ? recipientPhone : null},
        ${channel},
        ${template},
        'sent',
        1,
        NOW(),
        NULL
      )
    `;

    return NextResponse.json({
      success: true,
      notificationId,
      preview: {
        subject,
        message,
        channel,
        recipient,
      },
    });
  } catch (error) {
    console.error('Send notification error:', error);
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    );
  }
}