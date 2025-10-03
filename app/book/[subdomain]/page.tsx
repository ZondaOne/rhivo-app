"use client";

import { useEffect, useState } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import { TenantConfig, Category, Service } from '@/lib/config/tenant-schema';
import { v4 as uuidv4 } from 'uuid';

interface TimeSlot {
  start: string;
  end: string;
  available: boolean;
  capacity: number;
  reason?: string;
}

type BookingStep = 'service' | 'datetime' | 'details' | 'confirmation';

export default function BookingPage() {
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
  const [guestName, setGuestName] = useState('');
  const [guestEmail, setGuestEmail] = useState('');
  const [guestPhone, setGuestPhone] = useState('');
  const [bookingNotes, setBookingNotes] = useState('');
  const [customFieldValues, setCustomFieldValues] = useState<Record<string, string>>({});

  const [reserving, setReserving] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [reservationId, setReservationId] = useState<string | null>(null);
  const [appointmentId, setAppointmentId] = useState<string | null>(null);
  const [cancellationToken, setCancellationToken] = useState<string | null>(null);

  // Load tenant configuration
  useEffect(() => {
    if (!subdomain) {
      setError('No business specified');
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
        } else {
          setError(data.error || 'Failed to load business configuration');
        }
      })
      .catch(err => {
        setError('Failed to load booking page');
        console.error(err);
      })
      .finally(() => setLoading(false));
  }, [subdomain]);

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
          setAvailableSlots(data.slots.filter((s: TimeSlot) => s.available));
        } else {
          setError(data.error || 'Failed to load available slots');
        }
      })
      .catch(err => {
        console.error('Failed to load slots:', err);
        setError('Failed to load available slots');
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

    // Validate required fields
    if (config.bookingRequirements.requireName && !guestName.trim()) {
      setError('Name is required');
      return;
    }
    if (config.bookingRequirements.requireEmail && !guestEmail.trim()) {
      setError('Email is required');
      return;
    }
    if (config.bookingRequirements.requirePhone && !guestPhone.trim()) {
      setError('Phone is required');
      return;
    }

    // Validate custom fields
    for (const field of config.bookingRequirements.customFields) {
      if (field.required && !customFieldValues[field.id]?.trim()) {
        setError(`${field.label} is required`);
        return;
      }
    }

    setReserving(true);
    setError(null);

    try {
      // Step 1: Create reservation
      const businessResult = await fetch(`/api/config/tenant?subdomain=${subdomain}`);
      const businessData = await businessResult.json();

      if (!businessData.success) {
        throw new Error('Failed to get business information');
      }

      // Get business ID from database
      const businessInfoRes = await fetch(`/api/business/info?subdomain=${subdomain}`);
      let businessId = '';

      if (businessInfoRes.ok) {
        const businessInfo = await businessInfoRes.json();
        businessId = businessInfo.id;
      } else {
        throw new Error('Failed to get business ID');
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
        throw new Error(reserveData.error || 'Failed to reserve slot');
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
        throw new Error(commitData.error || 'Failed to confirm booking');
      }

      setAppointmentId(commitData.appointment.id);
      setCancellationToken(commitData.appointment.cancellationToken);
      setConfirming(false);
      setCurrentStep('confirmation');

    } catch (err) {
      setReserving(false);
      setConfirming(false);
      const message = err instanceof Error ? err.message : 'Failed to complete booking';
      setError(message);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="text-center">
          <div className="animate-spin rounded-full h-10 w-10 sm:h-12 sm:w-12 border-4 border-teal-600 border-t-transparent mx-auto mb-3 sm:mb-4"></div>
          <p className="text-sm sm:text-base text-gray-500">Loading booking page...</p>
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
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900 mb-2 tracking-tight">Business Not Found</h1>
          <p className="text-sm sm:text-base text-gray-500 mb-6">{error || 'This booking page is not available'}</p>
          <a href="/" className="inline-flex items-center text-sm font-semibold text-teal-600 hover:text-teal-700">
            Return to Home
          </a>
        </div>
      </div>
    );
  }

  if (!config) return null;

  // Generate available dates (next 30 days)
  const availableDates: Date[] = [];
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  for (let i = 0; i < Math.min(config.bookingLimits.advanceBookingDays, 30); i++) {
    const date = new Date(today);
    date.setDate(date.getDate() + i);
    availableDates.push(date);
  }

  return (
    <div className="min-h-screen bg-white">
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
                <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gradient-to-br from-teal-500 to-green-500 rounded-2xl flex items-center justify-center shadow-sm">
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
              <div className="w-20 h-20 bg-gradient-to-br from-teal-100 to-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
                <svg className="w-10 h-10 text-teal-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-3 sm:mb-4 tracking-tight">Booking Confirmed!</h2>
              <p className="text-sm sm:text-base text-gray-500 mb-6 sm:mb-8 max-w-md mx-auto">
                Your appointment has been successfully booked. A confirmation email has been sent to <span className="font-semibold text-gray-900">{guestEmail}</span>
              </p>

              <div className="bg-gray-50 border border-gray-100 rounded-xl p-5 sm:p-6 mb-6 text-left">
                <div className="flex items-center gap-2 mb-4">
                  <svg className="w-5 h-5 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  <h3 className="text-base font-semibold text-gray-900">Appointment Details</h3>
                </div>
                <div className="space-y-3 text-sm">
                  <div className="flex justify-between gap-4">
                    <span className="text-gray-500">Service</span>
                    <span className="font-semibold text-gray-900 text-right">{selectedService?.name}</span>
                  </div>
                  <div className="flex justify-between gap-4">
                    <span className="text-gray-500">Date</span>
                    <span className="font-semibold text-gray-900 text-right">
                      {selectedSlot && formatDateFull(new Date(selectedSlot.start))}
                    </span>
                  </div>
                  <div className="flex justify-between gap-4">
                    <span className="text-gray-500">Time</span>
                    <span className="font-semibold text-gray-900 text-right">
                      {selectedSlot && formatTime(new Date(selectedSlot.start))}
                    </span>
                  </div>
                  <div className="flex justify-between gap-4">
                    <span className="text-gray-500">Duration</span>
                    <span className="font-semibold text-gray-900 text-right">{selectedService?.duration} min</span>
                  </div>
                  <div className="flex justify-between gap-4 border-t border-gray-200 pt-3 mt-3">
                    <span className="text-gray-900 font-semibold">Total</span>
                    <span className="text-lg font-bold text-gray-900 text-right">
                      {selectedService && `${(selectedService.price / 100).toFixed(2)} ${config.business.currency}`}
                    </span>
                  </div>
                </div>
              </div>

              {cancellationToken && config.cancellationPolicy.allowCancellation && (
                <p className="text-xs sm:text-sm text-gray-500 mb-6">
                  Need to cancel? Use the link in your confirmation email or contact us directly.
                </p>
              )}

              <button
                onClick={() => window.location.reload()}
                className="w-full sm:w-auto px-6 py-3 bg-gradient-to-r from-teal-600 to-green-600 text-white rounded-2xl font-semibold hover:shadow-lg hover:scale-[1.02] transition-all"
              >
                Book Another Appointment
              </button>
            </div>
          </div>
        ) : (
          <div className="grid lg:grid-cols-3 gap-4 sm:gap-6 lg:gap-8">
            {/* Left Column - Category & Service Selection */}
            <div className="lg:col-span-1 space-y-4 sm:space-y-6">
              {/* Categories */}
              <div className="bg-white rounded-2xl border border-gray-200/60 p-4 sm:p-6">
                <h2 className="text-base sm:text-lg font-semibold text-gray-900 mb-3 sm:mb-4">Select Category</h2>
                <div className="space-y-2">
                  {config.categories.map((category) => (
                    <button
                      key={category.id}
                      onClick={() => {
                        setSelectedCategory(category);
                        setSelectedService(null);
                        setCurrentStep('service');
                      }}
                      className={`w-full text-left px-3 sm:px-4 py-2.5 sm:py-3 rounded-xl transition-all ${
                        selectedCategory?.id === category.id
                          ? 'bg-gray-50 text-gray-900 border-2 border-teal-600'
                          : 'bg-white text-gray-900 border-2 border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <div className="text-sm sm:text-base font-semibold">{category.name}</div>
                      {category.description && (
                        <div className={`text-xs sm:text-sm mt-0.5 sm:mt-1 ${
                          selectedCategory?.id === category.id ? 'text-gray-600' : 'text-gray-500'
                        }`}>
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
                  <h2 className="text-base sm:text-lg font-semibold text-gray-900 mb-3 sm:mb-4">Select Service</h2>
                  <div className="space-y-2 sm:space-y-3">
                    {selectedCategory.services
                      .filter(s => s.enabled)
                      .map((service) => (
                        <button
                          key={service.id}
                          onClick={() => handleServiceSelect(service)}
                          className={`w-full text-left p-3 sm:p-4 rounded-xl border-2 transition-all ${
                            selectedService?.id === service.id
                              ? 'border-teal-600 bg-gray-50'
                              : 'border-gray-200 bg-white hover:border-gray-300'
                          }`}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex-1 min-w-0">
                              <div className="text-sm sm:text-base font-semibold text-gray-900">{service.name}</div>
                              {service.description && (
                                <div className="text-xs sm:text-sm text-gray-500 mt-0.5 sm:mt-1 line-clamp-2">{service.description}</div>
                              )}
                              <div className="flex items-center gap-2 sm:gap-3 mt-1.5 sm:mt-2 text-xs sm:text-sm text-gray-600">
                                <span>{service.duration} min</span>
                                <span>•</span>
                                <span className="font-semibold text-gray-900">
                                  {(service.price / 100).toFixed(2)} {config.business.currency}
                                </span>
                              </div>
                            </div>
                            {service.color && (
                              <div
                                className="w-3 h-3 sm:w-4 sm:h-4 rounded-full flex-shrink-0"
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

            {/* Right Column - Date, Time & Details */}
            <div className="lg:col-span-2">
              {!selectedService ? (
                <div className="bg-white rounded-2xl border border-gray-200/60 p-8 sm:p-12 text-center">
                  <svg className="w-16 h-16 sm:w-20 sm:h-20 text-gray-400 mx-auto mb-3 sm:mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  <h3 className="text-lg sm:text-xl font-semibold text-gray-900 mb-2">Select a Service</h3>
                  <p className="text-sm sm:text-base text-gray-500">
                    Choose a category and service to see available times
                  </p>
                </div>
              ) : currentStep === 'datetime' ? (
                <div className="bg-white rounded-2xl border border-gray-200/60 p-4 sm:p-6">
                  <h2 className="text-base sm:text-lg font-semibold text-gray-900 mb-4 sm:mb-6">Select Date & Time</h2>

                  {error && (
                    <div className="mb-4 sm:mb-6 bg-red-50 border border-red-200 text-red-800 px-3 sm:px-4 py-2.5 sm:py-3 rounded-xl flex items-start gap-2 sm:gap-3">
                      <svg className="w-4 h-4 sm:w-5 sm:h-5 text-red-500 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <div className="flex-1 text-xs sm:text-sm leading-relaxed">{error}</div>
                    </div>
                  )}

                  {/* Date Selection */}
                  <div className="mb-4 sm:mb-6">
                    <h3 className="text-sm sm:text-base font-semibold text-gray-900 mb-2 sm:mb-3">Choose a Date</h3>
                    <div className="grid grid-cols-4 sm:grid-cols-5 lg:grid-cols-7 gap-1.5 sm:gap-2">
                      {availableDates.map((date, idx) => {
                        const dayOfWeek = getDayOfWeek(date);
                        const dayAvail = config.availability.find(a => a.day === dayOfWeek);
                        const isAvailable = dayAvail?.enabled || false;
                        const isSelected = selectedDate && formatDateYYYYMMDD(date) === formatDateYYYYMMDD(selectedDate);

                        return (
                          <button
                            key={idx}
                            onClick={() => isAvailable && setSelectedDate(date)}
                            disabled={!isAvailable}
                            className={`p-2 sm:p-3 rounded-xl border-2 transition-all text-center ${
                              isSelected
                                ? 'border-teal-600 bg-gray-50'
                                : isAvailable
                                ? 'border-gray-200 bg-white hover:border-gray-300'
                                : 'border-gray-100 bg-gray-50 opacity-50 cursor-not-allowed'
                            }`}
                          >
                            <div className={`text-[10px] sm:text-xs font-semibold uppercase tracking-wide ${
                              isSelected ? 'text-teal-600' : 'text-gray-500'
                            }`}>
                              {formatDayShort(date).slice(0, 3)}
                            </div>
                            <div className={`text-base sm:text-lg font-bold mt-0.5 sm:mt-1 ${
                              isSelected ? 'text-gray-900' : 'text-gray-900'
                            }`}>
                              {date.getDate()}
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Time Slots */}
                  {selectedDate && (
                    <div>
                      <h3 className="text-sm sm:text-base font-semibold text-gray-900 mb-2 sm:mb-3">Available Times</h3>
                      {loadingSlots ? (
                        <div className="flex items-center justify-center py-8 sm:py-12">
                          <div className="animate-spin rounded-full h-8 w-8 border-4 border-teal-600 border-t-transparent"></div>
                        </div>
                      ) : availableSlots.length === 0 ? (
                        <div className="text-center py-8 sm:py-12">
                          <svg className="w-12 h-12 sm:w-16 sm:h-16 text-gray-400 mx-auto mb-3 sm:mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          <p className="text-sm sm:text-base text-gray-500">No available slots for this date</p>
                          <p className="text-xs sm:text-sm text-gray-400 mt-1 sm:mt-2">Please select another date</p>
                        </div>
                      ) : (
                        <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-5 gap-1.5 sm:gap-2 max-h-64 sm:max-h-96 overflow-y-auto">
                          {availableSlots.map((slot, idx) => (
                            <button
                              key={idx}
                              onClick={() => handleSlotSelect(slot)}
                              className="px-2 sm:px-4 py-2 sm:py-3 rounded-xl border-2 border-gray-200 bg-white hover:border-teal-600 hover:bg-gray-50 transition-all text-center text-xs sm:text-sm font-semibold text-gray-900"
                            >
                              {formatTime(new Date(slot.start))}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ) : currentStep === 'details' ? (
                <div className="bg-white rounded-2xl border border-gray-200/60 p-4 sm:p-6">
                  <h2 className="text-base sm:text-lg font-semibold text-gray-900 mb-4 sm:mb-6">Your Information</h2>

                  {error && (
                    <div className="mb-4 sm:mb-6 bg-red-50 border border-red-200 text-red-800 px-3 sm:px-4 py-2.5 sm:py-3 rounded-xl flex items-start gap-2 sm:gap-3">
                      <svg className="w-4 h-4 sm:w-5 sm:h-5 text-red-500 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <div className="flex-1 text-xs sm:text-sm leading-relaxed">{error}</div>
                    </div>
                  )}

                  <div className="space-y-5 mb-6">
                    {config.bookingRequirements.requireName && (
                      <div>
                        <label htmlFor="name" className="block text-sm font-semibold text-gray-900 mb-2">
                          Name <span className="text-red-500">*</span>
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
                            className="w-full pl-12 pr-4 py-3 bg-white border border-gray-200 rounded-xl focus:outline-none focus:border-teal-600 focus:ring-2 focus:ring-teal-100 transition-all text-gray-900 placeholder:text-gray-400"
                            placeholder="Enter your full name"
                            required
                          />
                        </div>
                      </div>
                    )}

                    {config.bookingRequirements.requireEmail && (
                      <div>
                        <label htmlFor="email" className="block text-sm font-semibold text-gray-900 mb-2">
                          Email <span className="text-red-500">*</span>
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
                            className="w-full pl-12 pr-4 py-3 bg-white border border-gray-200 rounded-xl focus:outline-none focus:border-teal-600 focus:ring-2 focus:ring-teal-100 transition-all text-gray-900 placeholder:text-gray-400"
                            placeholder="your.email@example.com"
                            required
                          />
                        </div>
                      </div>
                    )}

                    {config.bookingRequirements.requirePhone && (
                      <div>
                        <label htmlFor="phone" className="block text-sm font-semibold text-gray-900 mb-2">
                          Phone {config.bookingRequirements.requirePhone && <span className="text-red-500">*</span>}
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
                            className="w-full pl-12 pr-4 py-3 bg-white border border-gray-200 rounded-xl focus:outline-none focus:border-teal-600 focus:ring-2 focus:ring-teal-100 transition-all text-gray-900 placeholder:text-gray-400"
                            placeholder="+1 (555) 000-0000"
                          />
                        </div>
                      </div>
                    )}

                    {config.bookingRequirements.customFields.map((field) => (
                      <div key={field.id}>
                        <label htmlFor={field.id} className="block text-sm font-semibold text-gray-900 mb-2">
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
                            className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl focus:outline-none focus:border-teal-600 focus:ring-2 focus:ring-teal-100 transition-all resize-none text-gray-900 placeholder:text-gray-400"
                          />
                        ) : field.type === 'select' ? (
                          <div className="relative">
                            <select
                              id={field.id}
                              value={customFieldValues[field.id] || ''}
                              onChange={(e) => setCustomFieldValues({ ...customFieldValues, [field.id]: e.target.value })}
                              className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl focus:outline-none focus:border-teal-600 focus:ring-2 focus:ring-teal-100 transition-all text-gray-900 appearance-none cursor-pointer"
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
                            className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl focus:outline-none focus:border-teal-600 focus:ring-2 focus:ring-teal-100 transition-all text-gray-900 placeholder:text-gray-400"
                          />
                        )}
                      </div>
                    ))}
                  </div>

                  {/* Booking Summary */}
                  <div className="bg-gray-50 border border-gray-100 rounded-xl p-5 mb-6">
                    <div className="flex items-center gap-2 mb-4">
                      <svg className="w-5 h-5 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                      <h3 className="text-base font-semibold text-gray-900">Booking Summary</h3>
                    </div>
                    <div className="space-y-3 text-sm">
                      <div className="flex justify-between gap-4">
                        <span className="text-gray-500">Service</span>
                        <span className="font-semibold text-gray-900 text-right">{selectedService?.name}</span>
                      </div>
                      <div className="flex justify-between gap-4">
                        <span className="text-gray-500">Date</span>
                        <span className="font-semibold text-gray-900 text-right">
                          {selectedSlot && formatDateFull(new Date(selectedSlot.start))}
                        </span>
                      </div>
                      <div className="flex justify-between gap-4">
                        <span className="text-gray-500">Time</span>
                        <span className="font-semibold text-gray-900 text-right">
                          {selectedSlot && formatTime(new Date(selectedSlot.start))}
                        </span>
                      </div>
                      <div className="flex justify-between gap-4">
                        <span className="text-gray-500">Duration</span>
                        <span className="font-semibold text-gray-900 text-right">{selectedService?.duration} min</span>
                      </div>
                      <div className="flex justify-between gap-4 border-t border-gray-200 pt-3 mt-3">
                        <span className="text-gray-900 font-semibold">Total</span>
                        <span className="text-lg font-bold text-gray-900 text-right">
                          {selectedService && `${(selectedService.price / 100).toFixed(2)} ${config.business.currency}`}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
                    <button
                      onClick={() => setCurrentStep('datetime')}
                      disabled={reserving || confirming}
                      className="w-full sm:w-auto px-4 sm:px-6 py-2.5 sm:py-3 text-sm font-semibold text-gray-700 hover:bg-gray-50 rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed border border-gray-200"
                    >
                      Back
                    </button>
                    <button
                      onClick={handleBooking}
                      disabled={reserving || confirming}
                      className="flex-1 px-4 sm:px-6 py-2.5 sm:py-3 bg-gradient-to-r from-teal-600 to-green-600 text-white rounded-2xl text-sm font-semibold hover:shadow-lg hover:scale-[1.02] transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 disabled:hover:shadow-none flex items-center justify-center gap-2"
                    >
                      {reserving || confirming ? (
                        <>
                          <svg className="animate-spin h-4 w-4 sm:h-5 sm:w-5" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                          </svg>
                          {reserving ? 'Reserving...' : 'Confirming...'}
                        </>
                      ) : (
                        'Confirm Booking'
                      )}
                    </button>
                  </div>
                </div>
              ) : null}
            </div>
          </div>
        )}

        {/* Contact Information */}
        {currentStep !== 'confirmation' && (
          <div className="mt-6 sm:mt-8 space-y-4 sm:space-y-6">
            {/* Map */}
            <div className="bg-white rounded-2xl border border-gray-200/60 overflow-hidden">
              <div className="relative w-full h-[250px] sm:h-[300px] bg-gray-100">
                <iframe
                  width="100%"
                  height="100%"
                  className="border-0"
                  loading="lazy"
                  allowFullScreen
                  referrerPolicy="no-referrer-when-downgrade"
                  src={`https://maps.google.com/maps?q=${encodeURIComponent([
                    config.contact.address.street,
                    config.contact.address.city,
                    config.contact.address.state,
                    config.contact.address.postalCode,
                    config.contact.address.country
                  ].join(', '))}&t=&z=15&ie=UTF8&iwloc=&output=embed`}
                ></iframe>
              </div>
              <div className="p-4 sm:p-5 border-t border-gray-100">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <svg className="w-5 h-5 text-gray-700 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z" />
                      </svg>
                      <h3 className="text-sm font-semibold text-gray-900">Address</h3>
                    </div>
                    <div className="text-gray-500 space-y-0.5 text-sm">
                      <div>{config.contact.address.street}</div>
                      <div>{config.contact.address.city}, {config.contact.address.state} {config.contact.address.postalCode}</div>
                      <div>{config.contact.address.country}</div>
                    </div>
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
                    className="flex-shrink-0 px-4 py-2 text-sm font-semibold text-teal-600 hover:bg-teal-50 rounded-xl transition-all flex items-center gap-1.5"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
                    </svg>
                    Directions
                  </a>
                </div>
              </div>
            </div>

            {/* Business Hours */}
            <div className="bg-white rounded-2xl border border-gray-200/60 p-4 sm:p-5">
              <div className="flex items-center gap-2 mb-4">
                <svg className="w-5 h-5 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <h3 className="text-sm font-semibold text-gray-900">Business Hours</h3>
              </div>
              <div className="grid sm:grid-cols-2 gap-x-8 gap-y-2.5">
                {config.availability
                  .filter(a => a.enabled)
                  .map(a => {
                    const today = new Date().toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase();
                    const isToday = a.day === today;

                    return (
                      <div
                        key={a.day}
                        className={`flex justify-between items-center gap-4 py-2 px-3 rounded-lg transition-colors ${
                          isToday ? 'bg-teal-50 border border-teal-100' : ''
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          {isToday && (
                            <div className="w-2 h-2 rounded-full bg-teal-600"></div>
                          )}
                          <span className={`text-sm capitalize ${
                            isToday ? 'font-semibold text-gray-900' : 'text-gray-700'
                          }`}>
                            {a.day}
                          </span>
                        </div>
                        <span className={`text-sm tabular-nums ${
                          isToday ? 'font-semibold text-teal-900' : 'text-gray-500 font-medium'
                        }`}>
                          {a.open} - {a.close}
                        </span>
                      </div>
                    );
                  })}
              </div>
            </div>
          </div>
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

function formatDayShort(date: Date): string {
  return date.toLocaleDateString('en-US', { weekday: 'short' }).toUpperCase();
}

function formatDateFull(date: Date): string {
  return date.toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
}

function formatTime(date: Date): string {
  return date.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true
  });
}

function getDayOfWeek(date: Date): 'monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday' | 'saturday' | 'sunday' {
  const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
  return days[date.getDay()] as any;
}
