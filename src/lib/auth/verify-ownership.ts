import { DbClient } from '@/db/client';
import { NextResponse } from 'next/server';

/**
 * Verify that a user owns a specific business
 * Uses the user_owns_business() database function
 *
 * @param db - Database client
 * @param userId - UUID of the user
 * @param businessId - UUID of the business
 * @returns true if user owns the business, false otherwise
 */
export async function verifyBusinessOwnership(
  db: DbClient,
  userId: string,
  businessId: string
): Promise<boolean> {
  const result = await db`
    SELECT user_owns_business(${userId}, ${businessId}) as owns
  `;

  return result[0]?.owns === true;
}

/**
 * Middleware helper to verify business ownership and return 403 if unauthorized
 * Use this in all owner-protected endpoints that access business-specific data
 *
 * @param db - Database client
 * @param userId - UUID of the user
 * @param businessId - UUID of the business
 * @returns NextResponse with 403 error if unauthorized, null if authorized
 *
 * @example
 * ```typescript
 * const unauthorizedResponse = await requireBusinessOwnership(db, userId, businessId);
 * if (unauthorizedResponse) return unauthorizedResponse;
 * // Now safe to query - user ownership verified
 * ```
 */
export async function requireBusinessOwnership(
  db: DbClient,
  userId: string,
  businessId: string
): Promise<NextResponse | null> {
  const owns = await verifyBusinessOwnership(db, userId, businessId);

  if (!owns) {
    return NextResponse.json(
      {
        error: 'Unauthorized',
        message: 'You do not have permission to access this business'
      },
      { status: 403 }
    );
  }

  return null; // null means authorized, continue
}
