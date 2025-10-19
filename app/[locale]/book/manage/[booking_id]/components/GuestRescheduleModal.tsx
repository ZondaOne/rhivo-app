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
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [availableSlots, setAvailableSlots] = useState<TimeSlot[]>([]);
  const [selectedSlot, setSelectedSlot] = useState<TimeSlot | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [tokenInvalidated, setTokenInvalidated] = useState(false);

  // Initialize with current date
  useEffect(() => {
    const currentDate = new Date(currentStartTime);
    const dateStr = currentDate.toISOString().split('T')[0];
    setSelectedDate(dateStr);
  }, [currentStartTime]);

  // Fetch available slots when date changes
  useEffect(() => {
    if (selectedDate) {
      fetchAvailableSlots();
    }
  }, [selectedDate]);

  async function fetchAvailableSlots() {
    setLoadingSlots(true);
    setError(null);
    setSelectedSlot(null);

    try {
      // Validate serviceId before making request
      if (!serviceId || serviceId === 'unknown') {
        throw new Error(t('serviceMissing'));
      }

      const response = await fetch(
        `/api/booking/slots?subdomain=${subdomain}&serviceId=${serviceId}&startDate=${selectedDate}&endDate=${selectedDate}`
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
      alert(t('selectSlotError'));
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

      // Check if token was invalidated
      if (data.tokenInvalidated) {
        setTokenInvalidated(true);
      }

      onSuccess();
      // Don't close immediately - show success message
      setTimeout(() => {
        onClose();
      }, 2000);
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

  function formatDate(isoString: string): string {
    const date = new Date(isoString);
    return date.toLocaleDateString(locale, {
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    });
  }

  // Get min and max dates for date picker
  const today = new Date();
  const minDate = today.toISOString().split('T')[0];

  const maxDate = new Date();
  maxDate.setDate(maxDate.getDate() + 60); // 60 days advance booking
  const maxDateStr = maxDate.toISOString().split('T')[0];

  // Show success state
  if (loading === false && tokenInvalidated && !error) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6 sm:p-8 text-center">
          <div className="mb-4 flex justify-center">
            <div className="w-14 h-14 sm:w-16 sm:h-16 bg-green-100 rounded-full flex items-center justify-center">
              <svg className="w-7 h-7 sm:w-8 sm:h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
          </div>
          <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mb-2">{t('successTitle')}</h2>
          <p className="text-sm sm:text-base text-gray-600 mb-4">
            {t('successMessage')}
          </p>
          <p className="text-xs sm:text-sm text-gray-500 mb-6">
            {t('successNote')}
          </p>
          <button
            onClick={onClose}
            className="w-full px-6 py-3 bg-gradient-to-r from-teal-600 to-green-600 text-white rounded-xl hover:from-teal-700 hover:to-green-700 transition font-medium"
          >
            {t('closeButton')}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b px-4 sm:px-6 py-4 flex justify-between items-center rounded-t-2xl">
          <h2 className="text-lg sm:text-xl font-semibold text-gray-900">{t('title')}</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
            aria-label={t('closeButton')}
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Body */}
        <div className="p-4 sm:p-6 space-y-4 sm:space-y-6">
          {/* Current Appointment Info */}
          <div className="bg-gray-50 rounded-lg p-4">
            <h3 className="text-sm font-medium text-gray-700 mb-2">{t('currentAppointment')}</h3>
            <p className="text-gray-900 font-medium text-sm sm:text-base">{serviceName} • {duration} {tDetails('minutes')}</p>
            <p className="text-gray-600 text-sm mt-1">
              {formatDate(currentStartTime)} at {formatTime(currentStartTime)}
            </p>
            <p className="text-gray-500 text-xs mt-1">
              {tDetails('bookingIdLabel')}: <span className="font-mono">{bookingId}</span>
            </p>
          </div>

          {/* Important Notice */}
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 sm:p-4">
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

          {/* Date Selector */}
          <div>
            <label htmlFor="date" className="block text-sm font-medium text-gray-700 mb-2">
              {t('selectDate')}
            </label>
            <input
              type="date"
              id="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              min={minDate}
              max={maxDateStr}
              className="w-full px-3 sm:px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent text-sm sm:text-base"
            />
          </div>

          {/* Available Slots */}
          <div>
            <h3 className="text-sm font-medium text-gray-700 mb-2">
              {t('availableSlots')} {formatDate(selectedDate + 'T00:00:00')}
            </h3>

            {loadingSlots && (
              <div className="text-center py-8 text-gray-600 text-sm sm:text-base">
                {t('loadingSlots')}
              </div>
            )}

            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-3 sm:p-4 text-red-700 text-sm sm:text-base">
                {error}
              </div>
            )}

            {!loadingSlots && !error && availableSlots.length === 0 && (
              <div className="text-center py-8 text-gray-600 text-sm sm:text-base">
                {t('noSlots')}
              </div>
            )}

            {!loadingSlots && !error && availableSlots.length > 0 && (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2 max-h-64 overflow-y-auto">
                {availableSlots
                  .filter(slot => slot.available)
                  .map((slot, index) => {
                    const isSelected = selectedSlot?.start === slot.start;
                    const isCurrent =
                      new Date(slot.start).getTime() === new Date(currentStartTime).getTime();

                    return (
                      <button
                        key={index}
                        onClick={() => setSelectedSlot(slot)}
                        disabled={isCurrent}
                        className={`px-2 sm:px-3 py-2 rounded-lg text-xs sm:text-sm font-medium transition ${
                          isCurrent
                            ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                            : isSelected
                            ? 'bg-teal-600 text-white'
                            : 'bg-white border border-gray-300 text-gray-700 hover:bg-teal-50 hover:border-teal-300'
                        }`}
                      >
                        {formatTime(slot.start)}
                        {isCurrent && <span className="block text-xs">({t('currentSlot')})</span>}
                      </button>
                    );
                  })}
              </div>
            )}
          </div>

          {/* Selected Slot Summary */}
          {selectedSlot && (
            <div className="bg-teal-50 border border-teal-200 rounded-lg p-3 sm:p-4">
              <h3 className="text-sm font-medium text-teal-900 mb-1">{t('newAppointment')}</h3>
              <p className="text-teal-800 text-sm sm:text-base">
                {formatDate(selectedSlot.start)} at {formatTime(selectedSlot.start)} - {formatTime(selectedSlot.end)}
              </p>
              <p className="text-teal-700 text-xs sm:text-sm mt-1">
                {serviceName} • {duration} {tDetails('minutes')}
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 bg-gray-50 border-t px-4 sm:px-6 py-3 sm:py-4 flex flex-col sm:flex-row justify-end gap-3 rounded-b-2xl">
          <button
            onClick={onClose}
            className="w-full sm:w-auto px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-100 transition font-medium text-sm sm:text-base"
          >
            {t('cancelButton')}
          </button>
          <button
            onClick={handleReschedule}
            disabled={!selectedSlot || loading}
            className="w-full sm:w-auto px-6 py-2 bg-gradient-to-r from-teal-600 to-green-600 text-white rounded-lg hover:from-teal-700 hover:to-green-700 transition font-medium disabled:opacity-50 disabled:cursor-not-allowed text-sm sm:text-base"
          >
            {loading ? t('confirmingButton') : t('confirmButton')}
          </button>
        </div>
      </div>
    </div>
  );
}
