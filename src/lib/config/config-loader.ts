/**
 * Configuration Loader for Tenant Booking Pages
 *
 * Loads and caches YAML configurations for customer-facing booking pages.
 * Supports both file-based configs and database-stored configs.
 */

import { parseTenantConfigYAML, type ParseResult } from './tenant-config-parser';
import { type TenantConfig } from './tenant-schema';
import { getDbClient } from '@/db/client';

// In-memory cache for configs (5 minute TTL)
const configCache = new Map<string, { config: TenantConfig; timestamp: number }>();
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

export interface ConfigLoadResult {
  success: boolean;
  config?: TenantConfig;
  error?: string;
  subdomain?: string;
}

/**
 * Load tenant configuration by business ID
 * Primarily for owner dashboard where subdomain might not be available
 */
export async function loadConfigByBusinessId(businessId: string): Promise<ConfigLoadResult> {
  try {
    // Check cache first using businessId as key
    const cacheKey = `businessId:${businessId}`;
    const cached = configCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
      return { success: true, config: cached.config };
    }

    // Get business info to find subdomain and config path
    const db = getDbClient();
    const businessResult = await db`
      SELECT
        id,
        subdomain,
        name,
        timezone,
        config_yaml_path,
        config_version,
        status
      FROM businesses
      WHERE id = ${businessId}
        AND deleted_at IS NULL
        AND status = 'active'
      LIMIT 1
    `;

    if (businessResult.length === 0) {
      return {
        success: false,
        error: `No active business found for ID: ${businessId}`,
      };
    }

    const business = businessResult[0];

    // Try to load YAML from file path
    if (business.config_yaml_path) {
      const yamlConfig = await loadFromFile(business.config_yaml_path);
      if (yamlConfig.success && yamlConfig.config) {
        // Cache it with both businessId and subdomain keys
        configCache.set(cacheKey, {
          config: yamlConfig.config,
          timestamp: Date.now(),
        });
        configCache.set(business.subdomain, {
          config: yamlConfig.config,
          timestamp: Date.now(),
        });
        return { success: true, config: yamlConfig.config, subdomain: business.subdomain };
      }
    }

    // Fall back to building config from database
    const dbConfig = await buildConfigFromDatabase(business.id);
    if (dbConfig.success && dbConfig.config) {
      configCache.set(cacheKey, {
        config: dbConfig.config,
        timestamp: Date.now(),
      });
      configCache.set(business.subdomain, {
        config: dbConfig.config,
        timestamp: Date.now(),
      });
      return { success: true, config: dbConfig.config, subdomain: business.subdomain };
    }

    return {
      success: false,
      error: 'Failed to load configuration from any source',
    };
  } catch (error) {
    console.error('Error loading config by business ID:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Load tenant configuration by subdomain
 * First checks cache, then database, then falls back to file system
 */
export async function loadConfigBySubdomain(subdomain: string): Promise<ConfigLoadResult> {
  try {
    // Check cache first
    const cached = configCache.get(subdomain);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
      return { success: true, config: cached.config, subdomain };
    }

    // Try to load from database
    const db = getDbClient();
    const businessResult = await db`
      SELECT
        id,
        subdomain,
        name,
        timezone,
        config_yaml_path,
        config_version,
        status
      FROM businesses
      WHERE subdomain = ${subdomain}
        AND deleted_at IS NULL
        AND status = 'active'
      LIMIT 1
    `;

    if (businessResult.length === 0) {
      return {
        success: false,
        error: `No active business found for subdomain: ${subdomain}`,
      };
    }

    const business = businessResult[0];

    // Try to load YAML from file path
    if (business.config_yaml_path) {
      const yamlConfig = await loadFromFile(business.config_yaml_path);
      if (yamlConfig.success && yamlConfig.config) {
        // Cache it
        configCache.set(subdomain, {
          config: yamlConfig.config,
          timestamp: Date.now(),
        });
        return { success: true, config: yamlConfig.config, subdomain };
      }
    }

    // Fall back to building config from database
    const dbConfig = await buildConfigFromDatabase(business.id);
    if (dbConfig.success && dbConfig.config) {
      configCache.set(subdomain, {
        config: dbConfig.config,
        timestamp: Date.now(),
      });
      return { success: true, config: dbConfig.config, subdomain };
    }

    return {
      success: false,
      error: 'Failed to load configuration from any source',
    };
  } catch (error) {
    console.error('Error loading config by subdomain:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Load configuration from YAML file
 */
async function loadFromFile(filePath: string): Promise<ParseResult> {
  try {
    const fs = await import('fs/promises');
    const path = await import('path');

    // Resolve path relative to project root
    const fullPath = path.resolve(process.cwd(), filePath);
    const yamlContent = await fs.readFile(fullPath, 'utf-8');

    return parseTenantConfigYAML(yamlContent);
  } catch (error) {
    return {
      success: false,
      errors: [`Failed to read config file: ${error instanceof Error ? error.message : 'Unknown error'}`],
      warnings: [],
    };
  }
}

/**
 * Build configuration from database records
 * (Fallback when YAML file is not available)
 */
async function buildConfigFromDatabase(businessId: string): Promise<ParseResult> {
  try {
    const db = getDbClient();

    // Get business info
    const [business] = await db`
      SELECT * FROM businesses WHERE id = ${businessId} AND deleted_at IS NULL
    `;

    if (!business) {
      return {
        success: false,
        errors: ['Business not found'],
        warnings: [],
      };
    }

    // Get categories and services
    const categories = await db`
      SELECT
        c.id,
        c.name,
        c.sort_order,
        json_agg(
          json_build_object(
            'id', s.id,
            'name', s.name,
            'duration', s.duration_minutes,
            'price', s.price_cents,
            'color', s.color,
            'sortOrder', s.sort_order,
            'enabled', true,
            'maxSimultaneousBookings', s.max_simultaneous_bookings
          ) ORDER BY s.sort_order
        ) as services
      FROM categories c
      LEFT JOIN services s ON s.category_id = c.id AND s.deleted_at IS NULL
      WHERE c.business_id = ${businessId}
        AND c.deleted_at IS NULL
      GROUP BY c.id, c.name, c.sort_order
      ORDER BY c.sort_order
    `;

    // Get availability
    const availability = await db`
      SELECT
        day_of_week,
        start_time,
        end_time,
        is_available
      FROM availability
      WHERE business_id = ${businessId}
        AND deleted_at IS NULL
        AND day_of_week IS NOT NULL
      ORDER BY day_of_week
    `;

    const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];

    // Build minimal config
    const config: TenantConfig = {
      version: '1.0.0',
      business: {
        id: businessId,
        name: business.name,
        timezone: business.timezone || 'America/New_York',
        locale: 'en-US',
        currency: 'USD',
      },
      contact: {
        address: {
          street: '',
          city: '',
          state: '',
          postalCode: '',
          country: 'US',
        },
        email: 'bookings@example.com',
        phone: '+10000000000',
      },
      branding: {
        primaryColor: '#14b8a6',
        secondaryColor: '#10b981',
        logoUrl: 'https://via.placeholder.com/200',
      },
      timeSlotDuration: 30,
      availability: availability.length > 0
        ? availability.map(a => ({
            day: dayNames[a.day_of_week] as any,
            open: a.start_time,
            close: a.end_time,
            enabled: a.is_available,
          }))
        : dayNames.map(day => ({
            day: day as any,
            open: '09:00',
            close: '17:00',
            enabled: day !== 'sunday',
          })),
      availabilityExceptions: [],
      categories: categories.map(c => ({
        id: c.id,
        name: c.name,
        sortOrder: c.sort_order,
        services: (c.services || []).map((s: any) => ({
          id: s.id,
          name: s.name,
          duration: s.duration,
          price: s.price,
          color: s.color,
          sortOrder: s.sortOrder,
          enabled: s.enabled,
          bufferBefore: 0,
          bufferAfter: 0,
        })),
      })),
      bookingRequirements: {
        requireEmail: true,
        requirePhone: false,
        requireName: true,
        allowGuestBooking: true,
        requireEmailVerification: false,
        requirePhoneVerification: false,
        customFields: [],
      },
      bookingLimits: {
        maxSimultaneousBookings: 1,
        advanceBookingDays: 30,
        minAdvanceBookingMinutes: 60,
      },
      cancellationPolicy: {
        allowCancellation: true,
        cancellationDeadlineHours: 24,
        allowRescheduling: true,
        rescheduleDeadlineHours: 24,
        refundPolicy: 'full',
      },
      notifications: {
        sendConfirmationEmail: true,
        sendReminderEmail: true,
        reminderHoursBefore: 24,
        sendConfirmationSMS: false,
        sendReminderSMS: false,
        ownerNotificationEmail: 'owner@example.com',
        notifyOwnerOnNewBooking: true,
        notifyOwnerOnCancellation: true,
      },
      features: {
        enableOnlinePayments: false,
        enableWaitlist: false,
        enableReviews: false,
        enableMultipleStaff: false,
      },
    };

    return {
      success: true,
      config,
      errors: [],
      warnings: ['Configuration built from database (YAML file not found)'],
    };
  } catch (error) {
    return {
      success: false,
      errors: [`Failed to build config from database: ${error instanceof Error ? error.message : 'Unknown error'}`],
      warnings: [],
    };
  }
}

/**
 * Clear the configuration cache for a specific subdomain or all subdomains
 */
export function clearConfigCache(subdomain?: string): void {
  if (subdomain) {
    configCache.delete(subdomain);
  } else {
    configCache.clear();
  }
}

/**
 * Get subdomain from request hostname
 */
export function extractSubdomain(hostname: string): string | null {
  // Handle localhost and development
  if (hostname.includes('localhost') || hostname.includes('127.0.0.1')) {
    // For local dev, we can use a query param or default subdomain
    return null;
  }

  // Extract subdomain from hostname (e.g., "salon.rhivo.app" -> "salon")
  const parts = hostname.split('.');

  // Need at least 3 parts for a subdomain (subdomain.domain.tld)
  if (parts.length >= 3) {
    return parts[0];
  }

  return null;
}
