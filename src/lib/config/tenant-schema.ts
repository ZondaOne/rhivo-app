/**
 * Rhivo Tenant Configuration Schema
 *
 * This file defines the canonical schema for per-tenant YAML configuration.
 * Every tenant configuration MUST validate against this schema before being enabled.
 *
 * Schema Version: 1.0.0
 */

import { z } from 'zod';

// Time format validator (24-hour HH:MM)
const timeFormatRegex = /^([01]\d|2[0-3]):([0-5]\d)$/;
const TimeString = z.string().regex(timeFormatRegex, {
  message: 'Time must be in 24-hour format HH:MM (e.g., 09:00, 14:30)'
});

// Timezone validator (IANA timezone database)
const TimezoneString = z.string().refine(
  (tz) => {
    try {
      Intl.DateTimeFormat(undefined, { timeZone: tz });
      return true;
    } catch {
      return false;
    }
  },
  { message: 'Invalid timezone. Must be a valid IANA timezone (e.g., America/New_York)' }
);

// Color hex code validator
const ColorHex = z.string().regex(/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/, {
  message: 'Color must be a valid hex code (e.g., #FF5733 or #F57)'
});

// URL validator
const UrlString = z.string().url({ message: 'Must be a valid URL' });

// Optional URL validator (allows empty string or undefined)
const OptionalUrlString = z.string().optional().transform((val) => {
  if (!val || val.trim() === '') return undefined;
  return val;
}).pipe(z.string().url({ message: 'Must be a valid URL' }).optional());

// Email validator
const EmailString = z.string().email({ message: 'Must be a valid email address' });

// Phone validator (international format)
const PhoneString = z.string().regex(/^\+?[1-9]\d{1,14}$/, {
  message: 'Phone must be in international format (e.g., +1234567890)'
});

/**
 * Business Contact Information Schema
 */
const ContactSchema = z.object({
  address: z.object({
    street: z.string().min(1, 'Street address is required'),
    city: z.string().min(1, 'City is required'),
    state: z.string().min(2, 'State/Province is required').max(100),
    postalCode: z.string().min(1, 'Postal code is required'),
    country: z.string().min(2, 'Country is required').max(2, 'Use ISO 3166-1 alpha-2 country code'),
  }),
  email: EmailString,
  phone: PhoneString,
  website: OptionalUrlString,
  // Geolocation coordinates for map display
  latitude: z.number()
    .min(-90, 'Latitude must be between -90 and 90')
    .max(90, 'Latitude must be between -90 and 90')
    .optional(),
  longitude: z.number()
    .min(-180, 'Longitude must be between -180 and 180')
    .max(180, 'Longitude must be between -180 and 180')
    .optional(),
});

/**
 * Branding Configuration Schema
 */
const BrandingSchema = z.object({
  primaryColor: ColorHex,
  secondaryColor: ColorHex.optional(),
  logoUrl: UrlString,
  coverImageUrl: OptionalUrlString,
  profileImageUrl: OptionalUrlString, // Profile picture/avatar for business cards
  faviconUrl: OptionalUrlString,
});

/**
 * Day of Week enum
 */
const DayOfWeek = z.enum([
  'monday',
  'tuesday',
  'wednesday',
  'thursday',
  'friday',
  'saturday',
  'sunday'
]);

/**
 * Time Slot Schema (for breaks and split shifts)
 */
const TimeSlotSchema = z.object({
  open: TimeString,
  close: TimeString,
}).refine(
  (data) => {
    const [openHour, openMin] = data.open.split(':').map(Number);
    const [closeHour, closeMin] = data.close.split(':').map(Number);
    const openMinutes = openHour * 60 + openMin;
    const closeMinutes = closeHour * 60 + closeMin;
    return closeMinutes > openMinutes;
  },
  { message: 'Close time must be after open time' }
);

/**
 * Daily Availability Schema
 *
 * Supports two formats:
 * 1. Legacy format: single open/close times (auto-converted to slots array)
 * 2. New format: slots array for breaks and split shifts
 *
 * Examples:
 * - Single shift: { day: 'monday', open: '09:00', close: '17:00', enabled: true }
 * - Lunch break: { day: 'monday', slots: [{open: '09:00', close: '13:00'}, {open: '14:00', close: '18:00'}], enabled: true }
 * - Split shift: { day: 'friday', slots: [{open: '06:00', close: '10:00'}, {open: '18:00', close: '22:00'}], enabled: true }
 */
const DailyAvailabilitySchema = z.object({
  day: DayOfWeek,
  // Legacy format: single open/close (optional if slots provided)
  open: TimeString.optional(),
  close: TimeString.optional(),
  // New format: multiple time slots per day
  slots: z.array(TimeSlotSchema).optional(),
  enabled: z.boolean().default(true),
}).transform((data) => {
  console.log(`[Schema Transform] Processing day ${data.day}:`, JSON.stringify(data, null, 2));
  
  // Backward compatibility: convert single open/close to slots array
  if (data.open && data.close && !data.slots) {
    console.info(`[YAML Config] Converting single open/close times for ${data.day} to slots array format`);
    return {
      day: data.day,
      enabled: data.enabled,
      slots: [{ open: data.open, close: data.close }],
    };
  }

  // If slots are provided (including empty array), use them
  if (data.slots !== undefined) {
    return {
      day: data.day,
      enabled: data.enabled,
      slots: data.slots,
    };
  }

  // If neither format is provided and enabled=false, default to empty slots
  if (!data.enabled) {
    return {
      day: data.day,
      enabled: data.enabled,
      slots: [],
    };
  }

  // Invalid: enabled but no times provided
  throw new Error(`Day ${data.day} is enabled but has no open/close times or slots defined`);
}).refine(
  (data) => {
    if (!data.enabled) return true;
    if (!data.slots || data.slots.length === 0) return true;

    // Validate slots are non-overlapping and in chronological order
    for (let i = 0; i < data.slots.length - 1; i++) {
      const current = data.slots[i];
      const next = data.slots[i + 1];

      const [currentCloseHour, currentCloseMin] = current.close.split(':').map(Number);
      const [nextOpenHour, nextOpenMin] = next.open.split(':').map(Number);

      const currentCloseMinutes = currentCloseHour * 60 + currentCloseMin;
      const nextOpenMinutes = nextOpenHour * 60 + nextOpenMin;

      if (nextOpenMinutes <= currentCloseMinutes) {
        return false;
      }
    }

    // Validate total daily hours are reasonable (not exceeding 24 hours)
    const totalMinutes = data.slots.reduce((sum, slot) => {
      const [openHour, openMin] = slot.open.split(':').map(Number);
      const [closeHour, closeMin] = slot.close.split(':').map(Number);
      const openMinutes = openHour * 60 + openMin;
      const closeMinutes = closeHour * 60 + closeMin;
      return sum + (closeMinutes - openMinutes);
    }, 0);

    if (totalMinutes > 24 * 60) {
      return false;
    }

    return true;
  },
  { message: 'Slots must be non-overlapping, in chronological order, and total hours must not exceed 24 hours per day' }
);

/**
 * Availability Exception Schema (for holidays, special closures)
 */
const AvailabilityExceptionSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be in YYYY-MM-DD format'),
  reason: z.string().min(1, 'Reason for exception is required'),
  open: TimeString.optional(),
  close: TimeString.optional(),
  closed: z.boolean().default(false),
}).refine(
  (data) => {
    if (data.closed) return true;
    if (!data.open || !data.close) {
      return false;
    }
    const [openHour, openMin] = data.open.split(':').map(Number);
    const [closeHour, closeMin] = data.close.split(':').map(Number);
    const openMinutes = openHour * 60 + openMin;
    const closeMinutes = closeHour * 60 + closeMin;
    return closeMinutes > openMinutes;
  },
  { message: 'If not closed, must provide valid open and close times where close > open' }
);

/**
 * Service Schema
 */
const ServiceSchema = z.object({
  id: z.string().min(1, 'Service ID is required').regex(/^[a-z0-9-_]+$/, {
    message: 'Service ID must contain only lowercase letters, numbers, hyphens, and underscores'
  }),
  name: z.string().min(1, 'Service name is required').max(100),
  description: z.string().max(500).optional(),
  duration: z.number()
    .int('Duration must be an integer')
    .min(5, 'Duration must be at least 5 minutes')
    .max(480, 'Duration cannot exceed 8 hours (480 minutes)')
    .transform((val) => {
      // Auto-round to nearest 5-minute block
      const rounded = Math.round(val / 5) * 5;
      if (rounded !== val) {
        console.info(`[YAML Config] Service duration ${val}min auto-rounded to ${rounded}min (5min grain)`);
      }
      return Math.max(5, rounded); // Ensure minimum 5min
    }),
  price: z.number()
    .int('Price must be an integer (cents)')
    .min(0, 'Price cannot be negative'),
  color: ColorHex.optional(),
  sortOrder: z.number().int().min(0).default(0),
  enabled: z.boolean().default(true),
  requiresDeposit: z.boolean().default(false),
  depositAmount: z.number().int().min(0).optional(),
  maxAdvanceBookingDays: z.number().int().min(0).optional(), // Override global setting
  // Per-service capacity override (falls back to business-level bookingLimits.maxSimultaneousBookings)
  maxSimultaneousBookings: z.number()
    .int('Max simultaneous bookings must be an integer')
    .min(1, 'Must allow at least 1 booking per slot')
    .max(100, 'Cannot exceed 100 simultaneous bookings')
    .optional(),
  bufferBefore: z.number().int().min(0).default(0)
    .transform((val) => {
      // Auto-round to nearest 5-minute block
      const rounded = Math.round(val / 5) * 5;
      if (rounded !== val && val > 0) {
        console.info(`[YAML Config] Buffer before ${val}min auto-rounded to ${rounded}min (5min grain)`);
      }
      return rounded;
    }), // Minutes of buffer before appointment
  bufferAfter: z.number().int().min(0).default(0)
    .transform((val) => {
      // Auto-round to nearest 5-minute block
      const rounded = Math.round(val / 5) * 5;
      if (rounded !== val && val > 0) {
        console.info(`[YAML Config] Buffer after ${val}min auto-rounded to ${rounded}min (5min grain)`);
      }
      return rounded;
    }), // Minutes of buffer after appointment
}).refine(
  (data) => {
    if (data.requiresDeposit && !data.depositAmount) {
      return false;
    }
    if (data.depositAmount && data.depositAmount > data.price) {
      return false;
    }
    return true;
  },
  { message: 'If deposit is required, depositAmount must be specified and not exceed price' }
);

/**
 * Service Category Schema
 */
const CategorySchema = z.object({
  id: z.string().min(1, 'Category ID is required').regex(/^[a-z0-9-_]+$/, {
    message: 'Category ID must contain only lowercase letters, numbers, hyphens, and underscores'
  }),
  name: z.string().min(1, 'Category name is required').max(100),
  description: z.string().max(500).optional(),
  sortOrder: z.number().int().min(0).default(0),
  services: z.array(ServiceSchema).min(1, 'Category must have at least one service'),
});

/**
 * Booking Requirements Schema
 */
const BookingRequirementsSchema = z.object({
  requireEmail: z.boolean().default(true),
  requirePhone: z.boolean().default(false),
  requireName: z.boolean().default(true),
  allowGuestBooking: z.boolean().default(true),
  requireEmailVerification: z.boolean().default(false),
  requirePhoneVerification: z.boolean().default(false),
  customFields: z.array(z.object({
    id: z.string().min(1),
    label: z.string().min(1),
    type: z.enum(['text', 'textarea', 'select', 'checkbox', 'radio']),
    required: z.boolean().default(false),
    options: z.array(z.string()).optional(), // For select/radio types
    placeholder: z.string().optional(),
    maxLength: z.number().int().min(1).max(1000).optional(),
  })).default([]),
});

/**
 * Booking Limits Schema
 */
const BookingLimitsSchema = z.object({
  maxSimultaneousBookings: z.number()
    .int('Max simultaneous bookings must be an integer')
    .min(1, 'Must allow at least 1 booking per slot')
    .max(100, 'Cannot exceed 100 simultaneous bookings'),
  advanceBookingDays: z.number()
    .int('Advance booking days must be an integer')
    .min(0, 'Cannot be negative')
    .max(365, 'Cannot exceed 365 days'),
  minAdvanceBookingMinutes: z.number()
    .int('Minimum advance booking must be an integer')
    .min(0, 'Cannot be negative')
    .default(0),
  maxBookingsPerCustomerPerDay: z.number()
    .int()
    .min(1)
    .max(20)
    .optional(),
  maxBookingsPerCustomerPending: z.number()
    .int()
    .min(1)
    .max(50)
    .optional(),
});

/**
 * Cancellation Policy Schema
 */
const CancellationPolicySchema = z.object({
  allowCancellation: z.boolean().default(true),
  cancellationDeadlineHours: z.number()
    .int('Cancellation deadline must be an integer')
    .min(0, 'Cannot be negative')
    .max(168, 'Cannot exceed 7 days (168 hours)')
    .default(24),
  allowRescheduling: z.boolean().default(true),
  rescheduleDeadlineHours: z.number()
    .int('Reschedule deadline must be an integer')
    .min(0, 'Cannot be negative')
    .max(168, 'Cannot exceed 7 days (168 hours)')
    .default(24),
  refundPolicy: z.enum(['full', 'partial', 'none']).default('full'),
  partialRefundPercentage: z.number().min(0).max(100).optional(),
}).refine(
  (data) => {
    if (data.refundPolicy === 'partial' && !data.partialRefundPercentage) {
      return false;
    }
    return true;
  },
  { message: 'Partial refund policy requires partialRefundPercentage to be set' }
);

/**
 * Business Information Schema
 */
const BusinessSchema = z.object({
  id: z.string().min(1, 'Business ID is required').regex(/^[a-z0-9-_]+$/, {
    message: 'Business ID must contain only lowercase letters, numbers, hyphens, and underscores'
  }),
  name: z.string().min(1, 'Business name is required').max(100),
  description: z.string().max(1000).optional(),
  timezone: TimezoneString,
  locale: z.string().regex(/^[a-z]{2}-[A-Z]{2}$/, {
    message: 'Locale must be in format xx-XX (e.g., en-US, es-ES)'
  }).default('en-US'),
  currency: z.string().length(3, 'Currency must be a 3-letter ISO code').default('USD'),
});

/**
 * Notification Preferences Schema
 */
const NotificationPreferencesSchema = z.object({
  sendConfirmationEmail: z.boolean().default(true),
  sendReminderEmail: z.boolean().default(true),
  reminderHoursBefore: z.number().int().min(1).max(168).default(24),
  sendConfirmationSMS: z.boolean().default(false),
  sendReminderSMS: z.boolean().default(false),
  ownerNotificationEmail: EmailString,
  notifyOwnerOnNewBooking: z.boolean().default(true),
  notifyOwnerOnCancellation: z.boolean().default(true),
});

/**
 * Main Tenant Configuration Schema
 */
export const TenantConfigSchema = z.object({
  version: z.string().regex(/^\d+\.\d+\.\d+$/, 'Version must be in semver format (e.g., 1.0.0)'),
  business: BusinessSchema,
  contact: ContactSchema,
  branding: BrandingSchema,

  // Time slot configuration
  // NOTE: timeSlotDuration is the DISPLAY interval (e.g., 30min slots shown in UI)
  // Internally, we use 5-minute grain blocks for precise scheduling
  timeSlotDuration: z.number()
    .int('Time slot duration must be an integer')
    .min(5, 'Time slot duration must be at least 5 minutes')
    .max(480, 'Time slot duration cannot exceed 8 hours (480 minutes)')
    .transform((val) => {
      // Auto-round to nearest 5-minute block
      const rounded = Math.round(val / 5) * 5;
      if (rounded !== val) {
        console.info(`[YAML Config] Time slot duration ${val}min auto-rounded to ${rounded}min (5min grain)`);
      }
      return Math.max(5, rounded); // Ensure minimum 5min
    }),

  // Availability
  availability: z.array(DailyAvailabilitySchema)
    .length(7, 'Must provide availability for all 7 days of the week'),
  availabilityExceptions: z.array(AvailabilityExceptionSchema).default([]),

  // Services and categories
  categories: z.array(CategorySchema).min(1, 'Must have at least one category'),

  // Booking configuration
  bookingRequirements: BookingRequirementsSchema,
  bookingLimits: BookingLimitsSchema,
  cancellationPolicy: CancellationPolicySchema,

  // Notifications
  notifications: NotificationPreferencesSchema,

  // Feature flags
  features: z.object({
    enableOnlinePayments: z.boolean().default(false),
    enableWaitlist: z.boolean().default(false),
    enableReviews: z.boolean().default(false),
    enableMultipleStaff: z.boolean().default(false),
  }).default({}),

  // Metadata
  metadata: z.record(z.string(), z.any()).optional(),
}).strict(); // Strict mode: no additional properties allowed

// Type inference
export type TenantConfig = z.infer<typeof TenantConfigSchema>;
export type Service = z.infer<typeof ServiceSchema>;
export type Category = z.infer<typeof CategorySchema>;
export type TimeSlot = z.infer<typeof TimeSlotSchema>;
export type DailyAvailability = z.infer<typeof DailyAvailabilitySchema>;
export type AvailabilityException = z.infer<typeof AvailabilityExceptionSchema>;
export type BookingRequirements = z.infer<typeof BookingRequirementsSchema>;
export type BookingLimits = z.infer<typeof BookingLimitsSchema>;
export type CancellationPolicy = z.infer<typeof CancellationPolicySchema>;
export type NotificationPreferences = z.infer<typeof NotificationPreferencesSchema>;

/**
 * Additional validation rules that can't be expressed in Zod alone
 */
export function validateTenantConfig(config: TenantConfig): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  // Validate service IDs are unique across all categories
  const serviceIds = new Set<string>();
  for (const category of config.categories) {
    for (const service of category.services) {
      if (serviceIds.has(service.id)) {
        errors.push(`Duplicate service ID: ${service.id}`);
      }
      serviceIds.add(service.id);
    }
  }

  // Validate category IDs are unique
  const categoryIds = new Set<string>();
  for (const category of config.categories) {
    if (categoryIds.has(category.id)) {
      errors.push(`Duplicate category ID: ${category.id}`);
    }
    categoryIds.add(category.id);
  }

  // Validate service duration uses 5-minute grain blocks (warnings only)
  // This allows flexible durations (15, 45, 75, 90, 105 min) with any timeSlotDuration
  for (const category of config.categories) {
    for (const service of category.services) {
      // Check 5-minute grain alignment (enforced by Zod schema, but double-check)
      if (service.duration % 5 !== 0) {
        errors.push(
          `Service "${service.name}" duration (${service.duration}min) must be a multiple of 5 minutes (grain block system)`
        );
      }

      // Warning: Service shorter than display slot (still valid, just might look odd in UI)
      if (service.duration < config.timeSlotDuration) {
        console.warn(
          `[YAML Config Warning] Service "${service.name}" duration (${service.duration}min) is shorter than timeSlotDuration (${config.timeSlotDuration}min). This is valid but may affect UI display.`
        );
      }

      // Info: Service not aligned to display slots (valid with 5min grain system)
      if (service.duration % config.timeSlotDuration !== 0) {
        console.info(
          `[YAML Config Info] Service "${service.name}" duration (${service.duration}min) spans multiple time slots (${config.timeSlotDuration}min). Using 5-minute grain blocks for precise allocation.`
        );
      }
    }
  }

  // Validate availability exceptions are in the future or present
  const today = new Date().toISOString().split('T')[0];
  for (const exception of config.availabilityExceptions) {
    if (exception.date < today) {
      errors.push(`Availability exception for ${exception.date} is in the past`);
    }
  }

  // Validate days of week in availability cover all 7 days
  const days = config.availability.map(a => a.day);
  const expectedDays = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
  for (const day of expectedDays) {
    if (!days.includes(day as any)) {
      errors.push(`Missing availability for ${day}`);
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}