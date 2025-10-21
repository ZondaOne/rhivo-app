'use client';

import { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { Appointment } from '@/db/types';
import { formatTime, formatDate, snapToGrain } from '@/lib/calendar-utils';
import { apiRequest } from '@/lib/auth/api-client';
import { mapErrorToUserMessage } from '@/lib/errors/error-mapper';
import { useToast } from '@/hooks/useToast';
import { ToastContainer } from '@/components/ui/ToastContainer';

interface Service {
  id: string;
  name: string;
  duration_minutes: number;
  price_cents: number;
  color: string;
}

interface TimeSlot {
  start: string;
  end: string;
  available: boolean;
  capacity?: { current: number; max: number };
}

interface RescheduleAppointmentModalProps {
  appointment: Appointment;
  onClose: () => void;
  onSuccess: (updatedAppointment?: Appointment) => void;
}

export function RescheduleAppointmentModal({
  appointment,
  onClose,
  onSuccess,
}: RescheduleAppointmentModalProps) {
  const t = useTranslations('dashboard.rescheduleModal');
  const { toasts, showToast, removeToast } = useToast();
  const [loading, setLoading] = useState(false);
  const [loadingSlots, setLoadingSlots] = useState(false);

  // Services state
  const [services, setServices] = useState<Service[]>([]);
  const [selectedServiceId, setSelectedServiceId] = useState(appointment.service_id || '');

  // Date and time selection
  const currentStart = new Date(appointment.start_time);
  const [selectedDate, setSelectedDate] = useState<Date>(currentStart);
  const [availableSlots, setAvailableSlots] = useState<TimeSlot[]>([]);
  const [selectedSlot, setSelectedSlot] = useState<TimeSlot | null>(null);

  // Notification toggle
  const [notifyCustomer, setNotifyCustomer] = useState(true);

  // Computed values
  const selectedService = services.find(s => s.id === selectedServiceId);
  const currentEnd = new Date(appointment.end_time);
  const duration = Math.round((currentEnd.getTime() - currentStart.getTime()) / (1000 * 60));

  useEffect(() => {
    loadServices();
  }, []);

  useEffect(() => {
    if (selectedServiceId && selectedDate) {
      loadAvailableSlots();
    }
  }, [selectedServiceId, selectedDate]);

  async function loadServices() {
    try {
      const data = await apiRequest<Service[]>('/api/services');
      setServices(data);
    } catch (error) {
      console.error('Failed to load services:', error);
      showToast(t('errors.loadServices'), 'error');
    }
  }

  async function loadAvailableSlots() {
    if (!selectedServiceId) return;

    setLoadingSlots(true);
    try {
      const dateStr = selectedDate.toISOString().split('T')[0];
      const response = await apiRequest<{ slots: TimeSlot[] }>(
        `/api/appointments/available-slots?serviceId=${selectedServiceId}&date=${dateStr}`
      );
      setAvailableSlots(response.slots || []);
      setSelectedSlot(null); // Reset selection when slots change
    } catch (error) {
      console.error('Failed to load slots:', error);
      showToast(t('errors.loadSlots'), 'error');
      setAvailableSlots([]);
    } finally {
      setLoadingSlots(false);
    }
  }

  async function handleConfirmReschedule() {
    if (!selectedSlot) {
      showToast(t('validation.selectSlot'), 'warning');
      return;
    }

    const newStart = new Date(selectedSlot.start);
    const snappedTime = snapToGrain(newStart);

    // Check if time actually changed
    if (snappedTime.getTime() === currentStart.getTime() && selectedServiceId === appointment.service_id) {
      showToast(t('validation.noChanges'), 'info');
      onClose();
      return;
    }

    setLoading(true);

    try {
      const response = await apiRequest<{ success: boolean; appointment?: Appointment }>(
        '/api/appointments/reschedule',
        {
          method: 'POST',
          body: JSON.stringify({
            appointmentId: appointment.id,
            newStartTime: snappedTime.toISOString(),
            serviceId: selectedServiceId !== appointment.service_id ? selectedServiceId : undefined,
            notifyCustomer,
          }),
        }
      );

      showToast(t('success.rescheduled'), 'success');
      onSuccess(response.appointment);
    } catch (error) {
      console.error('Failed to reschedule appointment:', error);
      showToast(t('errors.rescheduleFailed'), 'error');
    } finally {
      setLoading(false);
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

  function formatDateShort(date: Date): string {
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  }

  function isToday(date: Date): boolean {
    const today = new Date();
    return date.toDateString() === today.toDateString();
  }

  function isSameDay(date1: Date, date2: Date): boolean {
    return date1.toDateString() === date2.toDateString();
  }

  return (
    <>
      <ToastContainer toasts={toasts} onRemove={removeToast} />

      {/* Mobile: Full-screen overlay, Tablet: 90% width, Desktop: Centered modal with max-width */}
      <div className="fixed inset-0 bg-gray-900/40 backdrop-blur-sm flex items-end sm:items-center justify-center z-50 sm:p-4">
        <div className="bg-white rounded-t-3xl sm:rounded-2xl shadow-2xl w-full sm:w-[90%] max-w-full sm:max-w-xl md:max-w-2xl lg:max-w-3xl max-h-[95vh] sm:max-h-[90vh] overflow-hidden flex flex-col animate-slide-up sm:animate-none">
          {/* Header */}
          <div className="px-4 sm:px-6 lg:px-8 py-4 sm:py-5 lg:py-6 border-b border-gray-100">
            <div className="flex items-center justify-between">
              <div className="flex-1 min-w-0">
                <h2 className="text-xl sm:text-2xl font-bold text-gray-900 tracking-tight truncate">{t('title')}</h2>
                <p className="text-xs sm:text-sm text-gray-500 mt-1 truncate">{t('subtitle')}</p>
              </div>
              <button
                onClick={onClose}
                className="ml-3 w-10 h-10 flex-shrink-0 flex items-center justify-center rounded-full hover:bg-gray-100 text-gray-400 hover:text-gray-900 transition-all"
              >
                <svg className="w-5 h-5 sm:w-6 sm:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>

          {/* Content - Scrollable */}
          <div className="flex-1 overflow-y-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-5 lg:py-6 modal-scroll">
            <div className="space-y-4 sm:space-y-6">
              {/* Current Appointment Info */}
              <div className="bg-gray-50 border border-gray-100 rounded-xl p-4 sm:p-5 lg:p-6">
                <div className="flex flex-col sm:flex-row items-start justify-between gap-3 sm:gap-4">
                  <div className="flex-1">
                    <div className="text-[10px] sm:text-xs font-semibold uppercase tracking-wider text-gray-500 mb-1 sm:mb-2">
                      {t('current.title')}
                    </div>
                    <div className="text-base sm:text-lg font-bold text-gray-900">
                      {t('current.service')}
                    </div>
                    <div className="text-xs sm:text-sm text-gray-500 mt-1">
                      {appointment.customer_name || t('current.guest')} · {duration} {t('current.minutes')}
                    </div>
                  </div>
                  <div className="text-left sm:text-right w-full sm:w-auto">
                    <div className="text-xs sm:text-sm font-semibold text-gray-900">
                      {formatDate(currentStart, 'long')}
                    </div>
                    <div className="text-base sm:text-lg font-bold text-gray-900 mt-0.5 sm:mt-1">
                      {formatTime(currentStart)} - {formatTime(currentEnd)}
                    </div>
                  </div>
                </div>
              </div>

              {/* Service Selector (optional - can change service during reschedule) */}
              {services.length > 1 && (
                <div>
                  <label className="block text-xs sm:text-sm font-bold text-gray-900 uppercase tracking-wider mb-2 sm:mb-3">
                    {t('service.label')}
                  </label>
                  <select
                    value={selectedServiceId}
                    onChange={(e) => setSelectedServiceId(e.target.value)}
                    className="w-full px-3 sm:px-4 py-2.5 sm:py-3 bg-white border border-gray-200 rounded-xl text-sm text-gray-900 focus:ring-2 focus:ring-teal-500 focus:border-teal-500 transition-all appearance-none bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTIiIGhlaWdodD0iOCIgdmlld0JveD0iMCAwIDEyIDgiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PHBhdGggZD0iTTEgMS41TDYgNi41TDExIDEuNSIgc3Ryb2tlPSIjNkI3MjgwIiBzdHJva2Utd2lkdGg9IjIiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIgc3Ryb2tlLWxpbmVqb2luPSJyb3VuZCIvPjwvc3ZnPg==')] bg-[length:12px] bg-[right_1rem_center] bg-no-repeat pr-10"
                  >
                    {services.map(service => (
                      <option key={service.id} value={service.id}>
                        {service.name} ({service.duration_minutes} min)
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Date Selector - Horizontal Scroll */}
              <div>
                <label className="block text-xs sm:text-sm font-bold text-gray-900 uppercase tracking-wider mb-2 sm:mb-3">
                  {t('date.label')}
                </label>
                <div className="relative">
                  <div className="flex gap-1.5 sm:gap-2 overflow-x-auto pb-2 scrollbar-thin">
                    {getDateRange().map((date) => {
                      const isSelected = isSameDay(date, selectedDate);
                      const isCurrentDay = isToday(date);

                      return (
                        <button
                          key={date.toISOString()}
                          onClick={() => setSelectedDate(date)}
                          className={`
                            flex-shrink-0 flex flex-col items-center justify-center px-3 sm:px-4 py-2.5 sm:py-3 rounded-xl border-2 transition-all min-w-[64px] sm:min-w-[80px]
                            ${isSelected
                              ? 'bg-gradient-to-br from-teal-600 to-green-600 border-teal-600 text-white shadow-lg'
                              : 'bg-white border-gray-200 text-gray-900 hover:border-teal-300 hover:bg-teal-50 active:scale-95'
                            }
                          `}
                        >
                          <div className={`text-[10px] sm:text-xs font-semibold uppercase tracking-wider ${isSelected ? 'text-white/80' : 'text-gray-500'}`}>
                            {date.toLocaleDateString('en-US', { weekday: 'short' })}
                          </div>
                          <div className={`text-base sm:text-lg font-bold mt-0.5 sm:mt-1 ${isSelected ? 'text-white' : 'text-gray-900'}`}>
                            {date.getDate()}
                          </div>
                          {isCurrentDay && !isSelected && (
                            <div className="w-1.5 h-1.5 rounded-full bg-teal-600 mt-0.5 sm:mt-1" />
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Time Slots */}
              <div>
                <div className="flex items-center justify-between mb-2 sm:mb-3">
                  <label className="text-xs sm:text-sm font-bold text-gray-900 uppercase tracking-wider">
                    {t('time.label')}
                  </label>
                  {selectedService && (
                    <span className="text-[10px] sm:text-xs text-gray-500">
                      {selectedService.duration_minutes} min
                    </span>
                  )}
                </div>

                {loadingSlots ? (
                  <div className="flex items-center justify-center py-8 sm:py-12">
                    <div className="animate-spin rounded-full h-6 w-6 sm:h-8 sm:w-8 border-b-2 border-teal-600" />
                  </div>
                ) : availableSlots.length === 0 ? (
                  <div className="text-center py-8 sm:py-12 bg-gray-50 border border-gray-100 rounded-xl">
                    <svg className="w-10 h-10 sm:w-12 sm:h-12 text-gray-300 mx-auto mb-2 sm:mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <p className="text-xs sm:text-sm font-semibold text-gray-900">{t('time.noSlots')}</p>
                    <p className="text-[10px] sm:text-xs text-gray-500 mt-1">{t('time.noSlotsHint')}</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-5 gap-1.5 sm:gap-2 max-h-[240px] sm:max-h-[300px] overflow-y-auto">
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
                            px-2 sm:px-4 py-2.5 sm:py-3 rounded-xl text-xs sm:text-sm font-semibold transition-all active:scale-95
                            ${isSelected
                              ? 'bg-gradient-to-br from-teal-600 to-green-600 text-white shadow-lg'
                              : isAvailable
                                ? 'bg-white border border-gray-200 text-gray-900 hover:border-teal-300 hover:bg-teal-50'
                                : 'bg-gray-50 border border-gray-100 text-gray-400 cursor-not-allowed'
                            }
                          `}
                        >
                          {formatTime(slotStart)}
                          {slot.capacity && isAvailable && !isSelected && (
                            <div className="text-[10px] text-gray-500 mt-0.5 hidden sm:block">
                              {slot.capacity.current}/{slot.capacity.max}
                            </div>
                          )}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Selected Slot Preview */}
              {selectedSlot && selectedService && (
                <div className="bg-teal-50 border border-teal-200 rounded-xl p-3 sm:p-4">
                  <div className="flex items-start gap-2 sm:gap-3">
                    <svg className="w-4 h-4 sm:w-5 sm:h-5 text-teal-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <div className="flex-1 min-w-0">
                      <div className="text-xs sm:text-sm font-semibold text-gray-900">{t('preview.title')}</div>
                      <div className="text-xs sm:text-sm text-gray-700 mt-0.5 sm:mt-1">
                        {formatDate(selectedDate, 'long')} {t('preview.at')} {formatTime(new Date(selectedSlot.start))} - {formatTime(new Date(selectedSlot.end))}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Notification Toggle */}
              <div className="flex items-center gap-2 sm:gap-3 p-3 sm:p-4 bg-gray-50 border border-gray-100 rounded-xl">
                <input
                  type="checkbox"
                  id="notifyCustomer"
                  checked={notifyCustomer}
                  onChange={(e) => setNotifyCustomer(e.target.checked)}
                  className="w-4 h-4 sm:w-5 sm:h-5 text-teal-600 border-gray-300 rounded focus:ring-teal-500"
                />
                <label htmlFor="notifyCustomer" className="flex-1 text-xs sm:text-sm font-semibold text-gray-900">
                  {t('notification.label')}
                </label>
              </div>
            </div>
          </div>

          {/* Footer - Action Buttons (Sticky on Mobile) */}
          <div className="px-4 sm:px-6 lg:px-8 py-4 sm:py-5 lg:py-6 border-t border-gray-100 flex items-center justify-end gap-2 sm:gap-3 bg-white">
            <button
              onClick={onClose}
              disabled={loading}
              className="px-4 sm:px-5 py-2 sm:py-2.5 text-xs sm:text-sm font-semibold text-gray-700 hover:bg-gray-50 rounded-xl transition-all disabled:opacity-50"
            >
              {t('buttons.cancel')}
            </button>
            <button
              onClick={handleConfirmReschedule}
              disabled={loading || !selectedSlot}
              className="px-5 sm:px-6 py-2.5 sm:py-3 bg-gradient-to-r from-teal-600 to-green-600 text-white rounded-xl sm:rounded-2xl text-xs sm:text-base font-semibold hover:shadow-lg hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? t('buttons.confirming') : t('buttons.confirm')}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
