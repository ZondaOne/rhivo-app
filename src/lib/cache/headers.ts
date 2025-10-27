/**
 * Cache header utilities for API routes
 *
 * These helpers generate appropriate Cache-Control headers for different types of data.
 * Netlify CDN respects these headers to cache responses at the edge.
 */

export interface CacheOptions {
  /**
   * Maximum age in seconds for CDN/shared caches (s-maxage)
   * This is how long Netlify CDN will cache the response
   */
  maxAge: number;

  /**
   * Stale-while-revalidate duration in seconds
   * Allows serving stale content while fetching fresh data in background
   */
  staleWhileRevalidate?: number;

  /**
   * Whether this is public (CDN cacheable) or private (browser only)
   * Use 'private' for authenticated endpoints
   */
  visibility?: 'public' | 'private';
}

/**
 * Generate Cache-Control header value
 */
export function getCacheControl(options: CacheOptions): string {
  const { maxAge, staleWhileRevalidate, visibility = 'public' } = options;

  const parts = [visibility];

  if (visibility === 'public') {
    parts.push(`s-maxage=${maxAge}`);
  } else {
    parts.push(`max-age=${maxAge}`);
  }

  if (staleWhileRevalidate) {
    parts.push(`stale-while-revalidate=${staleWhileRevalidate}`);
  }

  return parts.join(', ');
}

/**
 * Create headers object with cache control
 */
export function withCache(options: CacheOptions): HeadersInit {
  return {
    'Cache-Control': getCacheControl(options),
  };
}

/**
 * Preset cache configurations for common use cases
 */
export const CachePresets = {
  /**
   * For frequently changing data (appointments, bookings)
   * Cache for 1 minute, serve stale for 5 minutes
   */
  FREQUENT: {
    maxAge: 60,
    staleWhileRevalidate: 300,
    visibility: 'private' as const,
  },

  /**
   * For moderately changing data (services, available slots)
   * Cache for 30 seconds, serve stale for 5 minutes
   */
  MODERATE: {
    maxAge: 30,
    staleWhileRevalidate: 300,
    visibility: 'public' as const,
  },

  /**
   * For rarely changing data (business info, config)
   * Cache for 10 minutes, serve stale for 30 minutes
   */
  STATIC: {
    maxAge: 600,
    staleWhileRevalidate: 1800,
    visibility: 'public' as const,
  },

  /**
   * For authenticated user data
   * Cache for 5 minutes in browser only
   */
  PRIVATE: {
    maxAge: 300,
    staleWhileRevalidate: 600,
    visibility: 'private' as const,
  },

  /**
   * No caching - for write operations or real-time data
   */
  NO_CACHE: {
    maxAge: 0,
    staleWhileRevalidate: 0,
    visibility: 'private' as const,
  },
} as const;
