"use client";

import { useEffect, useState } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import { useTranslations, useLocale } from 'next-intl';
import { TenantConfig, Category, Service } from '@/lib/config/tenant-schema';
import { v4 as uuidv4 } from 'uuid';
import { applyBrandColors, removeBrandColors } from '@/lib/theme/brand-colors';
import './brand-theme.css';

interface TimeSlot {
  start: string;
  end: string;
  available: boolean;
  capacity: number;
  totalCapacity: number;
  capacityPercentage: number;
  reason?: string;
}

type BookingStep = 'service' | 'datetime' | 'details' | 'confirmation';

export default function BookingPage() {
  const t = useTranslations('booking');
  const tc = useTranslations('booking.common');
  const td = useTranslations('days');
  const locale = useLocale();
  const params = useParams();
  const searchParams = useSearchParams();
  const subdomain = params?.subdomain as string || searchParams?.get('business');

  const [config, setConfig] = useState<TenantConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null);
  const [selectedService, setSelectedService] = useState<Service | null>(null);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedSlot, setSelectedSlot] = useState<TimeSlot | null>(null);
  const [availableSlots, setAvailableSlots] = useState<TimeSlot[]>([]);
  const [loadingSlots, setLoadingSlots] = useState(false);

  const [currentStep, setCurrentStep] = useState<BookingStep>('service');
  const [bookingType, setBookingType] = useState<'guest' | 'login'>('guest');
  const [showSignupForm, setShowSignupForm] = useState(false);
  const [guestName, setGuestName] = useState('');
  const [guestEmail, setGuestEmail] = useState('');
  const [guestPhone, setGuestPhone] = useState('');
  const [password, setPassword] = useState('');
  const [bookingNotes, setBookingNotes] = useState('');
  const [customFieldValues, setCustomFieldValues] = useState<Record<string, string>>({});

  const [reserving, setReserving] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [reservationId, setReservationId] = useState<string | null>(null);
  const [appointmentId, setAppointmentId] = useState<string | null>(null);
  const [bookingId, setBookingId] = useState<string | null>(null);
  const [cancellationToken, setCancellationToken] = useState<string | null>(null);

  // Load tenant configuration
  useEffect(() => {
    if (!subdomain) {
      setError(t('noBusinessSpecified'));
      setLoading(false);
      return;
    }

    fetch(`/api/config/tenant?subdomain=${subdomain}`)
      .then(res => res.json())
      .then(data => {
        if (data.success && data.config) {
          setConfig(data.config);
          if (data.config.categories.length > 0) {
            setSelectedCategory(data.config.categories[0]);
          }
          
          // Apply brand colors from the configuration
          if (data.config.branding?.primaryColor && data.config.branding?.secondaryColor) {
            applyBrandColors({
              primary: data.config.branding.primaryColor,
              secondary: data.config.branding.secondaryColor,
            });
          }
        } else {
          setError(data.error || t('loadFailed'));
        }
      })
      .catch(err => {
        setError(t('loadPageFailed'));
        console.error(err);
      })
      .finally(() => setLoading(false));
    
    // Cleanup: remove brand colors when component unmounts
    return () => {
      removeBrandColors();
    };
  }, [subdomain, t]);

  // State for date capacity data
  const [dateCapacityMap, setDateCapacityMap] = useState<Map<string, { available: number; total: number; percentage: number; hasAvailableSlots: boolean }>>(new Map());
  const [loadingDateCapacity, setLoadingDateCapacity] = useState(false);

  // Load capacity data for all visible dates when service is selected
  useEffect(() => {
    if (!selectedService || !subdomain || !config) {
      setDateCapacityMap(new Map());
      return;
    }

    setLoadingDateCapacity(true);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const startDateStr = formatDateYYYYMMDD(today);

    const endDate = new Date(today);
    endDate.setDate(endDate.getDate() + Math.min(config.bookingLimits.advanceBookingDays, 30));
    const endDateStr = formatDateYYYYMMDD(endDate);

    fetch(`/api/booking/slots?subdomain=${subdomain}&serviceId=${selectedService.id}&startDate=${startDateStr}&endDate=${endDateStr}`)
      .then(res => res.json())
      .then(data => {
        if (data.success && data.slots) {
          // Calculate capacity per day, filtering out past slots
          const now = new Date();
          const capacityByDate = new Map<string, { available: number; total: number; hasAvailableSlots: boolean }>();

          data.slots.forEach((slot: TimeSlot) => {
            const slotTime = new Date(slot.start);
            const dateKey = formatDateYYYYMMDD(slotTime);

            if (!capacityByDate.has(dateKey)) {
              capacityByDate.set(dateKey, { available: 0, total: 0, hasAvailableSlots: false });
            }
            const dayData = capacityByDate.get(dateKey)!;
            dayData.total += slot.totalCapacity;
            dayData.available += slot.capacity;

            // Check if this slot is in the future and available
            if (slotTime > now && slot.available) {
              dayData.hasAvailableSlots = true;
            }
          });

          // Calculate percentages
          const capacityMap = new Map<string, { available: number; total: number; percentage: number; hasAvailableSlots: boolean }>();
          capacityByDate.forEach((value, key) => {
            const usedCapacity = value.total - value.available;
            const percentage = value.total > 0 ? Math.round((usedCapacity / value.total) * 100) : 0;
            capacityMap.set(key, { ...value, percentage });
          });

          setDateCapacityMap(capacityMap);
        }
      })
      .catch(err => {
        console.error('Failed to load date capacity:', err);
      })
      .finally(() => setLoadingDateCapacity(false));
  }, [selectedService, subdomain, config]);

  // Load available slots when service and date are selected
  useEffect(() => {
    if (!selectedService || !selectedDate || !subdomain) {
      setAvailableSlots([]);
      return;
    }

    setLoadingSlots(true);
    const dateStr = formatDateYYYYMMDD(selectedDate);
    const endDate = new Date(selectedDate);
    endDate.setDate(endDate.getDate() + 1);
    const endDateStr = formatDateYYYYMMDD(endDate);

    fetch(`/api/booking/slots?subdomain=${subdomain}&serviceId=${selectedService.id}&startDate=${dateStr}&endDate=${endDateStr}`)
      .then(res => res.json())
      .then(data => {
        if (data.success && data.slots) {
          // Filter slots: only show available ones
          // Also filter out past time slots if the selected date is today
          const now = new Date();
          const isToday = selectedDate && formatDateYYYYMMDD(selectedDate) === formatDateYYYYMMDD(now);

          const filteredSlots = data.slots.filter((s: TimeSlot) => {
            // Always filter out fully booked slots
            if (!s.available) return false;

            // If today, filter out past time slots
            if (isToday) {
              const slotTime = new Date(s.start);
              return slotTime > now;
            }

            return true;
          });

          setAvailableSlots(filteredSlots);
        } else {
          setError(data.error || t('details.loadSlotsFailed'));
        }
      })
      .catch(err => {
        console.error('Failed to load slots:', err);
        setError(t('details.loadSlotsFailed'));
      })
      .finally(() => setLoadingSlots(false));
  }, [selectedService, selectedDate, subdomain]);

  // Handle service selection
  const handleServiceSelect = (service: Service) => {
    setSelectedService(service);
    setSelectedDate(null);
    setSelectedSlot(null);
    setCurrentStep('datetime');
  };

  // Handle slot selection
  const handleSlotSelect = async (slot: TimeSlot) => {
    if (!config || !selectedService) return;

    setSelectedSlot(slot);
    setCurrentStep('details');
  };

  // Handle booking submission
  const handleBooking = async () => {
    if (!config || !selectedService || !selectedSlot || !subdomain) return;

    setError(null);

    // Handle signup first if user chose that option
    if (bookingType === 'login' && showSignupForm) {
      if (!guestEmail && !guestPhone) {
        setError(t('details.emailOrPhoneRequired'));
        return;
      }
      if (!password || password.length < 8) {
        setError(t('details.passwordMinLength'));
        return;
      }

      try {
        const signupRes = await fetch('/api/auth/signup/customer', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: guestEmail || undefined,
            phone: guestPhone || undefined,
            password,
            name: guestName || undefined,
          }),
        });

        const signupData = await signupRes.json();

        if (!signupRes.ok) {
          throw new Error(signupData.error || t('details.signupFailed'));
        }

        // Account created successfully, now proceed with booking
        // The user info is already in the form fields, continue with booking flow
      } catch (err) {
        const message = err instanceof Error ? err.message : t('details.signupFailed');
        setError(message);
        return;
      }
    }

    // Handle login if user chose that option
    if (bookingType === 'login' && !showSignupForm) {
      if (!guestEmail.trim()) {
        setError(t('details.emailOrPhoneLoginRequired'));
        return;
      }
      if (!password) {
        setError(t('details.passwordRequired'));
        return;
      }

      try {
        const loginRes = await fetch('/api/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({
            email: guestEmail, // API will detect if it's email or phone
            password,
          }),
        });

        const loginData = await loginRes.json();

        if (!loginRes.ok) {
          throw new Error(loginData.error || t('details.loginFailed'));
        }

        // Check if user is a customer
        if (loginData.user.role !== 'customer') {
          setError(t('details.customerOnly'));
          return;
        }

        // Login successful, auto-fill user info
        if (loginData.user.email) setGuestEmail(loginData.user.email);
        if (loginData.user.phone) setGuestPhone(loginData.user.phone);
        if (loginData.user.name) setGuestName(loginData.user.name);

        // Continue with booking flow
      } catch (err) {
        const message = err instanceof Error ? err.message : t('details.loginFailed');
        setError(message);
        return;
      }
    }

    // Validate required fields for guest booking
    if (bookingType === 'guest') {
      if (config.bookingRequirements.requireName && !guestName.trim()) {
        setError(t('details.nameRequired'));
        return;
      }
      if (config.bookingRequirements.requireEmail && !guestEmail.trim()) {
        setError(t('details.emailRequired'));
        return;
      }
      if (config.bookingRequirements.requirePhone && !guestPhone.trim()) {
        setError(t('details.phoneRequired'));
        return;
      }

      // Validate custom fields
      for (const field of config.bookingRequirements.customFields) {
        if (field.required && !customFieldValues[field.id]?.trim()) {
          setError(`${field.label} ${t('details.fieldRequired')}`);
          return;
        }
      }
    }

    setReserving(true);

    try {
      // Step 1: Create reservation
      const businessResult = await fetch(`/api/config/tenant?subdomain=${subdomain}`);
      const businessData = await businessResult.json();

      if (!businessData.success) {
        throw new Error(t('details.businessInfoFailed'));
      }

      // Get business ID from database
      const businessInfoRes = await fetch(`/api/business/info?subdomain=${subdomain}`);
      let businessId = '';

      if (businessInfoRes.ok) {
        const businessInfo = await businessInfoRes.json();
        businessId = businessInfo.id;
      } else {
        throw new Error(t('details.businessIdFailed'));
      }

      const idempotencyKey = uuidv4();
      const reserveRes = await fetch('/api/booking/reserve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          businessId,
          serviceId: selectedService.id,
          startTime: selectedSlot.start,
          idempotencyKey,
        }),
      });

      const reserveData = await reserveRes.json();

      if (!reserveData.success) {
        throw new Error(reserveData.error || t('details.reserveSlotFailed'));
      }

      setReservationId(reserveData.reservationId);
      setReserving(false);
      setConfirming(true);

      // Step 2: Commit booking
      const commitRes = await fetch('/api/booking/commit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          reservationId: reserveData.reservationId,
          guestEmail,
          guestPhone: guestPhone || undefined,
        }),
      });

      const commitData = await commitRes.json();

      if (!commitData.success) {
        throw new Error(commitData.error || t('details.confirmBookingFailed'));
      }

      setAppointmentId(commitData.appointment.id);
      setBookingId(commitData.appointment.bookingId);
      setCancellationToken(commitData.appointment.cancellationToken);
      setConfirming(false);
      setCurrentStep('confirmation');

    } catch (err) {
      setReserving(false);
      setConfirming(false);
      const message = err instanceof Error ? err.message : t('details.bookingFailed');
      setError(message);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white px-4">
        <div className="text-center">
          <div className="animate-spin rounded-full h-10 w-10 sm:h-12 sm:w-12 border-4 brand-spinner mx-auto mb-3 sm:mb-4"></div>
          <p className="text-sm sm:text-base text-gray-500">{t('loading')}</p>
        </div>
      </div>
    );
  }

  if (error && !config) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white px-4">
        <div className="text-center max-w-md mx-auto">
          <div className="w-16 h-16 sm:w-20 sm:h-20 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-4 sm:mb-6">
            <svg className="w-8 h-8 sm:w-10 sm:h-10 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900 mb-2 tracking-tight">{t('errorTitle')}</h1>
          <p className="text-sm sm:text-base text-gray-500 mb-6">{error || t('errorMessage')}</p>
          <a href={`/${locale}`} className="inline-flex items-center text-sm font-semibold brand-link">
            {t('returnHome')}
          </a>
        </div>
      </div>
    );
  }

  if (!config) return null;

  // Generate available dates (next 30 days, excluding past dates)
  const availableDates: Date[] = [];
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Start from today (not past dates)
  for (let i = 0; i < Math.min(config.bookingLimits.advanceBookingDays, 30); i++) {
    const date = new Date(today);
    date.setDate(date.getDate() + i);
    availableDates.push(date);
  }

  return (
    <div className="min-h-screen bg-white booking-page">
      {/* Header */}
      <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-sm border-b border-gray-200/60">
        <div className="px-4 sm:px-6 lg:px-12 py-5">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3 sm:gap-4">
              {config.branding.logoUrl ? (
                <img
                  src={config.branding.logoUrl}
                  alt={config.business.name}
                  className="h-10 sm:h-12 w-auto rounded-2xl shadow-sm"
                />
              ) : (
                <div className="w-10 h-10 sm:w-12 sm:h-12 brand-logo-gradient rounded-2xl flex items-center justify-center shadow-sm">
                  <span className="text-white font-bold text-lg sm:text-xl">
                    {config.business.name.charAt(0).toUpperCase()}
                  </span>
                </div>
              )}
              <div>
                <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 tracking-tight">{config.business.name}</h1>
                {config.business.description && (
                  <p className="text-sm text-gray-500 mt-1 hidden sm:block">{config.business.description}</p>
                )}
              </div>
            </div>
            <div className="hidden lg:flex flex-col items-end gap-1 text-sm text-gray-500">
              <div className="flex items-center gap-2">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M2.25 6.75c0 8.284 6.716 15 15 15h2.25a2.25 2.25 0 002.25-2.25v-1.372c0-.516-.351-.966-.852-1.091l-4.423-1.106c-.44-.11-.902.055-1.173.417l-.97 1.293c-.282.376-.769.542-1.21.38a12.035 12.035 0 01-7.143-7.143c-.162-.441.004-.928.38-1.21l1.293-.97c.363-.271.527-.734.417-1.173L6.963 3.102a1.125 1.125 0 00-1.091-.852H4.5A2.25 2.25 0 002.25 4.5v2.25z" />
                </svg>
                {config.contact.phone}
              </div>
              <div className="flex items-center gap-2">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" />
                </svg>
                {config.contact.email}
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-12 py-6 sm:py-8">
        {currentStep === 'confirmation' ? (
          // Confirmation Screen
          <div className="max-w-2xl mx-auto">
            <div className="bg-white rounded-2xl border border-gray-200/60 p-6 sm:p-8 text-center">
              <div className="w-20 h-20 brand-success-icon rounded-full flex items-center justify-center mx-auto mb-6">
                <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-3 sm:mb-4 tracking-tight">{t('confirmation.title')}</h2>
              <p className="text-sm sm:text-base text-gray-500 mb-6 sm:mb-8 max-w-md mx-auto">
                {t('confirmation.message')} <span className="font-semibold text-gray-900">{guestEmail}</span>
              </p>
              {config.business.timezone && (
                <p className="text-xs text-gray-400 mb-4">
                  {t('confirmation.timezone')} {config.business.timezone.replace('_', ' ')}
                </p>
              )}

              <div className="bg-gray-50 border border-gray-100 rounded-xl p-5 sm:p-6 mb-6 text-left">
                <div className="flex items-center gap-2 mb-4">
                  <svg className="w-5 h-5 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  <h3 className="text-base font-semibold text-gray-900">{t('confirmation.bookingDetails')}</h3>
                </div>
                <div className="space-y-3 text-sm">
                  <div className="flex justify-between gap-4">
                    <span className="text-gray-500">{t('confirmation.service')}</span>
                    <span className="font-semibold text-gray-900 text-right">{selectedService?.name}</span>
                  </div>
                  <div className="flex justify-between gap-4">
                    <span className="text-gray-500">{t('confirmation.dateTime')}</span>
                    <span className="font-semibold text-gray-900 text-right">
                      {selectedSlot && formatDateFull(new Date(selectedSlot.start), locale)} {t('confirmation.at')} {selectedSlot && config.business.timezone && formatTimeWithTimezone(new Date(selectedSlot.start), config.business.timezone, locale)}
                    </span>
                  </div>
                  <div className="flex justify-between gap-4">
                    <span className="text-gray-500">{t('confirmation.durationLabel')}</span>
                    <span className="font-semibold text-gray-900 text-right">{selectedService?.duration} {t('confirmation.duration')}</span>
                  </div>
                  <div className="flex justify-between gap-4 border-t border-gray-200 pt-3 mt-3">
                    <span className="text-gray-900 font-semibold">{t('confirmation.total')}</span>
                    <span className="text-lg font-bold text-gray-900 text-right">
                      {selectedService && selectedService.price > 0 ? `${(selectedService.price / 100).toFixed(2)} ${config.business.currency}` : t('details.free')}
                    </span>
                  </div>
                </div>
              </div>

              {bookingId && (
                <div className="bg-gray-50 border border-dashed border-gray-300 rounded-xl p-4 my-6 text-center">
                  <p className="text-sm text-gray-600 mb-1">{t('confirmation.bookingId')}:</p>
                  <p className="text-xl font-bold text-gray-900 tracking-wider">{bookingId}</p>
                  <p className="text-xs text-gray-500 mt-2">{t('confirmation.manageDescription')}</p>
                </div>
              )}

              {cancellationToken && config.cancellationPolicy.allowCancellation && (
                <div className="text-center mb-6">
                  <a
                    href={`/${locale}/book/manage`}
                    className="text-xs sm:text-sm brand-link font-medium"
                  >
                    {t('confirmation.manageLink')}
                  </a>
                </div>
              )}

              <button
                onClick={() => window.location.reload()}
                className="w-full sm:w-auto px-6 py-3 brand-button text-white rounded-2xl font-semibold transition-all"
              >
                {t('confirmation.newBooking')}
              </button>
            </div>
          </div>
        ) : (
          <>
            {/* Step Indicator */}
            <div className="mb-6 sm:mb-8">
              <div className="flex items-center justify-center gap-3 sm:gap-4">
                <div className={`flex flex-col sm:flex-row items-center gap-1.5 sm:gap-2 ${currentStep === 'service' || currentStep === 'datetime' || currentStep === 'details' ? '' : 'opacity-40'}`}>
                  <div 
                    className={`w-10 h-10 sm:w-12 sm:h-12 rounded-full flex items-center justify-center text-sm sm:text-base font-semibold transition-all ${
                      currentStep === 'service' || currentStep === 'datetime' || currentStep === 'details'
                        ? 'text-white shadow-sm'
                        : 'bg-gray-100 text-gray-400'
                    }`}
                    style={currentStep === 'service' || currentStep === 'datetime' || currentStep === 'details' ? { backgroundColor: 'var(--brand-primary)' } : undefined}
                  >
                    {selectedService ? '✓' : '1'}
                  </div>
                  <span className="text-xs sm:text-sm font-semibold text-gray-900 text-center sm:text-left">{t('steps.service')}</span>
                </div>

                <div className="h-0.5 w-6 sm:w-12 lg:w-16 bg-gray-200 flex-shrink-0 mt-0 sm:mt-0"></div>

                <div className={`flex flex-col sm:flex-row items-center gap-1.5 sm:gap-2 ${currentStep === 'datetime' || currentStep === 'details' ? '' : 'opacity-40'}`}>
                  <div 
                    className={`w-10 h-10 sm:w-12 sm:h-12 rounded-full flex items-center justify-center text-sm sm:text-base font-semibold transition-all ${
                      currentStep === 'datetime' || currentStep === 'details'
                        ? 'text-white shadow-sm'
                        : 'bg-gray-100 text-gray-400'
                    }`}
                    style={currentStep === 'datetime' || currentStep === 'details' ? { backgroundColor: 'var(--brand-primary)' } : undefined}
                  >
                    {selectedSlot ? '✓' : '2'}
                  </div>
                  <span className="text-xs sm:text-sm font-semibold text-gray-900 text-center sm:text-left">{t('steps.datetime')}</span>
                </div>

                <div className="h-0.5 w-6 sm:w-12 lg:w-16 bg-gray-200 flex-shrink-0 mt-0 sm:mt-0"></div>

                <div className={`flex flex-col sm:flex-row items-center gap-1.5 sm:gap-2 ${currentStep === 'details' ? '' : 'opacity-40'}`}>
                  <div 
                    className={`w-10 h-10 sm:w-12 sm:h-12 rounded-full flex items-center justify-center text-sm sm:text-base font-semibold transition-all ${
                      currentStep === 'details'
                        ? 'text-white shadow-sm'
                        : 'bg-gray-100 text-gray-400'
                    }`}
                    style={currentStep === 'details' ? { backgroundColor: 'var(--brand-primary)' } : undefined}
                  >
                    3
                  </div>
                  <span className="text-xs sm:text-sm font-semibold text-gray-900 text-center sm:text-left">{t('steps.details')}</span>
                </div>
              </div>
            </div>

            <div className="max-w-4xl mx-auto">
              {/* Step Content */}
              {(currentStep === 'service' || currentStep === 'datetime') && !selectedService && (
                <div className="space-y-6">
                  {/* Categories */}
                  <div className="bg-white rounded-2xl border border-gray-200/60 p-4 sm:p-6">
                    <div className="flex items-center gap-2 mb-4 sm:mb-5">
                      <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-full flex items-center justify-center text-white text-sm font-semibold flex-shrink-0" style={{ backgroundColor: 'var(--brand-primary)' }}>
                        1
                      </div>
                      <h2 className="text-base sm:text-lg lg:text-xl font-bold text-gray-900 tracking-tight">{t('service.title')}</h2>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {config.categories.map((category) => (
                        <button
                          key={category.id}
                          onClick={() => {
                            setSelectedCategory(category);
                            setSelectedService(null);
                            setCurrentStep('service');
                          }}
                          className={`text-left p-4 sm:p-5 rounded-xl transition-all min-h-[72px] sm:min-h-[80px] border-2 ${
                            selectedCategory?.id === category.id
                              ? 'brand-selected shadow-sm'
                              : 'bg-white border-gray-200 brand-hoverable hover:shadow-sm active:scale-[0.98]'
                          }`}
                        >
                          <div className="font-semibold text-gray-900 mb-1 text-sm sm:text-base">{category.name}</div>
                          {category.description && (
                            <div className="text-xs sm:text-sm text-gray-500 line-clamp-2">
                              {category.description}
                            </div>
                          )}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Services */}
                  {selectedCategory && (
                    <div className="bg-white rounded-2xl border border-gray-200/60 p-4 sm:p-6">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4 sm:mb-5">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-full flex items-center justify-center text-white text-sm font-semibold flex-shrink-0" style={{ backgroundColor: 'var(--brand-primary)' }}>
                            2
                          </div>
                          <h2 className="text-base sm:text-lg lg:text-xl font-bold text-gray-900 tracking-tight">{t('service.subtitle')}</h2>
                        </div>
                        <button
                          onClick={() => {
                            setSelectedCategory(null);
                            setSelectedService(null);
                          }}
                          className="text-xs sm:text-sm text-gray-500 hover:text-gray-700 font-medium self-start sm:self-auto px-3 py-1.5 hover:bg-gray-50 rounded-lg transition-all"
                        >
                          {t('datetime.change')}
                        </button>
                      </div>
                      <div className="space-y-3">
                        {selectedCategory.services
                          .filter(s => s.enabled)
                          .map((service) => (
                            <button
                              key={service.id}
                              onClick={() => handleServiceSelect(service)}
                              className="w-full text-left p-4 sm:p-5 rounded-xl border-2 transition-all hover:shadow-sm active:scale-[0.99] border-gray-200 bg-white brand-hoverable"
                            >
                              <div className="flex items-start justify-between gap-3">
                                <div className="flex-1 min-w-0">
                                  <div className="font-semibold text-gray-900 mb-1.5 text-sm sm:text-base">{service.name}</div>
                                  {service.description && (
                                    <div className="text-xs sm:text-sm text-gray-500 mb-3 line-clamp-2">{service.description}</div>
                                  )}
                                  <div className="flex flex-wrap items-center gap-2 sm:gap-3 text-xs sm:text-sm">
                                    <div className="flex items-center gap-1.5 text-gray-600">
                                      <svg className="w-3.5 h-3.5 sm:w-4 sm:h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
                                      </svg>
                                      <span className="whitespace-nowrap">{service.duration} {t('service.duration')}</span>
                                    </div>
                                    <span className="text-gray-300 hidden sm:inline">•</span>
                                    <div className="font-bold text-gray-900 whitespace-nowrap">
                                      {service.price > 0 ? `${(service.price / 100).toFixed(2)} ${config.business.currency}` : t('details.free')}
                                    </div>
                                  </div>
                                </div>
                                {service.color && (
                                  <div
                                    className="w-4 h-4 sm:w-5 sm:h-5 rounded-full flex-shrink-0 mt-1"
                                    style={{ backgroundColor: service.color }}
                                  />
                                )}
                              </div>
                            </button>
                          ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {currentStep === 'datetime' && selectedService && (
                <div className="bg-white rounded-2xl border border-gray-200/60 p-4 sm:p-6">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4 sm:mb-5">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-full flex items-center justify-center text-white text-sm font-semibold flex-shrink-0" style={{ backgroundColor: 'var(--brand-primary)' }}>
                        2
                      </div>
                      <h2 className="text-base sm:text-lg lg:text-xl font-bold text-gray-900 tracking-tight">{t('datetime.title')}</h2>
                    </div>
                    <button
                      onClick={() => {
                        setSelectedService(null);
                        setSelectedDate(null);
                        setSelectedSlot(null);
                        setCurrentStep('service');
                      }}
                      className="text-xs sm:text-sm text-gray-500 hover:text-gray-700 font-medium self-start sm:self-auto px-3 py-1.5 hover:bg-gray-50 rounded-lg transition-all"
                    >
                      {t('datetime.change')}
                    </button>
                  </div>

                  {/* Selected Service Summary */}
                  <div className="mb-5 sm:mb-6 p-4 bg-gray-50 border border-gray-100 rounded-xl">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1">
                        <div className="text-xs text-gray-500 mb-1.5">{t('datetime.selectedService')}</div>
                        <div className="font-semibold text-gray-900 mb-2 text-sm sm:text-base">{selectedService.name}</div>
                        <div className="flex flex-wrap items-center gap-2 sm:gap-3 text-xs sm:text-sm text-gray-600">
                          <span className="whitespace-nowrap">{selectedService.duration} {t('service.duration')}</span>
                          <span className="hidden sm:inline">•</span>
                          <span className="font-bold text-gray-900 whitespace-nowrap">
                            {selectedService.price > 0 ? `${(selectedService.price / 100).toFixed(2)} ${config.business.currency}` : t('details.free')}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {error && (
                    <div className="mb-4 sm:mb-6 bg-red-50 border border-red-200 text-red-800 px-3 sm:px-4 py-2.5 sm:py-3 rounded-xl flex items-start gap-2 sm:gap-3">
                      <svg className="w-4 h-4 sm:w-5 sm:h-5 text-red-500 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <div className="flex-1 text-xs sm:text-sm leading-relaxed">{error}</div>
                    </div>
                  )}

                  {/* Date Selection */}
                  <div className="mb-5 sm:mb-6">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4 mb-3 sm:mb-4">
                      <h3 className="text-sm sm:text-base font-semibold text-gray-900">{t('datetime.selectDate')}</h3>
                      <div className="flex items-center gap-3 text-[10px] sm:text-xs">
                        <div className="flex items-center gap-1">
                          <div className="w-2.5 h-2.5 sm:w-3 sm:h-3 rounded bg-green-100 border border-green-300"></div>
                          <span className="text-gray-600">{t('datetime.available')}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <div className="w-2.5 h-2.5 sm:w-3 sm:h-3 rounded bg-yellow-100 border border-yellow-300"></div>
                          <span className="text-gray-600">{t('datetime.limited')}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <div className="w-2.5 h-2.5 sm:w-3 sm:h-3 rounded bg-orange-100 border border-orange-300"></div>
                          <span className="text-gray-600">{t('datetime.busy')}</span>
                        </div>
                      </div>
                    </div>
                    <div className="grid grid-cols-3 sm:grid-cols-5 lg:grid-cols-7 gap-2">
                      {availableDates.map((date, idx) => {
                        const dayOfWeek = getDayOfWeek(date);
                        const dayAvail = config.availability.find(a => a.day === dayOfWeek);

                        // Check for exceptions
                        const dateString = formatDateYYYYMMDD(date);
                        const exception = config.availabilityExceptions.find(e => e.date === dateString);
                        const isClosed = exception?.closed || false;

                        // Get capacity data for this date
                        const capacityData = dateCapacityMap.get(dateString);
                        const capacityPct = capacityData?.percentage || 0;

                        // Date is available if: day is enabled, not closed, and has future available slots
                        const isAvailable = (dayAvail?.enabled || false) && !isClosed && (capacityData?.hasAvailableSlots !== false);
                        const isSelected = selectedDate && formatDateYYYYMMDD(date) === formatDateYYYYMMDD(selectedDate);

                        // Determine background color based on capacity
                        const getCapacityBgStyle = () => {
                          if (!isAvailable) return 'bg-gray-100';
                          if (!selectedService) return 'bg-white'; // No service selected yet
                          if (!capacityData) return 'bg-gray-50'; // Loading or no data

                          if (isSelected) return 'brand-date-selected';

                          if (capacityPct <= 30) {
                            return 'bg-green-50 hover:bg-green-100';
                          } else if (capacityPct <= 60) {
                            return 'bg-yellow-50 hover:bg-yellow-100';
                          } else {
                            return 'bg-orange-50 hover:bg-orange-100';
                          }
                        };

                        const getBorderStyle = () => {
                          if (!isAvailable) return 'border-gray-100';
                          if (!selectedService) return 'border-gray-200';
                          if (!capacityData) return 'border-gray-200';

                          if (isSelected) return '';

                          if (capacityPct <= 30) {
                            return 'border-green-200 hover:border-green-400';
                          } else if (capacityPct <= 60) {
                            return 'border-yellow-200 hover:border-yellow-400';
                          } else {
                            return 'border-orange-200 hover:border-orange-400';
                          }
                        };

                        return (
                          <button
                            key={idx}
                            onClick={() => isAvailable && setSelectedDate(date)}
                            disabled={!isAvailable}
                            className={`p-3 sm:p-3.5 rounded-xl border-2 transition-all text-center min-h-[70px] sm:min-h-[76px] flex flex-col items-center justify-center ${getCapacityBgStyle()} ${getBorderStyle()} ${
                              !isAvailable ? 'opacity-40 cursor-not-allowed' : 'active:scale-95'
                            }`}
                            title={
                              !isAvailable
                                ? (isClosed ? t('details.closed') : t('details.unavailable'))
                                : capacityData
                                ? `${Math.round((capacityData.available / capacityData.total) * 100)}% available`
                                : undefined
                            }
                          >
                            <div className={`text-[11px] sm:text-xs font-semibold uppercase tracking-wide ${
                              isSelected ? 'brand-date-today' : isAvailable ? 'text-gray-500' : 'text-gray-400'
                            }`}>
                              {formatDayShort(date, locale).slice(0, 3)}
                            </div>
                            <div className={`text-lg sm:text-xl font-bold mt-1 ${
                              isSelected ? 'text-gray-900' : isAvailable ? 'text-gray-900' : 'text-gray-400'
                            }`}>
                              {date.getDate()}
                            </div>
                            {!isAvailable && (
                              <div className="text-[9px] sm:text-[10px] text-gray-400 mt-0.5">
                                {isClosed ? t('details.closed') : t('details.notAvailable')}
                              </div>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Time Slots */}
                  {selectedDate && (
                    <div>
                      <h3 className="text-sm sm:text-base font-semibold text-gray-900 mb-3 sm:mb-4">{t('datetime.selectTime')}</h3>
                      {loadingSlots ? (
                        <div className="flex flex-col items-center justify-center py-10 sm:py-12">
                          <div className="animate-spin rounded-full h-10 w-10 border-4 brand-spinner mb-3"></div>
                          <p className="text-sm text-gray-500">{t('datetime.loadingSlots')}</p>
                        </div>
                      ) : availableSlots.length === 0 ? (
                        <div className="text-center py-10 sm:py-12">
                          <svg className="w-14 h-14 sm:w-16 sm:h-16 text-gray-400 mx-auto mb-3 sm:mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          <p className="text-sm sm:text-base text-gray-500 font-medium">{t('datetime.noSlotsAvailable')}</p>
                          <p className="text-xs sm:text-sm text-gray-400 mt-1.5 sm:mt-2">{t('datetime.tryAnotherDate')}</p>
                        </div>
                      ) : (
                        <div className="space-y-4">
                          {/* Group slots by time of day for better UX */}
                          {(() => {
                            // Group slots: Morning (6-12), Afternoon (12-17), Evening (17-22)
                            const morning = availableSlots.filter(s => {
                              const hour = new Date(s.start).getHours();
                              return hour >= 6 && hour < 12;
                            });
                            const afternoon = availableSlots.filter(s => {
                              const hour = new Date(s.start).getHours();
                              return hour >= 12 && hour < 17;
                            });
                            const evening = availableSlots.filter(s => {
                              const hour = new Date(s.start).getHours();
                              return hour >= 17 && hour < 22;
                            });

                            return (
                              <>
                                {morning.length > 0 && (
                                  <div>
                                    <div className="text-[11px] sm:text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2.5 flex items-center gap-2">
                                      <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
                                      </svg>
                                      {t('datetime.morning')}
                                    </div>
                                    <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-2">
                                      {morning.map((slot, idx) => (
                                        <button
                                          key={idx}
                                          onClick={() => handleSlotSelect(slot)}
                                          className="px-3 py-3 rounded-xl border-2 border-gray-200 bg-white brand-slot transition-all text-center text-sm font-semibold text-gray-900 active:scale-95 min-h-[44px]"
                                        >
                                          {formatTime(new Date(slot.start), locale)}
                                        </button>
                                      ))}
                                    </div>
                                  </div>
                                )}

                                {afternoon.length > 0 && (
                                  <div>
                                    <div className="text-[11px] sm:text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2.5 flex items-center gap-2">
                                      <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
                                      </svg>
                                      {t('datetime.afternoon')}
                                    </div>
                                    <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-2">
                                      {afternoon.map((slot, idx) => (
                                        <button
                                          key={idx}
                                          onClick={() => handleSlotSelect(slot)}
                                          className="px-3 py-3 rounded-xl border-2 border-gray-200 bg-white brand-slot transition-all text-center text-sm font-semibold text-gray-900 active:scale-95 min-h-[44px]"
                                        >
                                          {formatTime(new Date(slot.start), locale)}
                                        </button>
                                      ))}
                                    </div>
                                  </div>
                                )}

                                {evening.length > 0 && (
                                  <div>
                                    <div className="text-[11px] sm:text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2.5 flex items-center gap-2">
                                      <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
                                      </svg>
                                      {t('datetime.evening')}
                                    </div>
                                    <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-2">
                                      {evening.map((slot, idx) => (
                                        <button
                                          key={idx}
                                          onClick={() => handleSlotSelect(slot)}
                                          className="px-3 py-3 rounded-xl border-2 border-gray-200 bg-white brand-slot transition-all text-center text-sm font-semibold text-gray-900 active:scale-95 min-h-[44px]"
                                        >
                                          {formatTime(new Date(slot.start), locale)}
                                        </button>
                                      ))}
                                    </div>
                                  </div>
                                )}
                              </>
                            );
                          })()}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              {currentStep === 'details' && selectedSlot && (
                <div className="bg-white rounded-2xl border border-gray-200/60 p-6 lg:p-8">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full flex items-center justify-center text-white text-sm font-semibold flex-shrink-0" style={{ backgroundColor: 'var(--brand-primary)' }}>
                        3
                      </div>
                      <h2 className="text-xl font-bold text-gray-900 tracking-tight">{t('details.title')}</h2>
                    </div>
                    <button
                      onClick={() => {
                        setSelectedSlot(null);
                        setCurrentStep('datetime');
                      }}
                      className="w-full sm:w-auto px-5 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50 rounded-xl transition-all border border-gray-200/60"
                    >
                      {t('datetime.change')}
                    </button>
                  </div>

                  {error && (
                    <div className="mb-6 bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-xl flex items-start gap-3">
                      <svg className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <div className="flex-1 text-sm leading-relaxed">{error}</div>
                    </div>
                  )}

                  {/* Booking Type Selection */}
                  <div className="mb-8">
                    <label className="block text-sm font-semibold text-gray-900 mb-3">{t('details.bookAs')}</label>
                    <div className="grid grid-cols-2 gap-1 p-1 bg-gray-100 rounded-2xl">
                      <button
                        onClick={() => {
                          setBookingType('guest');
                          setShowSignupForm(false);
                        }}
                        className={`px-6 py-2.5 text-sm font-semibold rounded-xl transition-all ${
                          bookingType === 'guest' ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500 hover:text-gray-900'
                        }`}>
                        {t('details.guest')}
                      </button>
                      <button
                        onClick={() => {
                          setBookingType('login');
                          setShowSignupForm(false);
                        }}
                        className={`px-6 py-2.5 text-sm font-semibold rounded-xl transition-all ${
                          bookingType === 'login' ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500 hover:text-gray-900'
                        }`}>
                        {t('details.login')}
                      </button>
                    </div>
                    <p className="text-xs text-gray-500 mt-2.5">
                      {bookingType === 'guest' ? t('details.guestDescription') : t('details.loginDescription')}
                    </p>
                  </div>

                  {bookingType === 'guest' && (
                    <div className="space-y-6 mb-8">
                      {config.bookingRequirements.requireName && (
                        <div>
                          <label htmlFor="name" className="block text-sm font-semibold text-gray-900 mb-2.5">
                            {t('details.name')} <span className="text-red-500">*</span>
                          </label>
                          <div className="relative">
                            <div className="absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none">
                              <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                              </svg>
                            </div>
                            <input
                              type="text"
                              id="name"
                              value={guestName}
                              onChange={(e) => setGuestName(e.target.value)}
                              className="w-full pl-12 pr-4 py-3.5 bg-white border border-gray-200/60 rounded-xl focus:outline-none  transition-all text-gray-900 placeholder:text-gray-400 text-sm"
                              placeholder={t('details.namePlaceholder')}
                              required
                            />
                          </div>
                        </div>
                      )}

                      {config.bookingRequirements.requireEmail && (
                        <div>
                          <label htmlFor="email" className="block text-sm font-semibold text-gray-900 mb-2.5">
                            {t('details.email')} <span className="text-red-500">*</span>
                          </label>
                          <div className="relative">
                            <div className="absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none">
                              <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" />
                              </svg>
                            </div>
                            <input
                              type="email"
                              id="email"
                              value={guestEmail}
                              onChange={(e) => setGuestEmail(e.target.value)}
                              className="w-full pl-12 pr-4 py-3.5 bg-white border border-gray-200/60 rounded-xl focus:outline-none  transition-all text-gray-900 placeholder:text-gray-400 text-sm"
                              placeholder={t('details.emailPlaceholder')}
                              required
                            />
                          </div>
                        </div>
                      )}

                      {config.bookingRequirements.requirePhone && (
                        <div>
                          <label htmlFor="phone" className="block text-sm font-semibold text-gray-900 mb-2.5">
                            {t('details.phone')} {config.bookingRequirements.requirePhone && <span className="text-red-500">*</span>}
                          </label>
                          <div className="relative">
                            <div className="absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none">
                              <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M2.25 6.75c0 8.284 6.716 15 15 15h2.25a2.25 2.25 0 002.25-2.25v-1.372c0-.516-.351-.966-.852-1.091l-4.423-1.106c-.44-.11-.902.055-1.173.417l-.97 1.293c-.282.376-.769.542-1.21.38a12.035 12.035 0 01-7.143-7.143c-.162-.441.004-.928.38-1.21l1.293-.97c.363-.271.527-.734.417-1.173L6.963 3.102a1.125 1.125 0 00-1.091-.852H4.5A2.25 2.25 0 002.25 4.5v2.25z" />
                              </svg>
                            </div>
                            <input
                              type="tel"
                              id="phone"
                              value={guestPhone}
                              onChange={(e) => setGuestPhone(e.target.value)}
                              className="w-full pl-12 pr-4 py-3.5 bg-white border border-gray-200/60 rounded-xl focus:outline-none  transition-all text-gray-900 placeholder:text-gray-400 text-sm"
                              placeholder={t('details.phonePlaceholder')}
                            />
                          </div>
                        </div>
                      )}

                      {/* Custom fields - temporarily hidden */}
                      {/* {config.bookingRequirements.customFields.map((field) => (
                        <div key={field.id}>
                          <label htmlFor={field.id} className="block text-sm font-semibold text-gray-900 mb-2.5">
                            {field.label} {field.required && <span className="text-red-500">*</span>}
                          </label>
                          {field.type === 'textarea' ? (
                            <textarea
                              id={field.id}
                              value={customFieldValues[field.id] || ''}
                              onChange={(e) => setCustomFieldValues({ ...customFieldValues, [field.id]: e.target.value })}
                              rows={4}
                              maxLength={field.maxLength}
                              placeholder={field.placeholder}
                              className="w-full px-4 py-3.5 bg-white border border-gray-200/60 rounded-xl focus:outline-none  transition-all resize-none text-gray-900 placeholder:text-gray-400 text-sm"
                            />
                          ) : field.type === 'select' ? (
                            <div className="relative">
                              <select
                                id={field.id}
                                value={customFieldValues[field.id] || ''}
                                onChange={(e) => setCustomFieldValues({ ...customFieldValues, [field.id]: e.target.value })}
                                className="w-full px-4 py-3.5 bg-white border border-gray-200/60 rounded-xl focus:outline-none  transition-all text-gray-900 appearance-none cursor-pointer text-sm"
                              >
                                <option value="" className="text-gray-400">Select an option</option>
                                {field.options?.map((option) => (
                                  <option key={option} value={option} className="text-gray-900">
                                    {option}
                                  </option>
                                ))}
                              </select>
                              <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none">
                                <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                </svg>
                              </div>
                            </div>
                          ) : (
                            <input
                              type="text"
                              id={field.id}
                              value={customFieldValues[field.id] || ''}
                              onChange={(e) => setCustomFieldValues({ ...customFieldValues, [field.id]: e.target.value })}
                              maxLength={field.maxLength}
                              placeholder={field.placeholder}
                              className="w-full px-4 py-3.5 bg-white border border-gray-200/60 rounded-xl focus:outline-none  transition-all text-gray-900 placeholder:text-gray-400 text-sm"
                            />
                          )}
                        </div>
                      ))} */}
                    </div>
                  )}

                  {bookingType === 'login' && !showSignupForm && (
                    <div className="space-y-6 mb-8">
                      <div className="brand-info-box border rounded-xl p-5">
                        <p className="text-sm brand-info-text leading-relaxed">
                          {t('details.loginPromptMessage')}
                        </p>
                      </div>

                      <div>
                        <label htmlFor="login-identifier" className="block text-sm font-semibold text-gray-900 mb-2.5">
                          {t('details.emailOrPhone')} <span className="text-red-500">*</span>
                        </label>
                        <div className="relative">
                          <div className="absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none">
                            <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" />
                            </svg>
                          </div>
                          <input
                            type="text"
                            id="login-identifier"
                            value={guestEmail}
                            onChange={(e) => setGuestEmail(e.target.value)}
                            className="w-full pl-12 pr-4 py-3.5 bg-white border border-gray-200/60 rounded-xl focus:outline-none  transition-all text-gray-900 placeholder:text-gray-400 text-sm"
                            placeholder={t('details.emailOrPhoneLoginPlaceholder')}
                            required
                          />
                        </div>
                      </div>

                      <div>
                        <label htmlFor="login-password" className="block text-sm font-semibold text-gray-900 mb-2.5">
                          {t('details.password')} <span className="text-red-500">*</span>
                        </label>
                        <div className="relative">
                          <div className="absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none">
                            <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
                            </svg>
                          </div>
                          <input
                            type="password"
                            id="login-password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className="w-full pl-12 pr-4 py-3.5 bg-white border border-gray-200/60 rounded-xl focus:outline-none  transition-all text-gray-900 placeholder:text-gray-400 text-sm"
                            placeholder={t('details.passwordPlaceholder')}
                            required
                          />
                        </div>
                      </div>

                      <div className="border-t border-gray-200/60 pt-5">
                        <p className="text-sm text-gray-600 text-center mb-3">
                          {t('details.signupPrompt')}
                        </p>
                        <button
                          type="button"
                          onClick={() => setShowSignupForm(true)}
                          className="w-full px-5 py-2.5 text-sm font-semibold brand-button-secondary rounded-xl transition-all border"
                        >
                          {t('details.createAccountButton')}
                        </button>
                      </div>
                    </div>
                  )}

                  {bookingType === 'login' && showSignupForm && (
                    <div className="space-y-6 mb-8">
                      <div className="brand-info-box border rounded-xl p-5">
                        <p className="text-sm brand-info-text leading-relaxed">
                          {t('details.signupBenefit')}
                        </p>
                      </div>

                      <div>
                        <label htmlFor="signup-email" className="block text-sm font-semibold text-gray-900 mb-2.5">
                          {t('details.email')} <span className="text-gray-400 text-xs">({t('details.optional')})</span>
                        </label>
                        <div className="relative">
                          <div className="absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none">
                            <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" />
                            </svg>
                          </div>
                          <input
                            type="email"
                            id="signup-email"
                            value={guestEmail}
                            onChange={(e) => setGuestEmail(e.target.value)}
                            className="w-full pl-12 pr-4 py-3.5 bg-white border border-gray-200/60 rounded-xl focus:outline-none  transition-all text-gray-900 placeholder:text-gray-400 text-sm"
                            placeholder={t('details.emailPlaceholder')}
                          />
                        </div>
                      </div>

                      <div>
                        <label htmlFor="signup-phone" className="block text-sm font-semibold text-gray-900 mb-2.5">
                          {t('details.phone')} <span className="text-gray-400 text-xs">({t('details.optional')})</span>
                        </label>
                        <div className="relative">
                          <div className="absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none">
                            <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M2.25 6.75c0 8.284 6.716 15 15 15h2.25a2.25 2.25 0 002.25-2.25v-1.372c0-.516-.351-.966-.852-1.091l-4.423-1.106c-.44-.11-.902.055-1.173.417l-.97 1.293c-.282.376-.769.542-1.21.38a12.035 12.035 0 01-7.143-7.143c-.162-.441.004-.928.38-1.21l1.293-.97c.363-.271.527-.734.417-1.173L6.963 3.102a1.125 1.125 0 00-1.091-.852H4.5A2.25 2.25 0 002.25 4.5v2.25z" />
                            </svg>
                          </div>
                          <input
                            type="tel"
                            id="signup-phone"
                            value={guestPhone}
                            onChange={(e) => setGuestPhone(e.target.value)}
                            className="w-full pl-12 pr-4 py-3.5 bg-white border border-gray-200/60 rounded-xl focus:outline-none  transition-all text-gray-900 placeholder:text-gray-400 text-sm"
                            placeholder={t('details.phonePlaceholder')}
                          />
                        </div>
                        <p className="text-xs text-gray-500 mt-2">{t('details.provideEmailOrPhone')}</p>
                      </div>

                      <div>
                        <label htmlFor="signup-password" className="block text-sm font-semibold text-gray-900 mb-2.5">
                          {t('details.password')} <span className="text-red-500">*</span>
                        </label>
                        <div className="relative">
                          <div className="absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none">
                            <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
                            </svg>
                          </div>
                          <input
                            type="password"
                            id="signup-password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className="w-full pl-12 pr-4 py-3.5 bg-white border border-gray-200/60 rounded-xl focus:outline-none  transition-all text-gray-900 placeholder:text-gray-400 text-sm"
                            placeholder={t('details.passwordPlaceholderMin')}
                            required
                            minLength={8}
                          />
                        </div>
                      </div>

                      {config.bookingRequirements.requireName && (
                        <div>
                          <label htmlFor="signup-name" className="block text-sm font-semibold text-gray-900 mb-2.5">
                            {t('details.name')} <span className="text-gray-400 text-xs">({t('details.optional')})</span>
                          </label>
                          <div className="relative">
                            <div className="absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none">
                              <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                              </svg>
                            </div>
                            <input
                              type="text"
                              id="signup-name"
                              value={guestName}
                              onChange={(e) => setGuestName(e.target.value)}
                              className="w-full pl-12 pr-4 py-3.5 bg-white border border-gray-200/60 rounded-xl focus:outline-none  transition-all text-gray-900 placeholder:text-gray-400 text-sm"
                              placeholder={t('details.namePlaceholder')}
                            />
                          </div>
                        </div>
                      )}

                      <div className="border-t border-gray-200/60 pt-5">
                        <p className="text-sm text-gray-600 text-center mb-3">
                          {t('details.loginPrompt')}
                        </p>
                        <button
                          type="button"
                          onClick={() => setShowSignupForm(false)}
                          className="w-full px-5 py-2.5 text-sm font-semibold brand-button-secondary rounded-xl transition-all border"
                        >
                          {t('details.loginLink')}
                        </button>
                      </div>
                    </div>
                  )}


                  {/* Booking Summary */}
                  <div className="bg-white border border-gray-200/60 rounded-2xl p-6 mb-8">
                    <h3 className="text-lg font-bold text-gray-900 mb-6">{tc('bookingSummary')}</h3>

                    <div className="space-y-4">
                      {/* Service */}
                      <div className="flex items-start gap-4">
                        <div className="w-10 h-10 brand-icon-bg rounded-xl flex items-center justify-center flex-shrink-0">
                          <svg className="w-5 h-5 " fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.568 3H5.25A2.25 2.25 0 003 5.25v4.318c0 .597.237 1.17.659 1.591l9.581 9.581c.699.699 1.78.872 2.607.33a18.095 18.095 0 005.223-5.223c.542-.827.369-1.908-.33-2.607L11.16 3.66A2.25 2.25 0 009.568 3z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M6 6h.008v.008H6V6z" />
                          </svg>
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-xs font-medium text-gray-500 mb-1">{t('details.service')}</div>
                          <div className="text-sm font-semibold text-gray-900">{selectedService?.name}</div>
                        </div>
                      </div>

                      {/* Date & Time */}
                      <div className="flex items-start gap-4">
                        <div className="w-10 h-10 brand-icon-bg rounded-xl flex items-center justify-center flex-shrink-0">
                          <svg className="w-5 h-5 " fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" />
                          </svg>
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-xs font-medium text-gray-500 mb-1">{t('details.date')} & {t('details.time')}</div>
                          <div className="text-sm font-semibold text-gray-900">
                            {selectedSlot && formatDateFull(new Date(selectedSlot.start), locale)}
                          </div>
                          <div className="text-sm text-gray-600 mt-0.5">
                            {selectedSlot && formatTime(new Date(selectedSlot.start), locale)} • {selectedService?.duration} {t('service.duration')}
                          </div>
                        </div>
                      </div>

                      {/* Price */}
                      <div className="border-t border-gray-100 pt-4 mt-4">
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-semibold text-gray-900">{t('details.total')}</span>
                          <span className="text-2xl font-bold text-gray-900">
                            {selectedService && `${(selectedService.price / 100).toFixed(2)} ${config.business.currency}`}
                          </span>
                        </div>
                        <p className="text-xs text-gray-500 mt-3 leading-relaxed">
                          {t('details.paymentNotice')}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-col sm:flex-row gap-3">
                    <button
                      onClick={() => setCurrentStep('datetime')}
                      disabled={reserving || confirming}
                      className="w-full sm:w-auto px-6 py-3 text-sm font-semibold text-gray-700 hover:bg-gray-50 rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed border border-gray-200/60"
                    >
                      {t('details.back')}
                    </button>
                    <button
                      onClick={handleBooking}
                      disabled={reserving || confirming}
                      className="flex-1 px-6 py-3 brand-main-cta text-white rounded-2xl text-sm font-semibold hover:shadow-lg hover:scale-[1.02] transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 disabled:hover:shadow-none flex items-center justify-center gap-2"
                    >
                      {reserving || confirming ? (
                        <>
                          <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                          </svg>
                          {reserving ? t('details.reserving') : t('details.confirming')}
                        </>
                      ) : (
                        <>
                          {bookingType === 'login' && showSignupForm && t('details.createAccountAndBook')}
                          {bookingType === 'login' && !showSignupForm && t('details.logInAndBook')}
                          {bookingType === 'guest' && t('details.confirmBooking')}
                        </>
                      )}
                    </button>
                  </div>
                </div>
              )}

              {/* Contact Information - Inside the centered layout */}
              {(currentStep as BookingStep) !== 'confirmation' && (
                <div className="mt-8 space-y-5">
                  {/* Location & Contact */}
                  <div className="bg-white rounded-2xl border border-gray-200/60 p-5 sm:p-6">
                    <div className="flex items-center gap-2 mb-5">
                      <svg className="w-5 h-5 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z" />
                      </svg>
                      <h3 className="text-sm font-semibold text-gray-900">{t('confirmation.locationAndContact')}</h3>
                    </div>

                    <div className="grid sm:grid-cols-2 gap-6">
                      {/* Address */}
                      <div>
                        <div className="text-sm font-semibold text-gray-900 mb-2">{t('details.address')}</div>
                        <div className="text-sm text-gray-500 space-y-1 mb-4">
                          <div>{config.contact.address.street}</div>
                          <div>{config.contact.address.city}, {config.contact.address.state} {config.contact.address.postalCode}</div>
                          <div>{config.contact.address.country}</div>
                        </div>
                        <a
                          href={`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent([
                            config.contact.address.street,
                            config.contact.address.city,
                            config.contact.address.state,
                            config.contact.address.postalCode,
                            config.contact.address.country
                          ].join(', '))}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white brand-cta-small rounded-xl transition-all"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
                          </svg>
                          {t('details.getDirections')}
                        </a>
                      </div>

                      {/* Contact Info */}
                      <div>
                        <div className="text-sm font-semibold text-gray-900 mb-3">{t('details.getInTouch')}</div>
                        <div className="space-y-3">
                          <a
                            href={`tel:${config.contact.phone}`}
                            className="flex items-center gap-3 text-sm text-gray-600 hover:text-gray-900 transition-colors group"
                          >
                            <div className="w-9 h-9 bg-gray-50 rounded-lg flex items-center justify-center group-hover:bg-gray-100 transition-colors">
                              <svg className="w-4 h-4 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M2.25 6.75c0 8.284 6.716 15 15 15h2.25a2.25 2.25 0 002.25-2.25v-1.372c0-.516-.351-.966-.852-1.091l-4.423-1.106c-.44-.11-.902.055-1.173.417l-.97 1.293c-.282.376-.769.542-1.21.38a12.035 12.035 0 01-7.143-7.143c-.162-.441.004-.928.38-1.21l1.293-.97c.363-.271.527-.734.417-1.173L6.963 3.102a1.125 1.125 0 00-1.091-.852H4.5A2.25 2.25 0 002.25 4.5v2.25z" />
                              </svg>
                            </div>
                            <span className="font-medium">{config.contact.phone}</span>
                          </a>
                          <a
                            href={`mailto:${config.contact.email}`}
                            className="flex items-center gap-3 text-sm text-gray-600 hover:text-gray-900 transition-colors group"
                          >
                            <div className="w-9 h-9 bg-gray-50 rounded-lg flex items-center justify-center group-hover:bg-gray-100 transition-colors">
                              <svg className="w-4 h-4 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" />
                              </svg>
                            </div>
                            <span className="font-medium">{config.contact.email}</span>
                          </a>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Business Hours */}
                  <div className="bg-white rounded-2xl border border-gray-200/60 p-5 sm:p-6">
                    <div className="flex items-center gap-2 mb-4">
                      <svg className="w-5 h-5 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <h3 className="text-sm font-semibold text-gray-900">{t('details.businessHours')}</h3>
                    </div>
                    <div className="grid sm:grid-cols-2 gap-x-8 gap-y-2.5">
                      {config.availability
                        .filter(a => a.enabled)
                        .map(a => {
                          const today = new Date().toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase();
                          const isToday = a.day === today;

                          // Format hours from slots array
                          const formatHours = () => {
                            if (!a.slots || a.slots.length === 0) return t('details.closed');

                            // If single slot, show as range
                            if (a.slots.length === 1) {
                              return `${a.slots[0].open} - ${a.slots[0].close}`;
                            }

                            // If multiple slots (breaks/split shifts), show all ranges
                            return a.slots.map(slot => `${slot.open}-${slot.close}`).join(', ');
                          };

                          return (
                            <div
                              key={a.day}
                              className={`flex justify-between items-center gap-4 py-2 px-3 rounded-lg transition-colors ${
                                isToday ? 'brand-today-indicator' : ''
                              }`}
                            >
                              <div className="flex items-center gap-2">
                                {isToday && (
                                  <div className="w-2 h-2 rounded-full brand-today-dot"></div>
                                )}
                                <span className={`text-sm ${
                                  isToday ? 'font-semibold text-gray-900' : 'text-gray-700'
                                }`}>
                                  {td(a.day as 'monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday' | 'saturday' | 'sunday')}
                                </span>
                              </div>
                              <span className={`text-sm tabular-nums ${
                                isToday ? 'font-semibold brand-today-text' : 'text-gray-500 font-medium'
                              }`}>
                                {formatHours()}
                              </span>
                            </div>
                          );
                        })}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// Utility functions
function formatDateYYYYMMDD(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function formatDayShort(date: Date, locale: string): string {
  return date.toLocaleDateString(locale, { weekday: 'short' }).toUpperCase();
}

function formatDateFull(date: Date, locale: string): string {
  return date.toLocaleDateString(locale, {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
}

function formatTime(date: Date, locale: string): string {
  return date.toLocaleTimeString(locale, {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true
  });
}

function formatTimeWithTimezone(date: Date, timezone: string, locale: string): string {
  return date.toLocaleTimeString(locale, {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
    timeZone: timezone,
    timeZoneName: 'short'
  });
}

function getDayOfWeek(date: Date): 'monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday' | 'saturday' | 'sunday' {
  const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
  return days[date.getDay()] as any;
}
