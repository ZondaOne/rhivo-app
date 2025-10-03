/**
 * Service Database Helpers
 * 
 * Provides utilities for looking up services by either UUID or external_id (slug).
 * This bridges the gap between YAML config IDs and database UUIDs.
 */

/**
 * Service record from database
 */
export interface ServiceRecord {
  id: string;
  business_id: string;
  category_id: string | null;
  name: string;
  duration_minutes: number;
  price_cents: number;
  color: string;
  max_simultaneous_bookings: number;
  sort_order: number;
  external_id: string | null;
  created_at: Date;
  updated_at: Date;
  deleted_at: Date | null;
}

/**
 * Check if a string is a valid UUID format
 */
function isUuid(value: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidRegex.test(value);
}

/**
 * Get service by either UUID (id) or external_id (slug)
 * 
 * @param db - Postgres client
 * @param businessId - Business UUID (required for scoping)
 * @param identifier - Either UUID or external_id
 * @returns Service record or null if not found
 * 
 * @example
 * // Using UUID
 * const service = await getServiceByIdentifier(db, businessId, "a1b2c3d4-...");
 * 
 * // Using external_id (slug)
 * const service = await getServiceByIdentifier(db, businessId, "swedish-massage-60");
 */
export async function getServiceByIdentifier(
  db: any,
  businessId: string,
  identifier: string
): Promise<ServiceRecord | null> {
  if (!identifier || !businessId) {
    console.log('❌ getServiceByIdentifier: Missing identifier or businessId');
    return null;
  }

  console.log('🔎 getServiceByIdentifier called:');
  console.log('  identifier:', identifier);
  console.log('  isUuid:', isUuid(identifier));

  let result: any;

  if (isUuid(identifier)) {
    // Look up by UUID (id column)
    console.log('  → Looking up by UUID (id column)');
    result = await db`
      SELECT * FROM services
      WHERE id = ${identifier}
        AND business_id = ${businessId}
        AND deleted_at IS NULL
      LIMIT 1
    `;
  } else {
    // Look up by external_id (slug)
    console.log('  → Looking up by external_id (slug)');
    result = await db`
      SELECT * FROM services
      WHERE external_id = ${identifier}
        AND business_id = ${businessId}
        AND deleted_at IS NULL
      LIMIT 1
    `;
  }

  console.log('  → Result count:', result.length);
  return result.length > 0 ? result[0] as ServiceRecord : null;
}

/**
 * Get service UUID from external_id
 * 
 * @param db - Postgres client
 * @param businessId - Business UUID
 * @param externalId - External ID (slug from YAML)
 * @returns Service UUID or null if not found
 * 
 * @example
 * const uuid = await getServiceUuid(db, businessId, "swedish-massage-60");
 */
export async function getServiceUuid(
  db: any,
  businessId: string,
  externalId: string
): Promise<string | null> {
  const service = await getServiceByIdentifier(db, businessId, externalId);
  return service?.id ?? null;
}

/**
 * Validate that a service exists and is available for booking
 * 
 * @param db - Postgres client
 * @param businessId - Business UUID
 * @param identifier - Either UUID or external_id
 * @returns Service record if valid, throws error if not
 * 
 * @throws Error if service not found or not available
 */
export async function validateServiceForBooking(
  db: any,
  businessId: string,
  identifier: string
): Promise<ServiceRecord> {
  const service = await getServiceByIdentifier(db, businessId, identifier);

  if (!service) {
    throw new Error(`Service not found: ${identifier}`);
  }

  // Additional validation could be added here:
  // - Check if service is enabled
  // - Check if service category is active
  // - Check business status

  return service;
}
