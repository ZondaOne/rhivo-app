/**
 * In-memory rate limiter for reservation API
 *
 * Limits: 10 reservation attempts per 5 minutes per IP address
 * This prevents malicious clients from spamming reservation creation
 */

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

const rateLimitStore = new Map<string, RateLimitEntry>();

export interface RateLimitConfig {
  maxRequests: number;
  windowMs: number;
}

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetAt: number;
}

/**
 * Check if a request should be rate limited
 */
export function checkRateLimit(
  identifier: string,
  config: RateLimitConfig = { maxRequests: 10, windowMs: 5 * 60 * 1000 }
): RateLimitResult {
  const now = Date.now();

  // Get or create entry
  let entry = rateLimitStore.get(identifier);

  // Reset if window expired
  if (!entry || now >= entry.resetAt) {
    entry = {
      count: 0,
      resetAt: now + config.windowMs,
    };
    rateLimitStore.set(identifier, entry);
  }

  // Increment count
  entry.count++;

  const allowed = entry.count <= config.maxRequests;
  const remaining = Math.max(0, config.maxRequests - entry.count);

  return {
    allowed,
    remaining,
    resetAt: entry.resetAt,
  };
}

/**
 * Extract client identifier from request
 * Uses IP address, falling back to a default if not available
 */
export function getClientIdentifier(request: Request): string {
  // Try to get real IP from headers (Vercel/Cloudflare)
  const forwardedFor = request.headers.get('x-forwarded-for');
  const realIp = request.headers.get('x-real-ip');
  const cfConnectingIp = request.headers.get('cf-connecting-ip');

  const ip = cfConnectingIp || realIp || forwardedFor?.split(',')[0] || 'unknown';

  return `ip:${ip.trim()}`;
}

/**
 * Cleanup expired entries periodically
 * Should be called occasionally to prevent memory leaks
 */
export function cleanupRateLimitStore(): number {
  const now = Date.now();
  let cleanedCount = 0;

  for (const [key, entry] of rateLimitStore.entries()) {
    if (now >= entry.resetAt) {
      rateLimitStore.delete(key);
      cleanedCount++;
    }
  }

  return cleanedCount;
}

// Auto-cleanup every 10 minutes
if (typeof global !== 'undefined') {
  setInterval(() => {
    const cleaned = cleanupRateLimitStore();
    if (cleaned > 0) {
      console.log(`[RateLimit] Cleaned up ${cleaned} expired entries`);
    }
  }, 10 * 60 * 1000);
}
