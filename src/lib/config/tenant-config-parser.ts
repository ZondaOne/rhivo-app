/**
 * Tenant Configuration Parser
 *
 * Loads, parses, and validates tenant YAML configuration files.
 */

import * as yaml from 'js-yaml';
import { TenantConfigSchema, validateTenantConfig, type TenantConfig } from './tenant-schema';
import { ZodError } from 'zod';

export interface ParseResult {
  success: boolean;
  config?: TenantConfig;
  errors: string[];
  warnings: string[];
}

export interface ValidationError {
  path: string;
  message: string;
  code?: string;
}

/**
 * Parse YAML string into a tenant configuration object
 */
export function parseTenantConfigYAML(yamlString: string): ParseResult {
  const warnings: string[] = [];
  const errors: string[] = [];

  try {
    // Parse YAML
    const rawConfig = yaml.load(yamlString);

    if (!rawConfig || typeof rawConfig !== 'object') {
      return {
        success: false,
        errors: ['Invalid YAML: root must be an object'],
        warnings,
      };
    }

    // Validate against Zod schema
    const parseResult = TenantConfigSchema.safeParse(rawConfig);

    if (!parseResult.success) {
      const zodErrors = formatZodErrors(parseResult.error);
      return {
        success: false,
        errors: zodErrors,
        warnings,
      };
    }

    const config = parseResult.data;

    // Run additional validation rules
    const additionalValidation = validateTenantConfig(config);

    if (!additionalValidation.valid) {
      return {
        success: false,
        config,
        errors: additionalValidation.errors,
        warnings,
      };
    }

    // Generate warnings for non-critical issues
    generateWarnings(config, warnings);

    return {
      success: true,
      config,
      errors: [],
      warnings,
    };
  } catch (error) {
    if (error instanceof yaml.YAMLException) {
      return {
        success: false,
        errors: [`YAML parsing error: ${error.message}`],
        warnings,
      };
    }

    return {
      success: false,
      errors: [`Unexpected error: ${error instanceof Error ? error.message : String(error)}`],
      warnings,
    };
  }
}

/**
 * Load and parse tenant configuration from file path
 */
export async function loadTenantConfig(filePath: string): Promise<ParseResult> {
  try {
    const fs = await import('fs/promises');
    const yamlString = await fs.readFile(filePath, 'utf-8');
    return parseTenantConfigYAML(yamlString);
  } catch (error) {
    return {
      success: false,
      errors: [`Failed to read file: ${error instanceof Error ? error.message : String(error)}`],
      warnings: [],
    };
  }
}

/**
 * Format Zod validation errors into human-readable messages
 */
function formatZodErrors(error: ZodError): string[] {
  return error.errors.map((err) => {
    const path = err.path.join('.');
    return `${path ? `${path}: ` : ''}${err.message}`;
  });
}

/**
 * Generate warnings for non-critical configuration issues
 */
function generateWarnings(config: TenantConfig, warnings: string[]): void {
  // Warn if business hours are unusual
  for (const day of config.availability) {
    if (day.enabled && day.slots && day.slots.length > 0) {
      // Check first slot opening time
      const firstSlot = day.slots[0];
      const [openHour] = firstSlot.open.split(':').map(Number);

      if (openHour < 6) {
        warnings.push(`${day.day}: Opening time ${firstSlot.open} is very early (before 6 AM)`);
      }

      // Check last slot closing time
      const lastSlot = day.slots[day.slots.length - 1];
      const [closeHour, closeMin] = lastSlot.close.split(':').map(Number);

      if (closeHour > 23 || (closeHour === 23 && closeMin > 0)) {
        warnings.push(`${day.day}: Closing time ${lastSlot.close} is very late (after 11 PM)`);
      }

      // Calculate total hours across all slots
      const totalMinutes = day.slots.reduce((sum, slot) => {
        const [openH, openM] = slot.open.split(':').map(Number);
        const [closeH, closeM] = slot.close.split(':').map(Number);
        const openMinutes = openH * 60 + openM;
        const closeMinutes = closeH * 60 + closeM;
        return sum + (closeMinutes - openMinutes);
      }, 0);
      const totalHours = totalMinutes / 60;

      if (totalHours > 16) {
        warnings.push(`${day.day}: Business hours span ${totalHours.toFixed(1)} hours, which is unusually long`);
      }
    }
  }

  // Warn if advance booking is too far out
  if (config.bookingLimits.advanceBookingDays > 180) {
    warnings.push(
      `Advance booking allowed ${config.bookingLimits.advanceBookingDays} days out. Consider limiting to 180 days or less.`
    );
  }

  // Warn if time slot is very small
  if (config.timeSlotDuration < 15) {
    warnings.push(
      `Time slot duration of ${config.timeSlotDuration} minutes is very small and may create performance issues.`
    );
  }

  // Warn if max simultaneous bookings is very high
  if (config.bookingLimits.maxSimultaneousBookings > 20) {
    warnings.push(
      `Max simultaneous bookings (${config.bookingLimits.maxSimultaneousBookings}) is very high. Ensure adequate capacity.`
    );
  }

  // Warn if no cancellation allowed
  if (!config.cancellationPolicy.allowCancellation && !config.cancellationPolicy.allowRescheduling) {
    warnings.push(
      'Neither cancellation nor rescheduling is allowed. This may create poor customer experience.'
    );
  }

  // Warn if deposit required but no payment system enabled
  const hasDepositServices = config.categories.some(cat =>
    cat.services.some(svc => svc.requiresDeposit)
  );
  if (hasDepositServices && !config.features.enableOnlinePayments) {
    warnings.push(
      'Some services require deposits but online payments are not enabled.'
    );
  }

  // Warn if email verification required but guest booking allowed
  if (config.bookingRequirements.requireEmailVerification && config.bookingRequirements.allowGuestBooking) {
    warnings.push(
      'Email verification is required but guest booking is allowed. Consider disabling guest booking.'
    );
  }

  // Warn if all days are disabled
  const allDaysDisabled = config.availability.every(day => !day.enabled);
  if (allDaysDisabled) {
    warnings.push('All days are disabled. Business will not accept any bookings.');
  }

  // Warn about missing optional but recommended fields
  if (!config.business.description) {
    warnings.push('Business description is missing. This helps customers understand your business.');
  }

  if (!config.contact.website) {
    warnings.push('Website URL is missing.');
  }

  // Warn if services don't have descriptions
  const servicesWithoutDescription = config.categories.flatMap(cat =>
    cat.services.filter(svc => !svc.description).map(svc => svc.name)
  );
  if (servicesWithoutDescription.length > 0) {
    warnings.push(
      `Services without descriptions: ${servicesWithoutDescription.join(', ')}`
    );
  }
}

/**
 * Validate multiple config versions for rollback safety
 */
export function validateConfigMigration(
  oldConfig: TenantConfig,
  newConfig: TenantConfig
): { safe: boolean; breakingChanges: string[] } {
  const breakingChanges: string[] = [];

  // Check if business ID changed (breaking)
  if (oldConfig.business.id !== newConfig.business.id) {
    breakingChanges.push('Business ID changed - this will break subdomain routing');
  }

  // Check if timezone changed (breaking)
  if (oldConfig.business.timezone !== newConfig.business.timezone) {
    breakingChanges.push('Timezone changed - existing appointments may show incorrect times');
  }

  // Check if services were removed (breaking for existing bookings)
  const oldServiceIds = new Set(
    oldConfig.categories.flatMap(cat => cat.services.map(svc => svc.id))
  );
  const newServiceIds = new Set(
    newConfig.categories.flatMap(cat => cat.services.map(svc => svc.id))
  );

  for (const oldId of oldServiceIds) {
    if (!newServiceIds.has(oldId)) {
      breakingChanges.push(`Service removed: ${oldId} - existing bookings may break`);
    }
  }

  // Check if service durations changed significantly (breaking)
  const oldServices = new Map(
    oldConfig.categories.flatMap(cat => cat.services.map(svc => [svc.id, svc]))
  );
  const newServices = new Map(
    newConfig.categories.flatMap(cat => cat.services.map(svc => [svc.id, svc]))
  );

  for (const [id, oldService] of oldServices) {
    const newService = newServices.get(id);
    if (newService && newService.duration !== oldService.duration) {
      breakingChanges.push(
        `Service duration changed: ${id} (${oldService.duration}min -> ${newService.duration}min)`
      );
    }
  }

  return {
    safe: breakingChanges.length === 0,
    breakingChanges,
  };
}

/**
 * Export configuration to JSON Schema for documentation
 */
export function generateJSONSchema(): Record<string, any> {
  // This would use a library like zod-to-json-schema in production
  // For now, we return a placeholder
  return {
    $schema: 'http://json-schema.org/draft-07/schema#',
    title: 'Rivo Tenant Configuration Schema',
    version: '1.0.0',
    description: 'Schema for per-tenant booking configuration',
    type: 'object',
    // In production, use a proper conversion library
  };
}