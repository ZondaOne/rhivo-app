import { neon } from '@neondatabase/serverless';

const sql = neon(process.env.DATABASE_URL!);

interface RateLimitConfig {
  maxAttempts: number;
  windowMinutes: number;
}

// Production rate limits to prevent brute force and abuse
// Test environment can override these with higher values if needed
const RATE_LIMITS: Record<string, RateLimitConfig> = {
  login: { maxAttempts: process.env.NODE_ENV === 'test' ? 100 : 5, windowMinutes: 15 },
  guest_token_validation: { maxAttempts: process.env.NODE_ENV === 'test' ? 100 : 10, windowMinutes: 60 },
  password_reset: { maxAttempts: process.env.NODE_ENV === 'test' ? 100 : 3, windowMinutes: 60 },
  email_verification: { maxAttempts: process.env.NODE_ENV === 'test' ? 100 : 5, windowMinutes: 60 },
};

/**
 * Check if identifier is rate limited for action
 * Returns true if rate limit exceeded
 */
export async function checkRateLimit(
  identifier: string,
  action: keyof typeof RATE_LIMITS
): Promise<boolean> {
  const config = RATE_LIMITS[action];
  if (!config) {
    throw new Error(`Unknown rate limit action: ${action}`);
  }

  const windowStart = new Date(Date.now() - config.windowMinutes * 60 * 1000);

  // Get or create rate limit record
  const result = await sql`
    INSERT INTO rate_limits (identifier, action, attempts, window_start)
    VALUES (${identifier}, ${action}, 1, NOW())
    ON CONFLICT (identifier, action)
    DO UPDATE SET
      attempts = CASE
        WHEN rate_limits.window_start < ${windowStart}
        THEN 1
        ELSE rate_limits.attempts + 1
      END,
      window_start = CASE
        WHEN rate_limits.window_start < ${windowStart}
        THEN NOW()
        ELSE rate_limits.window_start
      END
    RETURNING attempts;
  `;

  const attempts = result[0]?.attempts || 0;
  return attempts > config.maxAttempts;
}

/**
 * Reset rate limit for identifier and action
 */
export async function resetRateLimit(
  identifier: string,
  action: keyof typeof RATE_LIMITS
): Promise<void> {
  await sql`
    DELETE FROM rate_limits
    WHERE identifier = ${identifier} AND action = ${action};
  `;
}

/**
 * Get remaining attempts for identifier and action
 */
export async function getRemainingAttempts(
  identifier: string,
  action: keyof typeof RATE_LIMITS
): Promise<number> {
  const config = RATE_LIMITS[action];
  const windowStart = new Date(Date.now() - config.windowMinutes * 60 * 1000);

  const result = await sql`
    SELECT attempts
    FROM rate_limits
    WHERE identifier = ${identifier}
      AND action = ${action}
      AND window_start >= ${windowStart};
  `;

  const attempts = result[0]?.attempts || 0;
  return Math.max(0, config.maxAttempts - attempts);
}