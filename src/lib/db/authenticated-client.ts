import { neon, NeonQueryFunction } from '@neondatabase/serverless';

/**
 * Create an authenticated database client with JWT claims set for RLS
 */
export async function createAuthenticatedDbClient(claims: {
  user_id: string;
  role: string;
  business_id?: string;
  email: string;
}): Promise<NeonQueryFunction<false, false>> {
  const sql = neon(process.env.DATABASE_URL!);

  // Execute a query to set session variables for RLS
  // These variables will be used by RLS policies to enforce access control
  await sql`
    SELECT
      set_config('request.jwt.claims', ${JSON.stringify(claims)}, true) as jwt_claims
  `;

  return sql;
}

/**
 * Helper to extract claims from request headers (set by auth middleware)
 */
export function getClaimsFromHeaders(headers: Headers): {
  user_id: string;
  role: string;
  business_id?: string;
} | null {
  const userId = headers.get('x-user-id');
  const role = headers.get('x-user-role');
  const businessId = headers.get('x-business-id');

  if (!userId || !role) {
    return null;
  }

  return {
    user_id: userId,
    role,
    ...(businessId && { business_id: businessId }),
  };
}