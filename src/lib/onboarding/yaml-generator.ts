/**
 * Generate YAML configuration from form data
 */

import { stringify } from 'yaml';
import { TenantConfigSchema, type TenantConfig } from '@/lib/config/tenant-schema';

export interface OnboardingFormData {
  // Auth
  email: string;
  password?: string;
  ownerName: string;

  // Business
  businessName: string;
  businessId: string;
  description?: string;
  timezone: string;
  currency: string;

  // Contact
  phone?: string;
  street?: string;
  city?: string;
  state?: string;
  postalCode?: string;
  country: string;
  website?: string;
  instagram?: string;
  facebook?: string;
  latitude?: number | null;
  longitude?: number | null;

  // Branding
  primaryColor: string;
  secondaryColor?: string;
  profileImageUrl?: string;
  coverImageUrl?: string;

  // Services (will be empty initially for self-service)
  categories?: Array<{ id: string; name: string; description?: string; sortOrder: number; services: unknown[] }>;

  // Availability
  availability: Array<{
    day: string;
    slots: Array<{ open: string; close: string }>;
    enabled: boolean;
  }>;

  // Booking rules
  timeSlotDuration: number;
  maxSimultaneousBookings: number;
  advanceBookingDays: number;
  requireEmail: boolean;
  requirePhone: boolean;
  allowGuestBooking: boolean;

  // Additional details (optional)
  minAdvanceBookingMinutes?: number;
  maxBookingsPerCustomerPerDay?: number;
  cancellationDeadlineHours?: number;
  rescheduleDeadlineHours?: number;
  refundPolicy?: 'full' | 'partial' | 'none';
  partialRefundPercentage?: number;
  reminderHoursBefore?: number;
  parkingAvailable?: boolean;
  wheelchairAccessible?: boolean;
  acceptsWalkIns?: boolean;
}

/**
 * Generate tenant configuration object from form data
 */
export function generateTenantConfig(formData: OnboardingFormData): TenantConfig {
  try {
    console.log('Generating config - availability:', JSON.stringify(formData.availability, null, 2));

    const config: TenantConfig = {
      version: '1.0.0',

      business: {
        id: formData.businessId,
        name: formData.businessName,
        description: formData.description,
        timezone: formData.timezone,
        locale: formData.country === 'IT' ? 'it-IT' :
                formData.country === 'FR' ? 'fr-FR' :
                formData.country === 'DE' ? 'de-DE' :
                formData.country === 'ES' ? 'es-ES' :
                formData.country === 'GB' ? 'en-GB' :
                'en-US',
        currency: formData.currency,
      },

      contact: {
        address: {
          street: formData.street || 'Not provided',
          city: formData.city || 'Not provided',
          state: formData.state || 'Not provided',
          postalCode: formData.postalCode || '00000',
          country: formData.country,
        },
        email: formData.email,
        phone: formData.phone || '+10000000000',
        website: formData.website && !formData.website.startsWith('http')
          ? `https://${formData.website}`
          : formData.website,
        instagram: formData.instagram && !formData.instagram.startsWith('http')
          ? `https://${formData.instagram}`
          : formData.instagram,
        facebook: formData.facebook && !formData.facebook.startsWith('http')
          ? `https://${formData.facebook}`
          : formData.facebook,
        ...(formData.latitude && formData.longitude ? {
          latitude: formData.latitude,
          longitude: formData.longitude,
        } : {}),
      },

      branding: {
        primaryColor: formData.primaryColor,
        secondaryColor: formData.secondaryColor || formData.primaryColor,
        logoUrl: formData.profileImageUrl || 'https://placehold.co/200x200',
        coverImageUrl: formData.coverImageUrl || 'https://placehold.co/1200x400',
        profileImageUrl: formData.profileImageUrl || 'https://placehold.co/400x400',
        faviconUrl: 'https://placehold.co/32x32',
      },

      timeSlotDuration: formData.timeSlotDuration,

      availability: Array.isArray(formData.availability)
        ? formData.availability.map((day) => {
            const mapped = {
              day: day.day as 'sunday' | 'monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday' | 'saturday',
              enabled: day.enabled,
              slots: day.slots || [],
            };
            console.log(`Mapping day ${day.day}:`, JSON.stringify(mapped, null, 2));
            return mapped;
          })
        : [],

      availabilityExceptions: [],

      // Start with a default service if none provided
      categories: formData.categories && formData.categories.length > 0
        ? formData.categories
        : [
            {
              id: 'general',
              name: 'General Services',
              description: 'Add your services in the dashboard',
              sortOrder: 0,
              services: [
                {
                  id: 'consultation',
                  name: 'Consultation',
                  description: 'General consultation service',
                  duration: formData.timeSlotDuration,
                  price: 0,
                  color: formData.primaryColor,
                  sortOrder: 0,
                  enabled: true,
                  requiresDeposit: false,
                  bufferBefore: 0,
                  bufferAfter: 0,
                },
              ],
            },
          ],

      bookingRequirements: {
        requireEmail: formData.requireEmail,
        requirePhone: formData.requirePhone,
        requireName: true,
        allowGuestBooking: formData.allowGuestBooking,
        requireEmailVerification: false,
        requirePhoneVerification: false,
        customFields: [],
      },

      bookingLimits: {
        maxSimultaneousBookings: formData.maxSimultaneousBookings,
        advanceBookingDays: formData.advanceBookingDays,
        minAdvanceBookingMinutes: formData.minAdvanceBookingMinutes ?? 60,
        maxBookingsPerCustomerPerDay: formData.maxBookingsPerCustomerPerDay ?? 3,
      },

      cancellationPolicy: {
        allowCancellation: true,
        cancellationDeadlineHours: formData.cancellationDeadlineHours ?? 24,
        allowRescheduling: true,
        rescheduleDeadlineHours: formData.rescheduleDeadlineHours ?? 12,
        refundPolicy: formData.refundPolicy ?? 'full',
        ...(formData.refundPolicy === 'partial' && formData.partialRefundPercentage
          ? { partialRefundPercentage: formData.partialRefundPercentage }
          : {}),
      },

      notifications: {
        sendConfirmationEmail: true,
        sendReminderEmail: true,
        reminderHoursBefore: formData.reminderHoursBefore ?? 24,
        sendConfirmationSMS: false,
        sendReminderSMS: false,
        ownerNotificationEmail: formData.email,
        notifyOwnerOnNewBooking: true,
        notifyOwnerOnCancellation: true,
      },

      features: {
        enableOnlinePayments: false,
        enableWaitlist: false,
        enableReviews: false,
        enableMultipleStaff: false,
        hideFromDiscovery: true, // Hide new businesses from discovery by default
      },

      metadata: {
        createdVia: 'self-service-onboarding',
        createdAt: new Date().toISOString(),
        parkingAvailable: formData.parkingAvailable ?? false,
        wheelchairAccessible: formData.wheelchairAccessible ?? false,
        acceptsWalkIns: formData.acceptsWalkIns ?? false,
      },
    };

    console.log('Config generated successfully');
    return config;
  } catch (error) {
    console.error('Error in generateTenantConfig:', error);
    throw error;
  }
}

/**
 * Generate YAML string from form data
 */
export function generateYAML(formData: OnboardingFormData): {
  success: boolean;
  yaml?: string;
  config?: TenantConfig;
  errors?: string[];
} {
  try {
    const config = generateTenantConfig(formData);

    console.log('Validating config against schema...');
    // Validate against schema
    const validation = TenantConfigSchema.safeParse(config);

    if (!validation.success) {
      console.error('Schema validation failed:', validation.error);
      const errors = validation.error?.issues
        ? validation.error.issues.map((e) => `${e.path.join('.')}: ${e.message}`)
        : ['Validation failed with unknown errors'];
      return {
        success: false,
        errors,
      };
    }

    console.log('Schema validation passed');
    // Generate YAML string
    const yaml = stringify(config, {
      indent: 2,
      lineWidth: 0, // Don't wrap lines
      sortMapEntries: false,
    });

    return {
      success: true,
      yaml,
      config: validation.data,
    };
  } catch (error) {
    console.error('Error in generateYAML:', error);
    return {
      success: false,
      errors: [error instanceof Error ? error.message : 'Unknown error'],
    };
  }
}

/**
 * Validate form data before submission
 */
export function validateOnboardingForm(formData: Partial<OnboardingFormData>): {
  valid: boolean;
  errors: Record<string, string>;
} {
  const errors: Record<string, string> = {};

  // Required fields
  if (!formData.email) errors.email = 'Email is required';
  if (!formData.ownerName) errors.ownerName = 'Owner name is required';
  if (!formData.businessName) errors.businessName = 'Business name is required';
  if (!formData.businessId) errors.businessId = 'Subdomain is required';
  if (!formData.timezone) errors.timezone = 'Timezone is required';
  if (!formData.country) errors.country = 'Country is required';

  // Email format
  if (formData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
    errors.email = 'Invalid email format';
  }

  // Business ID format
  if (formData.businessId && !/^[a-z0-9-]+$/.test(formData.businessId)) {
    errors.businessId = 'Subdomain can only contain lowercase letters, numbers, and hyphens';
  }

  // Validate availability
  if (!formData.availability || formData.availability.length !== 7) {
    errors.availability = 'Must provide availability for all 7 days';
  }

  // Validate at least one day is enabled
  if (formData.availability && formData.availability.every(d => !d.enabled)) {
    errors.availability = 'At least one day must be enabled';
  }

  return {
    valid: Object.keys(errors).length === 0,
    errors,
  };
}
