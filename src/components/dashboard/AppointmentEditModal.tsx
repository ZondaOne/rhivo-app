'use client';

import { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { Appointment } from '@/db/types';
import { formatTime, snapToGrain, GRAIN_MINUTES } from '@/lib/calendar-utils';
import { apiRequest } from '@/lib/auth/api-client';
import { mapErrorToUserMessage } from '@/lib/errors/error-mapper';
import { useToast } from '@/hooks/useToast';
import { ToastContainer } from '@/components/ui/ToastContainer';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';

interface Service {
  id: string;
  name: string;
  duration_minutes: number;
  price_cents: number;
  color: string;
  category_name: string;
}

interface AppointmentEditModalProps {
  appointment: Appointment;
  onClose: () => void;
  onSave: (updatedAppointment?: Appointment) => void;
}

export function AppointmentEditModal({ appointment, onClose, onSave }: AppointmentEditModalProps) {
  const t = useTranslations('dashboard.appointmentEdit');
  const { toasts, showToast, removeToast } = useToast();
  const [loading, setLoading] = useState(false);
  const [services, setServices] = useState<Service[]>([]);
  const [notifyCustomer, setNotifyCustomer] = useState(true);

  // Confirmation dialogs
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);
  const [showSaveConfirm, setShowSaveConfirm] = useState(false);
  const [pendingSaveData, setPendingSaveData] = useState<any>(null);

  // Form state
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [availableSlots, setAvailableSlots] = useState<{ start: string; end: string; available: boolean }[]>([]);
  const [selectedSlot, setSelectedSlot] = useState<{ start: string; end: string; available: boolean } | null>(null);
  const [selectedServiceId, setSelectedServiceId] = useState<string>('');
  const [customerName, setCustomerName] = useState('');
  const [customerEmail, setCustomerEmail] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [notes, setNotes] = useState('');
  const [status, setStatus] = useState<string>('confirmed');
  const [currentWeekStart, setCurrentWeekStart] = useState<Date>(new Date());
  const [dateAvailability, setDateAvailability] = useState<Map<string, boolean>>(new Map());
  const [loadingAvailability, setLoadingAvailability] = useState(false);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [touchStart, setTouchStart] = useState<number | null>(null);
  const [touchEnd, setTouchEnd] = useState<number | null>(null);

  // Computed values
  const selectedService = services.find(s => s.id === selectedServiceId);

  useEffect(() => {
    loadServices();

    // Initialize form with appointment data
    const startDate = new Date(appointment.start_time);
    setSelectedDate(startDate);
    setCurrentWeekStart(getWeekStart(startDate));
    setSelectedServiceId(appointment.service_id || '');
    setCustomerName(appointment.customer_name || '');
    setCustomerEmail(appointment.customer_email || appointment.guest_email || '');
    setCustomerPhone(appointment.customer_phone || appointment.guest_phone || '');
    setNotes(appointment.notes || '');
    setStatus(appointment.status);
  }, [appointment]);

  useEffect(() => {
    if (selectedServiceId && selectedDate) {
      loadAvailableSlots();
    }
  }, [selectedServiceId, selectedDate]);

  useEffect(() => {
    if (selectedServiceId) {
      loadWeekAvailability();
    }
  }, [selectedServiceId, currentWeekStart]);

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
      const year = selectedDate.getFullYear();
      const month = String(selectedDate.getMonth() + 1).padStart(2, '0');
      const day = String(selectedDate.getDate()).padStart(2, '0');
      const dateStr = `${year}-${month}-${day}`;

      const response = await apiRequest<{ slots: { start: string; end: string; available: boolean }[] }>(
        `/api/appointments/available-slots?serviceId=${selectedServiceId}&date=${dateStr}`
      );
      setAvailableSlots(response.slots || []);
      setSelectedSlot(null);
    } catch (error) {
      console.error('Failed to load slots:', error);
      showToast(t('errors.loadSlots'), 'error');
      setAvailableSlots([]);
    } finally {
      setLoadingSlots(false);
    }
  }

  function getWeekStart(date: Date): Date {
    const d = new Date(date);
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1);
    const weekStart = new Date(d.setDate(diff));
    weekStart.setHours(0, 0, 0, 0);
    return weekStart;
  }

  function getWeekDates(weekStart: Date): Date[] {
    const dates: Date[] = [];
    for (let i = 0; i < 7; i++) {
      const date = new Date(weekStart);
      date.setDate(weekStart.getDate() + i);
      dates.push(date);
    }
    return dates;
  }

  function goToPreviousWeek() {
    const newWeekStart = new Date(currentWeekStart);
    newWeekStart.setDate(currentWeekStart.getDate() - 7);
    setCurrentWeekStart(newWeekStart);
  }

  function goToNextWeek() {
    const newWeekStart = new Date(currentWeekStart);
    newWeekStart.setDate(currentWeekStart.getDate() + 7);
    setCurrentWeekStart(newWeekStart);
  }

  function goToCurrentWeek() {
    const today = new Date();
    setCurrentWeekStart(getWeekStart(today));
    setSelectedDate(today);
  }

  async function loadWeekAvailability() {
    if (!selectedServiceId) return;

    setLoadingAvailability(true);
    const weekDates = getWeekDates(currentWeekStart);
    const availabilityMap = new Map<string, boolean>();

    try {
      const availabilityPromises = weekDates.map(async (date) => {
        try {
          const year = date.getFullYear();
          const month = String(date.getMonth() + 1).padStart(2, '0');
          const day = String(date.getDate()).padStart(2, '0');
          const dateStr = `${year}-${month}-${day}`;

          const response = await apiRequest<{ slots: { start: string; end: string; available: boolean }[] }>(
            `/api/appointments/available-slots?serviceId=${selectedServiceId}&date=${dateStr}`
          );

          const hasAvailableSlots = response.slots.some(slot => slot.available);
          return { dateStr, hasAvailableSlots };
        } catch (error) {
          console.error(`Failed to load availability for ${date.toISOString()}:`, error);
          return { dateStr: '', hasAvailableSlots: false };
        }
      });

      const results = await Promise.all(availabilityPromises);
      results.forEach(({ dateStr, hasAvailableSlots }) => {
        if (dateStr) {
          availabilityMap.set(dateStr, hasAvailableSlots);
        }
      });

      setDateAvailability(availabilityMap);
    } catch (error) {
      console.error('Failed to load week availability:', error);
    } finally {
      setLoadingAvailability(false);
    }
  }

  function handleTouchStart(e: React.TouchEvent) {
    setTouchEnd(null);
    setTouchStart(e.targetTouches[0].clientX);
  }

  function handleTouchMove(e: React.TouchEvent) {
    setTouchEnd(e.targetTouches[0].clientX);
  }

  function handleTouchEnd() {
    if (!touchStart || !touchEnd) return;

    const distance = touchStart - touchEnd;
    const isLeftSwipe = distance > 50;
    const isRightSwipe = distance < -50;

    if (isLeftSwipe) {
      goToNextWeek();
    } else if (isRightSwipe) {
      goToPreviousWeek();
    }
  }

  function formatDateKey(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  function getMonthLabel(dates: Date[]): string {
    if (dates.length === 0) return '';

    const firstDate = dates[0];
    const lastDate = dates[dates.length - 1];

    const firstMonth = firstDate.toLocaleDateString('en', { month: 'long', year: 'numeric' });
    const lastMonth = lastDate.toLocaleDateString('en', { month: 'long', year: 'numeric' });

    if (firstMonth === lastMonth) {
      return firstMonth;
    } else {
      return `${firstDate.toLocaleDateString('en', { month: 'short' })} - ${lastDate.toLocaleDateString('en', { month: 'short', year: 'numeric' })}`;
    }
  }

  function isToday(date: Date): boolean {
    const today = new Date();
    return date.toDateString() === today.toDateString();
  }

  function isSameDay(date1: Date, date2: Date): boolean {
    return date1.toDateString() === date2.toDateString();
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!selectedSlot || !selectedServiceId) {
      showToast(t('validation.fillRequired'), 'warning');
      return;
    }

    const newStartTime = new Date(selectedSlot.start);
    const snappedTime = snapToGrain(newStartTime);

    const originalStart = new Date(appointment.start_time);
    const timeChanged = snappedTime.getTime() !== originalStart.getTime();
    const serviceChanged = selectedServiceId !== appointment.service_id;

    if (!timeChanged && !serviceChanged) {
      // No changes made
      showToast(t('validation.noChanges'), 'info');
      onSave();
      return;
    }

    // Store save data and show confirmation
    setPendingSaveData({
      appointmentId: appointment.id,
      newStartTime: snappedTime.toISOString(),
      serviceId: selectedServiceId !== appointment.service_id ? selectedServiceId : undefined,
      notifyCustomer,
      timeChanged,
      serviceChanged,
    });
    setShowSaveConfirm(true);
  }

  async function confirmSave() {
    if (!pendingSaveData) return;

    setLoading(true);
    setShowSaveConfirm(false);

    try {
      const response = await apiRequest<{ success: boolean; appointment?: Appointment }>('/api/appointments/reschedule', {
        method: 'POST',
        body: JSON.stringify(pendingSaveData),
      });

      showToast(t('success.updated'), 'success');
      onSave(response.appointment);
    } catch (error) {
      console.error('Failed to update appointment:', error);
      showToast(t('errors.updateFailed'), 'error');
    } finally {
      setLoading(false);
      setPendingSaveData(null);
    }
  }

  function handleDelete() {
    setShowCancelConfirm(true);
  }

  async function confirmCancel() {
    setLoading(true);
    setShowCancelConfirm(false);

    try {
      // Use PATCH to update status to 'cancelled' which also sets deleted_at
      // This is a soft delete that maintains data integrity and audit trail
      await apiRequest(`/api/appointments/${appointment.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ status: 'cancelled' }),
      });

      console.log('[AppointmentEditModal] Appointment deleted successfully, closing modal and triggering reload');
      
      showToast(t('success.cancelled'), 'success');
      
      // Close modal first, then trigger parent reload
      onClose();
      
      // Pass undefined to signal the parent to reload appointments
      // since the appointment is now deleted (soft delete with deleted_at set)
      onSave(undefined);
    } catch (error) {
      console.error('Failed to cancel appointment:', error);
      showToast(t('errors.cancelFailed'), 'error');
    } finally {
      setLoading(false);
    }
  }


  const getSaveConfirmationMessage = () => {
    if (!pendingSaveData) return '';

    if (pendingSaveData.timeChanged && pendingSaveData.serviceChanged) {
      return t('confirmations.saveMessageBoth');
    } else if (pendingSaveData.timeChanged) {
      return t('confirmations.saveMessageTimeChange');
    } else if (pendingSaveData.serviceChanged) {
      return t('confirmations.saveMessageServiceChange');
    }
    return '';
  };

  return (
    <>
      <ToastContainer toasts={toasts} onRemove={removeToast} />

      <ConfirmDialog
        isOpen={showCancelConfirm}
        onClose={() => setShowCancelConfirm(false)}
        onConfirm={confirmCancel}
        title={t('confirmations.deleteTitle')}
        message={t('confirmations.deleteMessage')}
        confirmText={t('confirmations.deleteConfirm')}
        cancelText={t('confirmations.deleteCancel')}
        variant="danger"
        isLoading={loading}
      />

      <ConfirmDialog
        isOpen={showSaveConfirm}
        onClose={() => {
          setShowSaveConfirm(false);
          setPendingSaveData(null);
        }}
        onConfirm={confirmSave}
        title={t('confirmations.saveTitle')}
        message={getSaveConfirmationMessage()}
        confirmText={t('confirmations.saveConfirm')}
        cancelText={t('confirmations.saveCancel')}
        variant="warning"
        isLoading={loading}
      />

      <div className="fixed inset-0 bg-gray-900/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="px-8 py-6 border-b border-gray-100">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-bold text-gray-900 tracking-tight">{t('title')}</h2>
            <button
              onClick={onClose}
              className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-gray-100 text-gray-400 hover:text-gray-900 transition-all"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Form - Scrollable */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto px-8 py-6">
          <div className="space-y-8">
            {/* Date & Time Section */}
            <div className="space-y-4">
              <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider">{t('schedule.title')}</h3>

              {/* Week Navigation */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <label className="text-xs sm:text-sm font-bold text-gray-900 uppercase tracking-wider">
                    {t('schedule.date')}
                  </label>
                  <button
                    type="button"
                    onClick={goToCurrentWeek}
                    className="text-[10px] sm:text-xs font-semibold text-teal-600 hover:text-teal-700 px-2 py-1 hover:bg-teal-50 rounded-lg transition-all"
                  >
                    {t('schedule.today', 'Today')}
                  </button>
                </div>

                {/* Month Label */}
                <div className="flex items-center justify-between mb-2">
                  <button
                    type="button"
                    onClick={goToPreviousWeek}
                    className="p-2 hover:bg-gray-100 rounded-lg transition-all flex-shrink-0"
                    aria-label="Previous week"
                  >
                    <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                    </svg>
                  </button>

                  <div className="text-sm sm:text-base font-semibold text-gray-700 text-center">
                    {getMonthLabel(getWeekDates(currentWeekStart))}
                  </div>

                  <button
                    type="button"
                    onClick={goToNextWeek}
                    className="p-2 hover:bg-gray-100 rounded-lg transition-all flex-shrink-0"
                    aria-label="Next week"
                  >
                    <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </button>
                </div>

                {/* Week View with Swipe Support */}
                <div
                  className="relative touch-pan-y"
                  onTouchStart={handleTouchStart}
                  onTouchMove={handleTouchMove}
                  onTouchEnd={handleTouchEnd}
                >
                  {/* Loading Overlay */}
                  {loadingAvailability && (
                    <div className="absolute inset-0 bg-white/60 backdrop-blur-[2px] z-10 flex items-center justify-center rounded-xl">
                      <div className="flex flex-col items-center gap-2">
                        <div className="relative w-8 h-8">
                          <div className="absolute inset-0 border-3 border-teal-200 rounded-full" />
                          <div className="absolute inset-0 border-3 border-teal-600 rounded-full border-t-transparent animate-spin" />
                        </div>
                        <span className="text-xs text-gray-600 font-medium">Loading...</span>
                      </div>
                    </div>
                  )}

                  <div className={`grid grid-cols-7 gap-1 sm:gap-2 transition-opacity ${loadingAvailability ? 'opacity-40' : 'opacity-100'}`}>
                    {getWeekDates(currentWeekStart).map((date) => {
                      const isSelected = isSameDay(date, selectedDate);
                      const isCurrentDay = isToday(date);
                      const dateKey = formatDateKey(date);
                      const hasAvailability = dateAvailability.get(dateKey);
                      const isPast = date < new Date(new Date().setHours(0, 0, 0, 0));
                      const isDisabled = isPast || (hasAvailability === false && !loadingAvailability);

                      return (
                        <button
                          type="button"
                          key={date.toISOString()}
                          onClick={() => !isDisabled && setSelectedDate(date)}
                          disabled={isDisabled || loadingAvailability}
                          className={`
                            relative flex flex-col items-center justify-center px-1 sm:px-2 py-3 sm:py-4 rounded-xl border-2 transition-all duration-200
                            ${isSelected
                              ? 'bg-teal-600 border-teal-600 text-white shadow-md scale-105'
                              : isDisabled
                                ? 'bg-gray-50 border-gray-100 text-gray-300 cursor-not-allowed'
                                : 'bg-white border-gray-200 text-gray-900 hover:border-teal-400 hover:bg-gradient-to-br hover:from-teal-50 hover:to-green-50 hover:shadow-md active:scale-95'
                            }
                          `}
                        >
                          {/* Weekday */}
                          <div className={`text-[9px] sm:text-[10px] font-semibold uppercase tracking-wider mb-0.5 sm:mb-1 ${isSelected ? 'text-white/90' : isDisabled ? 'text-gray-300' : 'text-gray-500'}`}>
                            {date.toLocaleDateString('en', { weekday: 'short' })}
                          </div>

                          {/* Date Number */}
                          <div className={`text-sm sm:text-lg font-bold ${isSelected ? 'text-white' : isDisabled ? 'text-gray-300' : 'text-gray-900'}`}>
                            {date.getDate()}
                          </div>

                          {/* Availability Badge */}
                          {!isSelected && !isDisabled && hasAvailability && (
                            <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-8 sm:w-10 h-0.5 bg-gradient-to-r from-teal-400 to-green-400 rounded-t-full" />
                          )}

                          {/* Today Indicator */}
                          {isCurrentDay && !isSelected && (
                            <div className="absolute inset-0 border-2 border-teal-500 rounded-xl pointer-events-none" />
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Time Slots */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs sm:text-sm font-bold text-gray-900 uppercase tracking-wider">
                    {t('schedule.startTime')}
                  </label>
                  {selectedService && (
                    <span className="text-[10px] sm:text-xs text-gray-500">
                      {selectedService.duration_minutes} min
                    </span>
                  )}
                </div>

                {loadingSlots ? (
                  <div className="flex items-center justify-center py-8">
                    <div className="animate-spin rounded-full h-6 w-6 sm:h-8 sm:w-8 border-b-2 border-teal-600" />
                  </div>
                ) : availableSlots.length === 0 ? (
                  <div className="text-center py-8 bg-gray-50 border border-gray-100 rounded-xl">
                    <svg className="w-10 h-10 sm:w-12 sm:h-12 text-gray-300 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <p className="text-xs sm:text-sm font-semibold text-gray-900">No slots available</p>
                    <p className="text-[10px] sm:text-xs text-gray-500 mt-1">Try selecting another date</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-5 gap-1.5 sm:gap-2 max-h-[240px] overflow-y-auto">
                    {availableSlots.map((slot, index) => {
                      const slotStart = new Date(slot.start);
                      const isSelected = selectedSlot?.start === slot.start;
                      const isAvailable = slot.available;

                      return (
                        <button
                          type="button"
                          key={index}
                          onClick={() => isAvailable && setSelectedSlot(slot)}
                          disabled={!isAvailable}
                          className={`
                            relative px-2 sm:px-4 py-2.5 sm:py-3 rounded-xl text-xs sm:text-sm font-semibold transition-all duration-200 active:scale-95
                            ${isSelected
                              ? 'bg-teal-600 text-white shadow-md border-2 border-teal-600'
                              : isAvailable
                                ? 'bg-white border-2 border-gray-200 text-gray-900 hover:border-teal-400 hover:bg-teal-50 hover:shadow-sm'
                                : 'bg-gray-50 border-2 border-gray-100 text-gray-400 cursor-not-allowed'
                            }
                          `}
                        >
                          {formatTime(slotStart, 'en')}
                          {/* Checkmark for selected slot */}
                          {isSelected && (
                            <svg className="absolute top-0.5 right-0.5 w-3 h-3 sm:w-3.5 sm:h-3.5 text-white" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                            </svg>
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
                      <div className="text-xs sm:text-sm font-semibold text-gray-900">Selected time</div>
                      <div className="text-xs sm:text-sm text-gray-700 mt-0.5 sm:mt-1">
                        {formatDate(selectedDate, 'long', 'en')} at {formatTime(new Date(selectedSlot.start), 'en')} - {formatTime(new Date(selectedSlot.end), 'en')}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Service Section */}
            <div className="space-y-4">
              <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider">{t('service.title')}</h3>

              <div>
                <select
                  value={selectedServiceId}
                  onChange={(e) => setSelectedServiceId(e.target.value)}
                  className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl text-sm text-gray-900 focus:ring-2 focus:ring-teal-500 focus:border-teal-500 transition-all appearance-none bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTIiIGhlaWdodD0iOCIgdmlld0JveD0iMCAwIDEyIDgiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PHBhdGggZD0iTTEgMS41TDYgNi41TDExIDEuNSIgc3Ryb2tlPSIjNkI3MjgwIiBzdHJva2Utd2lkdGg9IjIiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIgc3Ryb2tlLWxpbmVqb2luPSJyb3VuZCIvPjwvc3ZnPg==')] bg-[length:12px] bg-[right_1rem_center] bg-no-repeat pr-10"
                  required
                >
                  <option value="">{t('service.select')}</option>
                  {services.map(service => (
                    <option key={service.id} value={service.id}>
                      {service.name} ({service.duration_minutes} min)
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Customer Information Section */}
            <div className="space-y-4">
              <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider">{t('customer.title')}</h3>

              <div>
                <label className="block text-sm font-semibold text-gray-900 mb-2">
                  {t('customer.name')}
                </label>
                <input
                  type="text"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl text-sm text-gray-900 placeholder-gray-400 focus:ring-2 focus:ring-teal-500 focus:border-teal-500 transition-all"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-900 mb-2">
                    {t('customer.email')}
                  </label>
                  <input
                    type="email"
                    value={customerEmail}
                    onChange={(e) => setCustomerEmail(e.target.value)}
                    className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl text-sm text-gray-900 placeholder-gray-400 focus:ring-2 focus:ring-teal-500 focus:border-teal-500 transition-all"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-900 mb-2">
                    {t('customer.phone')}
                  </label>
                  <input
                    type="tel"
                    value={customerPhone}
                    onChange={(e) => setCustomerPhone(e.target.value)}
                    className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl text-sm text-gray-900 placeholder-gray-400 focus:ring-2 focus:ring-teal-500 focus:border-teal-500 transition-all"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-900 mb-2">
                  {t('customer.notes')}
                </label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={3}
                  className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl text-sm text-gray-900 placeholder-gray-400 focus:ring-2 focus:ring-teal-500 focus:border-teal-500 transition-all resize-none"
                  placeholder={t('customer.notesPlaceholder')}
                />
              </div>
            </div>

            {/* Notification Toggle */}
            <div className="flex items-center gap-3 p-4 bg-gray-50 border border-gray-100 rounded-xl">
              <input
                type="checkbox"
                id="notifyCustomer"
                checked={notifyCustomer}
                onChange={(e) => setNotifyCustomer(e.target.checked)}
                className="w-5 h-5 text-teal-600 border-gray-300 rounded focus:ring-teal-500"
              />
              <label htmlFor="notifyCustomer" className="flex-1 text-sm font-semibold text-gray-900">
                {t('notification.label')}
              </label>
            </div>
          </div>
        </form>

        {/* Footer - Action Buttons */}
        <div className="px-8 py-6 border-t border-gray-100 flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={handleDelete}
            disabled={loading || status === 'canceled'}
            className="px-5 py-2.5 text-sm font-semibold text-red-700 hover:bg-red-50 rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            title={status === 'canceled' ? 'Appointment is already cancelled' : 'Cancel this appointment'}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
            {t('buttons.deleteAppointment')}
          </button>

          <div className="flex gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="px-5 py-2.5 text-sm font-semibold text-gray-700 hover:bg-gray-50 rounded-xl transition-all disabled:opacity-50"
            >
              {t('buttons.close')}
            </button>
            <button
              onClick={handleSubmit}
              disabled={loading}
              className="px-6 py-3 bg-gradient-to-r from-teal-600 to-green-600 text-white rounded-2xl font-semibold hover:shadow-lg hover:scale-[1.02] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? t('buttons.saving') : t('buttons.saveChanges')}
            </button>
          </div>
        </div>
      </div>
    </div>
    </>
  );
}
