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
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-teal-50 to-green-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-teal-600 border-t-transparent mx-auto mb-4"></div>
          <p className="text-gray-600">Loading booking page...</p>
        </div>
      </div>
    );
  }

  if (error && !config) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-red-50 to-orange-50">
        <div className="text-center max-w-md mx-auto p-6">
          <svg className="w-16 h-16 text-red-500 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Business Not Found</h1>
          <p className="text-gray-600 mb-6">{error || 'This booking page is not available'}</p>
          <a href="/" className="text-teal-600 hover:text-teal-700 font-semibold">
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
    <div className="min-h-screen bg-gradient-to-br from-teal-50 via-green-50 to-teal-100">
      {/* Header */}
      <header className="border-b border-gray-200/60 bg-white/80 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              {config.branding.logoUrl && (
                <img
                  src={config.branding.logoUrl}
                  alt={config.business.name}
                  className="h-10 w-auto"
                />
              )}
              <div>
                <h1 className="text-2xl font-bold text-gray-900 tracking-tight">{config.business.name}</h1>
                {config.business.description && (
                  <p className="text-sm text-gray-600 mt-1">{config.business.description}</p>
                )}
              </div>
            </div>
            <div className="text-right text-sm text-gray-600">
              <div>{config.contact.phone}</div>
              <div>{config.contact.email}</div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-6 py-8">
        {currentStep === 'confirmation' ? (
          // Confirmation Screen
          <div className="max-w-2xl mx-auto">
            <div className="bg-white rounded-2xl shadow-sm border border-gray-200/60 p-8 text-center">
              <div className="w-20 h-20 bg-gradient-to-br from-teal-100 to-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
                <svg className="w-10 h-10 text-teal-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h2 className="text-3xl font-bold text-gray-900 mb-4">Booking Confirmed!</h2>
              <p className="text-gray-600 mb-8">
                Your appointment has been successfully booked. A confirmation email has been sent to {guestEmail}.
              </p>

              <div className="bg-teal-50 border border-teal-100 rounded-xl p-6 mb-6 text-left">
                <h3 className="font-semibold text-gray-900 mb-4">Appointment Details</h3>
                <div className="space-y-3 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Service:</span>
                    <span className="font-semibold text-gray-900">{selectedService?.name}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Date:</span>
                    <span className="font-semibold text-gray-900">
                      {selectedSlot && formatDateFull(new Date(selectedSlot.start))}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Time:</span>
                    <span className="font-semibold text-gray-900">
                      {selectedSlot && formatTime(new Date(selectedSlot.start))}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Duration:</span>
                    <span className="font-semibold text-gray-900">{selectedService?.duration} minutes</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Price:</span>
                    <span className="font-semibold text-gray-900">
                      {selectedService && `${(selectedService.price / 100).toFixed(2)} ${config.business.currency}`}
                    </span>
                  </div>
                </div>
              </div>

              {cancellationToken && config.cancellationPolicy.allowCancellation && (
                <p className="text-sm text-gray-600 mb-6">
                  Need to cancel? Use the link in your confirmation email or contact us directly.
                </p>
              )}

              <button
                onClick={() => window.location.reload()}
                className="px-6 py-3 bg-gradient-to-r from-teal-600 to-green-600 text-white rounded-xl font-semibold hover:shadow-lg hover:scale-[1.02] transition-all"
              >
                Book Another Appointment
              </button>
            </div>
          </div>
        ) : (
          <div className="grid lg:grid-cols-3 gap-8">
            {/* Left Column - Category & Service Selection */}
            <div className="lg:col-span-1 space-y-6">
              {/* Categories */}
              <div className="bg-white rounded-2xl shadow-sm border border-gray-200/60 p-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">Select Category</h2>
                <div className="space-y-2">
                  {config.categories.map((category) => (
                    <button
                      key={category.id}
                      onClick={() => {
                        setSelectedCategory(category);
                        setSelectedService(null);
                        setCurrentStep('service');
                      }}
                      className={`w-full text-left px-4 py-3 rounded-xl transition-all ${
                        selectedCategory?.id === category.id
                          ? 'bg-gradient-to-r from-teal-600 to-green-600 text-white shadow-md'
                          : 'bg-gray-50 text-gray-900 hover:bg-gray-100'
                      }`}
                    >
                      <div className="font-semibold">{category.name}</div>
                      {category.description && (
                        <div className={`text-sm mt-1 ${
                          selectedCategory?.id === category.id ? 'text-teal-100' : 'text-gray-600'
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
                <div className="bg-white rounded-2xl shadow-sm border border-gray-200/60 p-6">
                  <h2 className="text-lg font-semibold text-gray-900 mb-4">Select Service</h2>
                  <div className="space-y-3">
                    {selectedCategory.services
                      .filter(s => s.enabled)
                      .map((service) => (
                        <button
                          key={service.id}
                          onClick={() => handleServiceSelect(service)}
                          className={`w-full text-left p-4 rounded-xl border-2 transition-all ${
                            selectedService?.id === service.id
                              ? 'border-teal-600 bg-teal-50 shadow-md'
                              : 'border-gray-200 bg-white hover:border-gray-300'
                          }`}
                        >
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <div className="font-semibold text-gray-900">{service.name}</div>
                              {service.description && (
                                <div className="text-sm text-gray-600 mt-1">{service.description}</div>
                              )}
                              <div className="flex items-center gap-3 mt-2 text-sm text-gray-600">
                                <span>{service.duration} min</span>
                                <span>•</span>
                                <span className="font-semibold">
                                  {(service.price / 100).toFixed(2)} {config.business.currency}
                                </span>
                              </div>
                            </div>
                            {service.color && (
                              <div
                                className="w-4 h-4 rounded-full ml-3 flex-shrink-0"
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
                <div className="bg-white rounded-2xl shadow-sm border border-gray-200/60 p-12 text-center">
                  <svg className="w-20 h-20 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  <h3 className="text-xl font-semibold text-gray-900 mb-2">Select a Service</h3>
                  <p className="text-gray-600">
                    Choose a category and service from the left to see available appointment times
                  </p>
                </div>
              ) : currentStep === 'datetime' ? (
                <div className="bg-white rounded-2xl shadow-sm border border-gray-200/60 p-6">
                  <h2 className="text-lg font-semibold text-gray-900 mb-6">Select Date & Time</h2>

                  {error && (
                    <div className="mb-6 bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-xl flex items-start gap-3">
                      <svg className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <div className="flex-1 text-sm leading-relaxed">{error}</div>
                    </div>
                  )}

                  {/* Date Selection */}
                  <div className="mb-6">
                    <h3 className="font-semibold text-gray-900 mb-3">Choose a Date</h3>
                    <div className="grid grid-cols-4 gap-2">
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
                            className={`p-3 rounded-xl border-2 transition-all text-center ${
                              isSelected
                                ? 'border-teal-600 bg-teal-50 shadow-md'
                                : isAvailable
                                ? 'border-gray-200 bg-white hover:border-gray-300'
                                : 'border-gray-100 bg-gray-50 opacity-50 cursor-not-allowed'
                            }`}
                          >
                            <div className={`text-xs font-medium uppercase ${
                              isSelected ? 'text-teal-600' : 'text-gray-500'
                            }`}>
                              {formatDayShort(date)}
                            </div>
                            <div className={`text-lg font-bold mt-1 ${
                              isSelected ? 'text-teal-900' : 'text-gray-900'
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
                      <h3 className="font-semibold text-gray-900 mb-3">Available Times</h3>
                      {loadingSlots ? (
                        <div className="flex items-center justify-center py-12">
                          <div className="animate-spin rounded-full h-8 w-8 border-4 border-teal-600 border-t-transparent"></div>
                        </div>
                      ) : availableSlots.length === 0 ? (
                        <div className="text-center py-12">
                          <svg className="w-16 h-16 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          <p className="text-gray-600">No available slots for this date</p>
                          <p className="text-sm text-gray-500 mt-2">Please select another date</p>
                        </div>
                      ) : (
                        <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 max-h-96 overflow-y-auto pr-2">
                          {availableSlots.map((slot, idx) => (
                            <button
                              key={idx}
                              onClick={() => handleSlotSelect(slot)}
                              className="px-4 py-3 rounded-xl border-2 border-gray-200 bg-white hover:border-teal-600 hover:bg-teal-50 transition-all text-center font-medium text-gray-900"
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
                <div className="bg-white rounded-2xl shadow-sm border border-gray-200/60 p-6">
                  <h2 className="text-lg font-semibold text-gray-900 mb-6">Your Information</h2>

                  {error && (
                    <div className="mb-6 bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-xl flex items-start gap-3">
                      <svg className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <div className="flex-1 text-sm leading-relaxed">{error}</div>
                    </div>
                  )}

                  <div className="space-y-4 mb-6">
                    {config.bookingRequirements.requireName && (
                      <div>
                        <label htmlFor="name" className="block text-sm font-semibold text-gray-900 mb-2">
                          Name <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="text"
                          id="name"
                          value={guestName}
                          onChange={(e) => setGuestName(e.target.value)}
                          className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent transition-all text-gray-900 placeholder-gray-400"
                          placeholder="John Doe"
                          required
                        />
                      </div>
                    )}

                    {config.bookingRequirements.requireEmail && (
                      <div>
                        <label htmlFor="email" className="block text-sm font-semibold text-gray-900 mb-2">
                          Email <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="email"
                          id="email"
                          value={guestEmail}
                          onChange={(e) => setGuestEmail(e.target.value)}
                          className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent transition-all text-gray-900 placeholder-gray-400"
                          placeholder="john@example.com"
                          required
                        />
                      </div>
                    )}

                    {config.bookingRequirements.requirePhone && (
                      <div>
                        <label htmlFor="phone" className="block text-sm font-semibold text-gray-900 mb-2">
                          Phone {config.bookingRequirements.requirePhone && <span className="text-red-500">*</span>}
                        </label>
                        <input
                          type="tel"
                          id="phone"
                          value={guestPhone}
                          onChange={(e) => setGuestPhone(e.target.value)}
                          className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent transition-all text-gray-900 placeholder-gray-400"
                          placeholder="+1 (555) 123-4567"
                        />
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
                            rows={3}
                            maxLength={field.maxLength}
                            placeholder={field.placeholder}
                            className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent transition-all resize-none text-gray-900 placeholder-gray-400"
                          />
                        ) : field.type === 'select' ? (
                          <select
                            id={field.id}
                            value={customFieldValues[field.id] || ''}
                            onChange={(e) => setCustomFieldValues({ ...customFieldValues, [field.id]: e.target.value })}
                            className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent transition-all text-gray-900 bg-white"
                          >
                            <option value="">Select an option</option>
                            {field.options?.map((option) => (
                              <option key={option} value={option}>
                                {option}
                              </option>
                            ))}
                          </select>
                        ) : (
                          <input
                            type="text"
                            id={field.id}
                            value={customFieldValues[field.id] || ''}
                            onChange={(e) => setCustomFieldValues({ ...customFieldValues, [field.id]: e.target.value })}
                            maxLength={field.maxLength}
                            placeholder={field.placeholder}
                            className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent transition-all text-gray-900 placeholder-gray-400"
                          />
                        )}
                      </div>
                    ))}
                  </div>

                  {/* Booking Summary */}
                  <div className="bg-teal-50 border border-teal-100 rounded-xl p-6 mb-6">
                    <h3 className="font-semibold text-gray-900 mb-4">Booking Summary</h3>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-600">Service:</span>
                        <span className="font-semibold text-gray-900">{selectedService?.name}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Date:</span>
                        <span className="font-semibold text-gray-900">
                          {selectedSlot && formatDateFull(new Date(selectedSlot.start))}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Time:</span>
                        <span className="font-semibold text-gray-900">
                          {selectedSlot && formatTime(new Date(selectedSlot.start))}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Duration:</span>
                        <span className="font-semibold text-gray-900">{selectedService?.duration} minutes</span>
                      </div>
                      <div className="flex justify-between border-t border-teal-200 pt-2 mt-2">
                        <span className="text-gray-900 font-semibold">Total:</span>
                        <span className="font-bold text-teal-900">
                          {selectedService && `${(selectedService.price / 100).toFixed(2)} ${config.business.currency}`}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex gap-3">
                    <button
                      onClick={() => setCurrentStep('datetime')}
                      disabled={reserving || confirming}
                      className="px-6 py-3 text-sm font-semibold text-gray-700 hover:bg-gray-50 rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Back
                    </button>
                    <button
                      onClick={handleBooking}
                      disabled={reserving || confirming}
                      className="flex-1 px-6 py-3 bg-gradient-to-r from-teal-600 to-green-600 text-white rounded-xl font-semibold hover:shadow-lg hover:scale-[1.02] transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 disabled:hover:shadow-none flex items-center justify-center gap-2"
                    >
                      {reserving || confirming ? (
                        <>
                          <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
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
          <div className="mt-8 bg-white rounded-2xl shadow-sm border border-gray-200/60 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Contact & Location</h2>
            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <h3 className="font-semibold text-gray-900 mb-2">Address</h3>
                <div className="text-gray-600 space-y-1 text-sm">
                  <div>{config.contact.address.street}</div>
                  <div>{config.contact.address.city}, {config.contact.address.state} {config.contact.address.postalCode}</div>
                  <div>{config.contact.address.country}</div>
                </div>
              </div>
              <div>
                <h3 className="font-semibold text-gray-900 mb-2">Business Hours</h3>
                <div className="text-gray-600 space-y-1 text-sm">
                  {config.availability
                    .filter(a => a.enabled)
                    .map(a => (
                      <div key={a.day} className="flex justify-between">
                        <span className="capitalize">{a.day}:</span>
                        <span>{a.open} - {a.close}</span>
                      </div>
                    ))}
                </div>
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
