"use client";

import { useState, useEffect } from 'react';
import { useTranslations, useLocale } from 'next-intl';

interface TimeSlot {
  start: string;
  end: string;
  available: boolean;
  capacity: number;
  totalCapacity: number;
  reason?: string;
}

interface GuestRescheduleModalProps {
  bookingId: string;
  subdomain: string;
  serviceName: string;
  serviceId: string;
  currentStartTime: string;
  currentEndTime: string;
  duration: number;
  token: string;
  onClose: () => void;
  onSuccess: () => void;
}

export default function GuestRescheduleModal({
  bookingId,
  subdomain,
  serviceName,
  serviceId,
  currentStartTime,
  currentEndTime,
  duration,
  token,
  onClose,
  onSuccess,
}: GuestRescheduleModalProps) {
  const t = useTranslations('manageBooking.reschedule');
  const tDetails = useTranslations('manageBooking.details');
  const locale = useLocale();

  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [currentWeekStart, setCurrentWeekStart] = useState<Date>(new Date());
  const [availableSlots, setAvailableSlots] = useState<TimeSlot[]>([]);
  const [selectedSlot, setSelectedSlot] = useState<TimeSlot | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [loadingAvailability, setLoadingAvailability] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [tokenInvalidated, setTokenInvalidated] = useState(false);
  const [dateAvailability, setDateAvailability] = useState<Map<string, boolean>>(new Map());
  const [touchStart, setTouchStart] = useState<number | null>(null);
  const [touchEnd, setTouchEnd] = useState<number | null>(null);

  // Initialize with current date
  useEffect(() => {
    const currentDate = new Date(currentStartTime);
    setSelectedDate(currentDate);
    setCurrentWeekStart(getWeekStart(currentDate));
  }, [currentStartTime]);

  // Fetch available slots when date changes
  useEffect(() => {
    if (selectedDate) {
      fetchAvailableSlots();
    }
  }, [selectedDate]);

  // Fetch week availability when week changes
  useEffect(() => {
    loadWeekAvailability();
  }, [currentWeekStart]);

  function getWeekStart(date: Date): Date {
    const d = new Date(date);
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1); // Adjust when day is Sunday
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

    const firstMonth = firstDate.toLocaleDateString(locale, { month: 'long', year: 'numeric' });
    const lastMonth = lastDate.toLocaleDateString(locale, { month: 'long', year: 'numeric' });

    if (firstMonth === lastMonth) {
      return firstMonth;
    } else {
      return `${firstDate.toLocaleDateString(locale, { month: 'short' })} - ${lastDate.toLocaleDateString(locale, { month: 'short', year: 'numeric' })}`;
    }
  }

  function isToday(date: Date): boolean {
    const today = new Date();
    return date.toDateString() === today.toDateString();
  }

  function isSameDay(date1: Date, date2: Date): boolean {
    return date1.toDateString() === date2.toDateString();
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

  async function loadWeekAvailability() {
    setLoadingAvailability(true);
    const weekDates = getWeekDates(currentWeekStart);
    const availabilityMap = new Map<string, boolean>();

    try {
      const availabilityPromises = weekDates.map(async (date) => {
        try {
          const dateStr = formatDateKey(date);
          const response = await fetch(
            `/api/booking/slots?subdomain=${subdomain}&serviceId=${serviceId}&startDate=${dateStr}&endDate=${dateStr}`
          );

          const data = await response.json();

          if (!response.ok) {
            return { dateStr, hasAvailableSlots: false };
          }

          const hasAvailableSlots = data.slots?.some((slot: TimeSlot) => slot.available) || false;
          return { dateStr, hasAvailableSlots };
        } catch (error) {
          console.error(`Failed to load availability for ${date.toISOString()}:`, error);
          return { dateStr: formatDateKey(date), hasAvailableSlots: false };
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

  async function fetchAvailableSlots() {
    if (!selectedDate) return;

    setLoadingSlots(true);
    setError(null);
    setSelectedSlot(null);

    try {
      if (!serviceId || serviceId === 'unknown') {
        throw new Error(t('serviceMissing'));
      }

      const dateStr = formatDateKey(selectedDate);
      const response = await fetch(
        `/api/booking/slots?subdomain=${subdomain}&serviceId=${serviceId}&startDate=${dateStr}&endDate=${dateStr}`
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || t('loadSlotsError'));
      }

      setAvailableSlots(data.slots || []);
    } catch (err: any) {
      setError(err.message || t('loadSlotsError'));
    } finally {
      setLoadingSlots(false);
    }
  }

  async function handleReschedule() {
    if (!selectedSlot) {
      setError(t('selectSlotError'));
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/booking/guest-appointment/${bookingId}/reschedule`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          token,
          newSlotStart: selectedSlot.start,
          newSlotEnd: selectedSlot.end,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || t('rescheduleError'));
      }

      if (data.tokenInvalidated) {
        setTokenInvalidated(true);
      }

      onSuccess();
    } catch (err: any) {
      setError(err.message || t('rescheduleError'));
    } finally {
      setLoading(false);
    }
  }

  function formatTime(isoString: string): string {
    const date = new Date(isoString);
    return date.toLocaleTimeString(locale, {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
  }

  function formatDate(date: Date): string {
    return date.toLocaleDateString(locale, {
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    });
  }

  function formatDateLong(isoString: string): string {
    const date = new Date(isoString);
    return date.toLocaleDateString(locale, {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    });
  }

  // Success state
  if (loading === false && tokenInvalidated && !error) {
    return (
      <div className="fixed inset-0 bg-gray-900/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden">
          <div className="px-8 py-6 text-center">
            <div className="mb-4 flex justify-center">
              <div className="w-16 h-16 bg-green-50 rounded-full flex items-center justify-center">
                <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">{t('successTitle')}</h2>
            <p className="text-sm text-gray-600 mb-4">
              {t('successMessage')}
            </p>
            <p className="text-xs text-gray-500 mb-6">
              {t('successNote')}
            </p>
            <button
              onClick={onClose}
              className="w-full px-6 py-3 bg-teal-600 hover:bg-teal-700 text-white rounded-xl font-semibold transition-all shadow-sm hover:shadow-md"
            >
              {t('closeButton')}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
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
                    {t('currentAppointment')}
                  </div>
                  <div className="text-base sm:text-lg font-bold text-gray-900">
                    {serviceName}
                  </div>
                  <div className="text-xs sm:text-sm text-gray-500 mt-1">
                    {duration} {tDetails('minutes')}
                  </div>
                </div>
                <div className="text-left sm:text-right w-full sm:w-auto">
                  <div className="text-xs sm:text-sm font-semibold text-gray-900">
                    {formatDateLong(currentStartTime)}
                  </div>
                  <div className="text-base sm:text-lg font-bold text-gray-900 mt-0.5 sm:mt-1">
                    {formatTime(currentStartTime)} - {formatTime(currentEndTime)}
                  </div>
                </div>
              </div>
            </div>

            {/* Important Notice */}
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 sm:p-4">
              <div className="flex gap-2 sm:gap-3">
                <svg className="w-5 h-5 text-amber-600 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                <div>
                  <p className="text-sm font-medium text-amber-900">{t('importantTitle')}</p>
                  <p className="text-xs sm:text-sm text-amber-700 mt-1">
                    {t('importantMessage')}
                  </p>
                </div>
              </div>
            </div>

            {/* Week Navigation */}
            <div>
              <div className="flex items-center justify-between mb-3 sm:mb-4">
                <label className="text-xs sm:text-sm font-bold text-gray-900 uppercase tracking-wider">
                  {t('selectDate')}
                </label>
                <button
                  onClick={goToCurrentWeek}
                  className="text-[10px] sm:text-xs font-semibold text-teal-600 hover:text-teal-700 px-2 py-1 hover:bg-teal-50 rounded-lg transition-all"
                >
                  Today
                </button>
              </div>

              {/* Month Label */}
              <div className="flex items-center justify-between mb-2 sm:mb-3">
                <button
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
                    const isSelected = selectedDate ? isSameDay(date, selectedDate) : false;
                    const isCurrentDay = isToday(date);
                    const dateKey = formatDateKey(date);
                    const hasAvailability = dateAvailability.get(dateKey);
                    const isPast = date < new Date(new Date().setHours(0, 0, 0, 0));
                    const isDisabled = isPast || (hasAvailability === false && !loadingAvailability);

                    return (
                      <button
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
                          {date.toLocaleDateString(locale, { weekday: 'short' })}
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

                {/* Swipe Indicator for Mobile */}
                <div className="mt-3 sm:hidden flex items-center justify-center gap-1.5">
                  <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                  <span className="text-[10px] text-gray-400 font-medium">Swipe to navigate</span>
                  <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </div>
              </div>
            </div>

            {/* Time Slots */}
            {selectedDate && (
              <div>
                <div className="flex items-center justify-between mb-2 sm:mb-3">
                  <label className="text-xs sm:text-sm font-bold text-gray-900 uppercase tracking-wider">
                    {t('availableSlots')}
                  </label>
                  <span className="text-[10px] sm:text-xs text-gray-500">
                    {duration} {tDetails('minutes')}
                  </span>
                </div>

                {loadingSlots ? (
                  <div className="flex items-center justify-center py-8 sm:py-12">
                    <div className="animate-spin rounded-full h-6 w-6 sm:h-8 sm:w-8 border-b-2 border-teal-600" />
                  </div>
                ) : error ? (
                  <div className="bg-red-50 border border-red-200 rounded-xl p-3 sm:p-4 text-red-700 text-sm">
                    {error}
                  </div>
                ) : availableSlots.length === 0 ? (
                  <div className="text-center py-8 sm:py-12 bg-gray-50 border border-gray-100 rounded-xl">
                    <svg className="w-10 h-10 sm:w-12 sm:h-12 text-gray-300 mx-auto mb-2 sm:mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <p className="text-xs sm:text-sm font-semibold text-gray-900">{t('noSlots')}</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-5 gap-1.5 sm:gap-2 max-h-[240px] sm:max-h-[300px] overflow-y-auto">
                    {availableSlots
                      .filter(slot => slot.available)
                      .map((slot, index) => {
                        const isSelected = selectedSlot?.start === slot.start;
                        const isCurrent = new Date(slot.start).getTime() === new Date(currentStartTime).getTime();

                        return (
                          <button
                            key={index}
                            onClick={() => !isCurrent && setSelectedSlot(slot)}
                            disabled={isCurrent}
                            className={`
                              relative px-2 sm:px-4 py-2.5 sm:py-3 rounded-xl text-xs sm:text-sm font-semibold transition-all duration-200 active:scale-95
                              ${isCurrent
                                ? 'bg-gray-50 border-2 border-gray-100 text-gray-400 cursor-not-allowed'
                                : isSelected
                                  ? 'bg-teal-600 text-white shadow-md border-2 border-teal-600'
                                  : 'bg-white border-2 border-gray-200 text-gray-900 hover:border-teal-400 hover:bg-teal-50 hover:shadow-sm'
                              }
                            `}
                          >
                            {formatTime(slot.start)}
                            {isCurrent && <span className="block text-[10px] mt-0.5">({t('currentSlot')})</span>}
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
            )}

            {/* Selected Slot Preview */}
            {selectedSlot && selectedDate && (
              <div className="bg-teal-50 border border-teal-200 rounded-xl p-3 sm:p-4">
                <div className="flex items-start gap-2 sm:gap-3">
                  <svg className="w-4 h-4 sm:w-5 sm:h-5 text-teal-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <div className="flex-1 min-w-0">
                    <div className="text-xs sm:text-sm font-semibold text-gray-900">{t('newAppointment')}</div>
                    <div className="text-xs sm:text-sm text-gray-700 mt-0.5 sm:mt-1">
                      {formatDate(selectedDate)} at {formatTime(selectedSlot.start)} - {formatTime(selectedSlot.end)}
                    </div>
                    <div className="text-xs text-gray-600 mt-0.5">
                      {serviceName} • {duration} {tDetails('minutes')}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="px-4 sm:px-6 lg:px-8 py-3 sm:py-4 bg-gray-50 border-t border-gray-100 flex flex-col sm:flex-row gap-3">
          <button
            onClick={onClose}
            disabled={loading}
            className="flex-1 px-6 py-2.5 sm:py-3 text-sm font-semibold text-gray-700 bg-white hover:bg-gray-100 rounded-xl transition-all border border-gray-200"
          >
            {t('cancelButton')}
          </button>
          <button
            onClick={handleReschedule}
            disabled={!selectedSlot || loading}
            className="flex-1 px-6 py-2.5 sm:py-3 text-sm font-semibold bg-teal-600 text-white hover:bg-teal-700 rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-sm hover:shadow-md"
          >
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                {t('confirmingButton')}
              </span>
            ) : (
              t('confirmButton')
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
