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

    const payload = await verifyToken(token);
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

    const db = getDbClient();

    // Get appointment details
    const appointment = await db.query(
      `SELECT * FROM appointments WHERE id = $1 AND business_id = $2 AND deleted_at IS NULL`,
      [appointmentId, payload.business_id]
    );

    if (appointment.length === 0) {
      return NextResponse.json({ message: 'Appointment not found' }, { status: 404 });
    }

    const apt = appointment[0];

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
    const startTime = new Date(apt.start_time);
    const message = templateData.template
      .replace('{date}', startTime.toLocaleDateString())
      .replace('{time}', startTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));

    const subject = 'subject' in templateData ? templateData.subject : undefined;

    // Determine recipient
    const recipient = type === 'email' ? apt.customer_email : apt.customer_phone;
    if (!recipient) {
      return NextResponse.json(
        { message: `Customer ${type === 'email' ? 'email' : 'phone'} not available` },
        { status: 400 }
      );
    }

    // Create notification log entry
    const notificationId = nanoid();
    await db.query(
      `INSERT INTO notification_log (
        id, appointment_id, type, recipient, subject, message, status, created_at
      )
      VALUES ($1, $2, $3, $4, $5, $6, 'pending', NOW())`,
      [notificationId, appointmentId, type, recipient, subject, message]
    );

    // TODO: Integrate with email/SMS provider
    // For now, mark as sent
    await db.query(
      `UPDATE notification_log SET status = 'sent', sent_at = NOW() WHERE id = $1`,
      [notificationId]
    );

    return NextResponse.json({ success: true, notificationId });
  } catch (error) {
    console.error('Send notification error:', error);
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    );
  }
}