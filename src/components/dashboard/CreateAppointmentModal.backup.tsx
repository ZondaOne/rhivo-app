'use client';

import { useState, useEffect } from 'react';
import { apiRequest } from '@/lib/auth/api-client';
import { mapErrorToUserMessage } from '@/lib/errors/error-mapper';
import { formatTime, formatDate, snapToGrain } from '@/lib/calendar-utils';
import { useToast } from '@/hooks/useToast';
import { ToastContainer } from '@/components/ui/ToastContainer';

interface Service {
  id: string;
  name: string;
  duration_minutes: number;
  price_cents: number;
  category_name?: string;
  color?: string;
}

interface TimeSlot {
  start: string;
  end: string;
  available: boolean;
  capacity?: { current: number; max: number };
}

interface CreateAppointmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  defaultDate?: Date;
  businessId?: string | null;
}

type Step = 'service' | 'datetime' | 'customer';

export function CreateAppointmentModal({
  isOpen,
  onClose,
  onSuccess,
  defaultDate,
  businessId
}: CreateAppointmentModalProps) {
  const { toasts, showToast, removeToast } = useToast();
  const [currentStep, setCurrentStep] = useState<Step>('service');
  const [loading, setLoading] = useState(false);
  const [loadingSlots, setLoadingSlots] = useState(false);

  // Services state
  const [services, setServices] = useState<Service[]>([]);
  const [selectedService, setSelectedService] = useState<Service | null>(null);

  // Date/Time state
  const [selectedDate, setSelectedDate] = useState<Date>(defaultDate || new Date());
  const [availableSlots, setAvailableSlots] = useState<TimeSlot[]>([]);
  const [selectedSlot, setSelectedSlot] = useState<TimeSlot | null>(null);

  // Customer info state
  const [customerName, setCustomerName] = useState('');
  const [customerEmail, setCustomerEmail] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [notes, setNotes] = useState('');

  useEffect(() => {
    if (isOpen) {
      loadServices();
      resetForm();
    }
  }, [isOpen, businessId]);

  useEffect(() => {
    if (selectedService && selectedDate && currentStep === 'datetime') {
      loadAvailableSlots();
    }
  }, [selectedService, selectedDate, currentStep]);

  async function loadServices() {
    try {
      const url = businessId
        ? `/api/services?businessId=${businessId}`
        : '/api/services';
      const data = await apiRequest<Service[]>(url);
      setServices(data);
    } catch (error) {
      console.error('Failed to load services:', error);
      showToast(mapErrorToUserMessage(error), 'error');
    }
  }

  async function loadAvailableSlots() {
    if (!selectedService) return;

    setLoadingSlots(true);
    try {
      const dateStr = selectedDate.toISOString().split('T')[0];
      const response = await apiRequest<{ slots: TimeSlot[] }>(
        `/api/appointments/available-slots?serviceId=${selectedService.id}&date=${dateStr}`
      );
      setAvailableSlots(response.slots || []);
      setSelectedSlot(null);
    } catch (error) {
      console.error('Failed to load slots:', error);
      showToast('Failed to load available times', 'error');
      setAvailableSlots([]);
    } finally {
      setLoadingSlots(false);
    }
  }

  function resetForm() {
    setCurrentStep('service');
    setSelectedService(null);
    setSelectedDate(defaultDate || new Date());
    setSelectedSlot(null);
    setCustomerName('');
    setCustomerEmail('');
    setCustomerPhone('');
    setNotes('');
    setAvailableSlots([]);
  }

  async function handleCreateAppointment() {
    if (!selectedService || !selectedSlot) {
      showToast('Please complete all required fields', 'warning');
      return;
    }

    setLoading(true);

    try {
      await apiRequest('/api/appointments/manual', {
        method: 'POST',
        body: JSON.stringify({
          customer_name: customerName,
          customer_email: customerEmail,
          customer_phone: customerPhone,
          service_id: selectedService.id,
          start_time: new Date(selectedSlot.start).toISOString(),
          duration: selectedService.duration_minutes,
          notes,
          status: 'confirmed',
        }),
      });

      showToast('Appointment created successfully', 'success');
      onSuccess();
      onClose();
      resetForm();
    } catch (error) {
      console.error('Failed to create appointment:', error);
      showToast(mapErrorToUserMessage(error), 'error');
    } finally {
      setLoading(false);
    }
  }

  function handleClose() {
    if (!loading) {
      onClose();
      resetForm();
    }
  }

  function goToNextStep() {
    if (currentStep === 'service' && selectedService) {
      setCurrentStep('datetime');
    } else if (currentStep === 'datetime' && selectedSlot) {
      setCurrentStep('customer');
    }
  }

  function goToPreviousStep() {
    if (currentStep === 'customer') {
      setCurrentStep('datetime');
    } else if (currentStep === 'datetime') {
      setCurrentStep('service');
    }
  }

  function getDateRange(): Date[] {
    const dates: Date[] = [];
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    for (let i = 0; i < 60; i++) {
      const date = new Date(today);
      date.setDate(today.getDate() + i);
      dates.push(date);
    }

    return dates;
  }

  function isToday(date: Date): boolean {
    const today = new Date();
    return date.toDateString() === today.toDateString();
  }

  function isSameDay(date1: Date, date2: Date): boolean {
    return date1.toDateString() === date2.toDateString();
  }

  if (!isOpen) return null;

  return (
    <>
      <ToastContainer toasts={toasts} onRemove={removeToast} />

      <div className="fixed inset-0 bg-gray-900/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
          {/* Header */}
          <div className="px-8 py-6 border-b border-gray-100">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold text-gray-900 tracking-tight">New Appointment</h2>
                <p className="text-sm text-gray-500 mt-1">
                  {currentStep === 'service' && 'Select a service'}
                  {currentStep === 'datetime' && 'Choose date and time'}
                  {currentStep === 'customer' && 'Customer information'}
                </p>
              </div>
              <button
                onClick={handleClose}
                disabled={loading}
                className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-gray-100 text-gray-400 hover:text-gray-900 transition-all"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Progress Indicator */}
            <div className="flex items-center gap-2 mt-6">
              <div className={`flex-1 h-1 rounded-full transition-all ${currentStep === 'service' || currentStep === 'datetime' || currentStep === 'customer' ? 'bg-gradient-to-r from-teal-600 to-green-600' : 'bg-gray-200'}`} />
              <div className={`flex-1 h-1 rounded-full transition-all ${currentStep === 'datetime' || currentStep === 'customer' ? 'bg-gradient-to-r from-teal-600 to-green-600' : 'bg-gray-200'}`} />
              <div className={`flex-1 h-1 rounded-full transition-all ${currentStep === 'customer' ? 'bg-gradient-to-r from-teal-600 to-green-600' : 'bg-gray-200'}`} />
            </div>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto px-8 py-6">
            {/* Step 1: Service Selection */}
            {currentStep === 'service' && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider mb-4">
                    Available Services
                  </h3>
                  {services.length === 0 ? (
                    <div className="text-center py-12 bg-gray-50 border border-gray-100 rounded-xl">
                      <svg className="w-12 h-12 text-gray-300 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
                      </svg>
                      <p className="text-sm font-semibold text-gray-900">No services available</p>
                      <p className="text-xs text-gray-500 mt-1">Add services to start creating appointments</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {services.map((service) => (
                        <button
                          key={service.id}
                          onClick={() => setSelectedService(service)}
                          className={`
                            p-5 rounded-xl border-2 text-left transition-all
                            ${selectedService?.id === service.id
                              ? 'border-teal-500 bg-gradient-to-br from-teal-50 to-green-50 shadow-md'
                              : 'border-gray-200 bg-white hover:border-teal-300 hover:bg-teal-50'
                            }
                          `}
                        >
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <div className="text-base font-bold text-gray-900">{service.name}</div>
                              <div className="text-sm text-gray-500 mt-1">
                                {service.duration_minutes} minutes
                              </div>
                            </div>
                            <div className="text-right">
                              <div className="text-lg font-bold text-gray-900">
                                ${(service.price_cents / 100).toFixed(2)}
                              </div>
                            </div>
                          </div>
                          {service.category_name && (
                            <div className="mt-3 inline-block px-3 py-1 bg-white border border-gray-200 rounded-lg text-xs font-semibold text-gray-700">
                              {service.category_name}
                            </div>
                          )}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Step 2: Date & Time Selection */}
            {currentStep === 'datetime' && selectedService && (
              <div className="space-y-6">
                {/* Selected Service Summary */}
                <div className="bg-gray-50 border border-gray-100 rounded-xl p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-sm font-semibold text-gray-900">{selectedService.name}</div>
                      <div className="text-xs text-gray-500 mt-1">
                        {selectedService.duration_minutes} min · ${(selectedService.price_cents / 100).toFixed(2)}
                      </div>
                    </div>
                    <button
                      onClick={() => setCurrentStep('service')}
                      className="text-sm font-semibold text-teal-600 hover:text-teal-700"
                    >
                      Change
                    </button>
                  </div>
                </div>

                {/* Date Selector */}
                <div>
                  <label className="block text-sm font-bold text-gray-900 uppercase tracking-wider mb-3">
                    Select Date
                  </label>
                  <div className="relative">
                    <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-thin">
                      {getDateRange().map((date) => {
                        const isSelected = isSameDay(date, selectedDate);
                        const isCurrentDay = isToday(date);

                        return (
                          <button
                            key={date.toISOString()}
                            onClick={() => setSelectedDate(date)}
                            className={`
                              flex-shrink-0 flex flex-col items-center justify-center px-4 py-3 rounded-xl border-2 transition-all min-w-[80px]
                              ${isSelected
                                ? 'bg-gradient-to-br from-teal-600 to-green-600 border-teal-600 text-white shadow-lg'
                                : 'bg-white border-gray-200 text-gray-900 hover:border-teal-300 hover:bg-teal-50'
                              }
                            `}
                          >
                            <div className={`text-xs font-semibold uppercase tracking-wider ${isSelected ? 'text-white/80' : 'text-gray-500'}`}>
                              {date.toLocaleDateString('en-US', { weekday: 'short' })}
                            </div>
                            <div className={`text-lg font-bold mt-1 ${isSelected ? 'text-white' : 'text-gray-900'}`}>
                              {date.getDate()}
                            </div>
                            {isCurrentDay && !isSelected && (
                              <div className="w-1.5 h-1.5 rounded-full bg-teal-600 mt-1" />
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>

                {/* Time Slots */}
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <label className="text-sm font-bold text-gray-900 uppercase tracking-wider">
                      Available Times
                    </label>
                    <span className="text-xs text-gray-500">
                      {selectedService.duration_minutes} minute service
                    </span>
                  </div>

                  {loadingSlots ? (
                    <div className="flex items-center justify-center py-12">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-teal-600" />
                    </div>
                  ) : availableSlots.length === 0 ? (
                    <div className="text-center py-12 bg-gray-50 border border-gray-100 rounded-xl">
                      <svg className="w-12 h-12 text-gray-300 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <p className="text-sm font-semibold text-gray-900">No available times</p>
                      <p className="text-xs text-gray-500 mt-1">Try selecting a different date</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-2 max-h-[300px] overflow-y-auto">
                      {availableSlots.map((slot, index) => {
                        const slotStart = new Date(slot.start);
                        const isSelected = selectedSlot?.start === slot.start;
                        const isAvailable = slot.available;

                        return (
                          <button
                            key={index}
                            onClick={() => isAvailable && setSelectedSlot(slot)}
                            disabled={!isAvailable}
                            className={`
                              px-4 py-3 rounded-xl text-sm font-semibold transition-all
                              ${isSelected
                                ? 'bg-gradient-to-br from-teal-600 to-green-600 text-white shadow-lg'
                                : isAvailable
                                  ? 'bg-white border border-gray-200 text-gray-900 hover:border-teal-300 hover:bg-teal-50'
                                  : 'bg-gray-50 border border-gray-100 text-gray-400 cursor-not-allowed'
                              }
                            `}
                          >
                            {formatTime(slotStart)}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* Selected Slot Preview */}
                {selectedSlot && (
                  <div className="bg-teal-50 border border-teal-200 rounded-xl p-4">
                    <div className="flex items-start gap-3">
                      <svg className="w-5 h-5 text-teal-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <div className="flex-1">
                        <div className="text-sm font-semibold text-gray-900">Selected time</div>
                        <div className="text-sm text-gray-700 mt-1">
                          {formatDate(selectedDate, 'long')} at {formatTime(new Date(selectedSlot.start))} - {formatTime(new Date(selectedSlot.end))}
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Step 3: Customer Information */}
            {currentStep === 'customer' && selectedService && selectedSlot && (
              <div className="space-y-6">
                {/* Appointment Summary */}
                <div className="bg-gray-50 border border-gray-100 rounded-xl p-5">
                  <div className="text-xs font-semibold uppercase tracking-wider text-gray-500 mb-3">
                    Appointment Summary
                  </div>
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Service:</span>
                      <span className="font-semibold text-gray-900">{selectedService.name}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Date & Time:</span>
                      <span className="font-semibold text-gray-900">
                        {formatDate(selectedDate, 'short')} at {formatTime(new Date(selectedSlot.start))}
                      </span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Duration:</span>
                      <span className="font-semibold text-gray-900">{selectedService.duration_minutes} min</span>
                    </div>
                  </div>
                </div>

                {/* Customer Form */}
                <div>
                  <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider mb-4">
                    Customer Information
                  </h3>
                  <div className="space-y-4">
                    <div>
                      <label htmlFor="customer_name" className="block text-sm font-semibold text-gray-900 mb-2">
                        Name <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        id="customer_name"
                        required
                        value={customerName}
                        onChange={(e) => setCustomerName(e.target.value)}
                        className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl text-sm text-gray-900 placeholder-gray-400 focus:ring-2 focus:ring-teal-500 focus:border-teal-500 transition-all"
                        placeholder="John Doe"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label htmlFor="customer_email" className="block text-sm font-semibold text-gray-900 mb-2">
                          Email <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="email"
                          id="customer_email"
                          required
                          value={customerEmail}
                          onChange={(e) => setCustomerEmail(e.target.value)}
                          className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl text-sm text-gray-900 placeholder-gray-400 focus:ring-2 focus:ring-teal-500 focus:border-teal-500 transition-all"
                          placeholder="john@example.com"
                        />
                      </div>

                      <div>
                        <label htmlFor="customer_phone" className="block text-sm font-semibold text-gray-900 mb-2">
                          Phone
                        </label>
                        <input
                          type="tel"
                          id="customer_phone"
                          value={customerPhone}
                          onChange={(e) => setCustomerPhone(e.target.value)}
                          className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl text-sm text-gray-900 placeholder-gray-400 focus:ring-2 focus:ring-teal-500 focus:border-teal-500 transition-all"
                          placeholder="+1 (555) 123-4567"
                        />
                      </div>
                    </div>

                    <div>
                      <label htmlFor="notes" className="block text-sm font-semibold text-gray-900 mb-2">
                        Notes
                      </label>
                      <textarea
                        id="notes"
                        rows={3}
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                        className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl text-sm text-gray-900 placeholder-gray-400 focus:ring-2 focus:ring-teal-500 focus:border-teal-500 transition-all resize-none"
                        placeholder="Any special requests or notes..."
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Footer - Actions */}
          <div className="px-8 py-6 border-t border-gray-100 flex items-center justify-between gap-3">
            <div>
              {currentStep !== 'service' && (
                <button
                  onClick={goToPreviousStep}
                  disabled={loading}
                  className="px-5 py-2.5 text-sm font-semibold text-gray-700 hover:bg-gray-50 rounded-xl transition-all flex items-center gap-2"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                  Back
                </button>
              )}
            </div>

            <div className="flex gap-3">
              <button
                onClick={handleClose}
                disabled={loading}
                className="px-5 py-2.5 text-sm font-semibold text-gray-700 hover:bg-gray-50 rounded-xl transition-all disabled:opacity-50"
              >
                Cancel
              </button>

              {currentStep === 'customer' ? (
                <button
                  onClick={handleCreateAppointment}
                  disabled={loading || !customerName || !customerEmail}
                  className="px-6 py-3 bg-gradient-to-r from-teal-600 to-green-600 text-white rounded-2xl font-semibold hover:shadow-lg hover:scale-[1.02] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? 'Creating...' : 'Create Appointment'}
                </button>
              ) : (
                <button
                  onClick={goToNextStep}
                  disabled={
                    (currentStep === 'service' && !selectedService) ||
                    (currentStep === 'datetime' && !selectedSlot)
                  }
                  className="px-6 py-3 bg-gradient-to-r from-teal-600 to-green-600 text-white rounded-2xl font-semibold hover:shadow-lg hover:scale-[1.02] transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  Continue
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
