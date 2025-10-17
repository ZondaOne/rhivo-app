/**
 * Authenticated API client that automatically includes JWT token
 */

let accessToken: string | null = null;

export function setAccessToken(token: string | null) {
  accessToken = token;
}

export function getAccessToken(): string | null {
  return accessToken;
}

interface RequestOptions extends RequestInit {
  requireAuth?: boolean;
}

/**
 * Make authenticated API request
 */
export async function apiRequest<T = any>(
  url: string,
  options: RequestOptions = {}
): Promise<T> {
  const { requireAuth = true, headers = {}, ...rest } = options;

  const requestHeaders: HeadersInit = {
    'Content-Type': 'application/json',
    ...headers,
  };

  // Add authorization header if token exists
  if (requireAuth && accessToken) {
    (requestHeaders as Record<string, string>)['Authorization'] = `Bearer ${accessToken}`;
  }

  const response = await fetch(url, {
    ...rest,
    headers: requestHeaders,
  });

  if (!response.ok) {
    const errorBody = await response.json().catch(() => ({}));

    // Create an error object that preserves status, code, and message
    const error: any = new Error(
      errorBody.message ||
      errorBody.error ||
      'Request failed'
    );
    error.status = response.status;
    error.code = errorBody.code;
    error.details = errorBody.details;

    throw error;
  }

  return response.json();
}

/**
 * Make authenticated API request with NeonDB and JWT claims
 * This sets up the connection with proper JWT claims for RLS
 */
export function createAuthenticatedDbConnection(token: string | null) {
  if (!token) {
    throw new Error('No access token available');
  }

  // Parse JWT to extract claims
  const payload = JSON.parse(atob(token.split('.')[1]));

  return {
    token,
    claims: {
      user_id: payload.sub,
      role: payload.role,
      business_id: payload.business_id,
      email: payload.email,
    },
  };
}