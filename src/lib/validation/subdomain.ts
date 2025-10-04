/**
 * Subdomain validation utilities for business registration
 */

import { neon } from '@neondatabase/serverless';

const RESERVED_SUBDOMAINS = [
  'www',
  'app',
  'api',
  'admin',
  'dashboard',
  'book',
  'booking',
  'auth',
  'login',
  'signup',
  'register',
  'onboard',
  'debug',
  'test',
  'dev',
  'staging',
  'prod',
  'production',
  'help',
  'support',
  'status',
  'blog',
  'docs',
  'documentation',
];

/**
 * Validate subdomain format
 */
export function validateSubdomainFormat(subdomain: string): {
  valid: boolean;
  error?: string;
} {
  // Check length
  if (subdomain.length < 3) {
    return { valid: false, error: 'Subdomain must be at least 3 characters' };
  }

  if (subdomain.length > 63) {
    return { valid: false, error: 'Subdomain cannot exceed 63 characters' };
  }

  // Check format: lowercase alphanumeric and hyphens only
  const formatRegex = /^[a-z0-9-]+$/;
  if (!formatRegex.test(subdomain)) {
    return { valid: false, error: 'Subdomain can only contain lowercase letters, numbers, and hyphens' };
  }

  // Cannot start or end with hyphen
  if (subdomain.startsWith('-') || subdomain.endsWith('-')) {
    return { valid: false, error: 'Subdomain cannot start or end with a hyphen' };
  }

  // Cannot have consecutive hyphens
  if (subdomain.includes('--')) {
    return { valid: false, error: 'Subdomain cannot contain consecutive hyphens' };
  }

  // Check reserved words
  if (RESERVED_SUBDOMAINS.includes(subdomain)) {
    return { valid: false, error: 'This subdomain is reserved and cannot be used' };
  }

  return { valid: true };
}

/**
 * Check if subdomain is available in the database
 */
export async function checkSubdomainAvailability(subdomain: string): Promise<{
  available: boolean;
  error?: string;
}> {
  try {
    const sql = neon(process.env.DATABASE_URL!);

    const result = await sql`
      SELECT id FROM businesses WHERE subdomain = ${subdomain} LIMIT 1
    `;

    return { available: result.length === 0 };
  } catch (error) {
    console.error('Error checking subdomain availability:', error);
    return { available: false, error: 'Failed to check subdomain availability' };
  }
}

/**
 * Full subdomain validation (format + availability)
 */
export async function validateSubdomain(subdomain: string): Promise<{
  valid: boolean;
  available?: boolean;
  error?: string;
}> {
  // First check format
  const formatCheck = validateSubdomainFormat(subdomain);
  if (!formatCheck.valid) {
    return { valid: false, error: formatCheck.error };
  }

  // Then check availability
  const availabilityCheck = await checkSubdomainAvailability(subdomain);
  if (!availabilityCheck.available) {
    return {
      valid: false,
      available: false,
      error: availabilityCheck.error || 'This subdomain is already taken'
    };
  }

  return { valid: true, available: true };
}

/**
 * Generate subdomain suggestions based on business name
 */
export function generateSubdomainSuggestions(businessName: string, count: number = 3): string[] {
  const base = businessName
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

  const suggestions: string[] = [base];

  // Add numbered variants
  for (let i = 1; i < count; i++) {
    suggestions.push(`${base}-${i}`);
  }

  // Add location-based variant if possible
  const words = businessName.toLowerCase().split(/\s+/);
  if (words.length >= 2) {
    const initials = words.map(w => w[0]).join('');
    if (initials.length >= 3) {
      suggestions.push(initials);
    }
  }

  return suggestions.filter(s => validateSubdomainFormat(s).valid).slice(0, count);
}
