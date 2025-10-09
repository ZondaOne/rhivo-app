import { NextRequest, NextResponse } from 'next/server';
import { getDbClient } from '@/db/client';
import { z } from 'zod';
import { randomBytes, createHash } from 'crypto';

const guestAccessSchema = z.object({
  bookingId: z.string().min(1),
  email: z.string().email(),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const data = guestAccessSchema.parse(body);

    const db = getDbClient();

    const result = await db`
      SELECT id, guest_email FROM appointments
      WHERE booking_id = ${data.bookingId} AND deleted_at IS NULL
      LIMIT 1
    `;

    if (result.length === 0) {
      // To prevent leaking information, we return a generic success message even if the booking doesn't exist.
      return NextResponse.json({
        success: true,
        message: 'If a booking with that ID and email exists, an access link will be sent.',
      });
    }

    const appointment = result[0];

    // IMPORTANT: Case-insensitive email comparison
    if (appointment.guest_email.toLowerCase() !== data.email.toLowerCase()) {
        // Again, generic message to prevent user enumeration.
        return NextResponse.json({
            success: true,
            message: 'If a booking with that ID and email exists, an access link will be sent.',
          });
    }

    // Generate a secure, short-lived token
    const token = randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes

    // Hash the token before storing (security best practice)
    const tokenHash = createHash('sha256').update(token).digest('hex');

    await db`
      UPDATE appointments
      SET guest_token_hash = ${tokenHash}, guest_token_expires_at = ${expiresAt}
      WHERE id = ${appointment.id}
    `;

    const manageUrl = new URL(`/book/manage/${data.bookingId}?token=${token}`, request.nextUrl.origin);

    // TODO: Implement email sending
    // The email should be sent to `data.email` and contain the `manageUrl`.
    // For now, we will log the URL to the console for development.
    console.log(`Guest access URL for ${data.email}: ${manageUrl.toString()}`);

    return NextResponse.json({
      success: true,
      message: 'Guest access link generated for debugging.',
      manageUrl: manageUrl.toString(),
    });

  } catch (error: unknown) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, error: 'Invalid request data', details: error.issues },
        { status: 400 }
      );
    }

    console.error('Guest access error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to process guest access request' },
      { status: 500 }
    );
  }
}
