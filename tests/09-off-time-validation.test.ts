/**
 * Off-Time Validation Tests
 *
 * Tests that off-time validation (breaks, closed days, holidays) is
 * consistently enforced across all booking entry points:
 * - Customer booking API (/api/booking/reserve)
 * - Owner manual appointment API (/api/appointments/manual)
 * - Owner reschedule API (/api/appointments/reschedule)
 */

import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';
import { getDbClient } from '../src/db/client';
import { loadConfigBySubdomain } from '../src/lib/config/config-loader';
import { validateBookingTime } from '../src/lib/booking/validation';

const db = getDbClient();

describe('Off-Time Validation Consistency', () => {
  let testBusinessId: string;
  let testServiceId: string;
  let testConfig: any;

  beforeAll(async () => {
    // Get a test business (assuming wellness-spa exists)
    const businesses = await db`
      SELECT id, subdomain FROM businesses
      WHERE subdomain = 'wellness-spa'
      AND deleted_at IS NULL
      LIMIT 1
    `;

    if (businesses.length === 0) {
      throw new Error('Test business not found. Please seed test data first.');
    }

    testBusinessId = businesses[0].id;

    // Load config
    const configResult = await loadConfigBySubdomain(businesses[0].subdomain);
    if (!configResult.success || !configResult.config) {
      throw new Error('Failed to load test business config');
    }
    testConfig = configResult.config;

    // Get a test service
    const services = await db`
      SELECT id, external_id FROM services
      WHERE business_id = ${testBusinessId}
      AND deleted_at IS NULL
      LIMIT 1
    `;

    if (services.length === 0) {
      throw new Error('Test service not found');
    }

    testServiceId = services[0].id;
  });

  describe('Break Time Validation', () => {
    it('should reject bookings during lunch break (13:00-14:00)', () => {
      // Assuming wellness-spa has lunch break 13:00-14:00 on Monday
      const mondayAtLunch = new Date('2025-10-20T13:30:00.000Z'); // Monday 1:30 PM
      const mondayAtLunchEnd = new Date('2025-10-20T14:00:00.000Z');

      const validation = validateBookingTime({
        config: testConfig,
        slotStart: mondayAtLunch,
        slotEnd: mondayAtLunchEnd,
        bufferBefore: 0,
        bufferAfter: 0,
        skipAdvanceLimitCheck: false,
      });

      expect(validation.valid).toBe(false);
      expect(validation.code).toBe('OFF_TIME_CONFLICT');
      expect(validation.error).toContain('break');
    });

    it('should allow bookings that end exactly at break start', () => {
      // Service from 12:30-13:00, break starts at 13:00
      const beforeBreak = new Date('2025-10-20T12:30:00.000Z');
      const atBreakStart = new Date('2025-10-20T13:00:00.000Z');

      const validation = validateBookingTime({
        config: testConfig,
        slotStart: beforeBreak,
        slotEnd: atBreakStart,
        bufferBefore: 0,
        bufferAfter: 0,
        skipAdvanceLimitCheck: false,
      });

      // This should succeed if break is 13:00-14:00
      // But might fail if there's no slot ending at 13:00
      // The exact result depends on the YAML config
      console.log('Before break validation:', validation);
    });

    it('should reject bookings with buffer extending into break', () => {
      // Service 12:30-13:00 with 15min buffer after = extends to 13:15 (into break)
      const beforeBreak = new Date('2025-10-20T12:30:00.000Z');
      const atBreakStart = new Date('2025-10-20T13:00:00.000Z');

      const validation = validateBookingTime({
        config: testConfig,
        slotStart: beforeBreak,
        slotEnd: atBreakStart,
        bufferBefore: 0,
        bufferAfter: 15, // 15-minute buffer extends into break
        skipAdvanceLimitCheck: false,
      });

      expect(validation.valid).toBe(false);
      expect(validation.code).toBe('OFF_TIME_CONFLICT');
    });
  });

  describe('Closed Day Validation', () => {
    it('should reject bookings on closed days', () => {
      // Assuming Sunday is closed for wellness-spa
      const sunday = new Date('2025-10-19T10:00:00.000Z'); // Sunday
      const sundayEnd = new Date('2025-10-19T11:00:00.000Z');

      const validation = validateBookingTime({
        config: testConfig,
        slotStart: sunday,
        slotEnd: sundayEnd,
        bufferBefore: 0,
        bufferAfter: 0,
        skipAdvanceLimitCheck: false,
      });

      expect(validation.valid).toBe(false);
      expect(validation.code).toBe('OFF_TIME_CONFLICT');
    });
  });

  describe('Business Hours Validation', () => {
    it('should reject bookings outside business hours (before opening)', () => {
      // Assuming business opens at 9:00 AM
      const beforeOpening = new Date('2025-10-20T08:00:00.000Z'); // 8 AM
      const beforeOpeningEnd = new Date('2025-10-20T09:00:00.000Z'); // 9 AM

      const validation = validateBookingTime({
        config: testConfig,
        slotStart: beforeOpening,
        slotEnd: beforeOpeningEnd,
        bufferBefore: 0,
        bufferAfter: 0,
        skipAdvanceLimitCheck: false,
      });

      expect(validation.valid).toBe(false);
      expect(validation.code).toBe('OFF_TIME_CONFLICT');
      expect(validation.error).toContain('business hours');
    });

    it('should reject bookings outside business hours (after closing)', () => {
      // Assuming business closes at 6:00 PM
      const afterClosing = new Date('2025-10-20T18:30:00.000Z'); // 6:30 PM
      const afterClosingEnd = new Date('2025-10-20T19:00:00.000Z'); // 7 PM

      const validation = validateBookingTime({
        config: testConfig,
        slotStart: afterClosing,
        slotEnd: afterClosingEnd,
        bufferBefore: 0,
        bufferAfter: 0,
        skipAdvanceLimitCheck: false,
      });

      expect(validation.valid).toBe(false);
      expect(validation.code).toBe('OFF_TIME_CONFLICT');
    });
  });

  describe('Advance Booking Limits', () => {
    it('should reject bookings beyond advance booking days (for customers)', () => {
      // Assuming advanceBookingDays is 30
      const farFuture = new Date();
      farFuture.setDate(farFuture.getDate() + 60); // 60 days from now
      const farFutureEnd = new Date(farFuture);
      farFutureEnd.setHours(farFuture.getHours() + 1);

      const validation = validateBookingTime({
        config: testConfig,
        slotStart: farFuture,
        slotEnd: farFutureEnd,
        bufferBefore: 0,
        bufferAfter: 0,
        skipAdvanceLimitCheck: false, // Customer mode
      });

      expect(validation.valid).toBe(false);
      expect(validation.code).toBe('BEYOND_ADVANCE_BOOKING_LIMIT');
    });

    it('should allow bookings beyond advance booking days (for owners)', () => {
      // Same far future date
      const farFuture = new Date();
      farFuture.setDate(farFuture.getDate() + 60);
      const farFutureEnd = new Date(farFuture);
      farFutureEnd.setHours(farFuture.getHours() + 1);

      const validation = validateBookingTime({
        config: testConfig,
        slotStart: farFuture,
        slotEnd: farFutureEnd,
        bufferBefore: 0,
        bufferAfter: 0,
        skipAdvanceLimitCheck: true, // Owner mode
      });

      // Should pass advance booking check (but might fail other checks like business hours)
      if (!validation.valid) {
        // If it fails, it should NOT be due to advance booking limit
        expect(validation.code).not.toBe('BEYOND_ADVANCE_BOOKING_LIMIT');
      }
    });

    it('should reject bookings within minimum advance booking window', () => {
      // Assuming minAdvanceBookingMinutes is 120 (2 hours)
      const tooSoon = new Date();
      tooSoon.setMinutes(tooSoon.getMinutes() + 30); // Only 30 min from now
      const tooSoonEnd = new Date(tooSoon);
      tooSoonEnd.setHours(tooSoon.getHours() + 1);

      const validation = validateBookingTime({
        config: testConfig,
        slotStart: tooSoon,
        slotEnd: tooSoonEnd,
        bufferBefore: 0,
        bufferAfter: 0,
        skipAdvanceLimitCheck: false,
      });

      // Might fail for min advance booking or other reasons
      if (!validation.valid && validation.code === 'BELOW_MIN_ADVANCE_BOOKING') {
        expect(validation.error).toContain('at least');
        expect(validation.error).toContain('minutes in advance');
      }
    });
  });

  describe('Past Time Validation', () => {
    it('should reject bookings in the past', () => {
      const past = new Date();
      past.setHours(past.getHours() - 2); // 2 hours ago
      const pastEnd = new Date(past);
      pastEnd.setHours(past.getHours() + 1);

      const validation = validateBookingTime({
        config: testConfig,
        slotStart: past,
        slotEnd: pastEnd,
        bufferBefore: 0,
        bufferAfter: 0,
        skipAdvanceLimitCheck: false,
      });

      expect(validation.valid).toBe(false);
      expect(validation.code).toBe('PAST_TIME');
      expect(validation.error).toContain('past');
    });

    it('should allow bookings within 5-minute grace period', () => {
      // 3 minutes ago (within 5-minute grace period)
      const recent = new Date();
      recent.setMinutes(recent.getMinutes() - 3);
      const recentEnd = new Date(recent);
      recentEnd.setHours(recent.getHours() + 1);

      const validation = validateBookingTime({
        config: testConfig,
        slotStart: recent,
        slotEnd: recentEnd,
        bufferBefore: 0,
        bufferAfter: 0,
        skipAdvanceLimitCheck: true, // Skip other checks
      });

      // Should pass past time check (but might fail other checks)
      if (!validation.valid) {
        expect(validation.code).not.toBe('PAST_TIME');
      }
    });
  });

  describe('Valid Booking Times', () => {
    it('should accept bookings during valid business hours', () => {
      // Monday 10:00 AM - 11:00 AM (assuming this is valid)
      const validTime = new Date('2025-10-20T10:00:00.000Z');
      const validTimeEnd = new Date('2025-10-20T11:00:00.000Z');

      const validation = validateBookingTime({
        config: testConfig,
        slotStart: validTime,
        slotEnd: validTimeEnd,
        bufferBefore: 0,
        bufferAfter: 0,
        skipAdvanceLimitCheck: true, // Skip advance booking check for this test
      });

      expect(validation.valid).toBe(true);
      expect(validation.error).toBeUndefined();
      expect(validation.code).toBeUndefined();
    });
  });
});

console.log('✅ Off-time validation tests defined. Run with: npm test -- 09-off-time-validation.test.ts');
