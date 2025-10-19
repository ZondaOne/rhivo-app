"use client";

import { useState, useEffect } from 'react';

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
        throw new Error('Service information is missing. Please try booking again or contact support.');
      }

      const response = await fetch(
        `/api/booking/slots?subdomain=${subdomain}&serviceId=${serviceId}&startDate=${selectedDate}&endDate=${selectedDate}`
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch available slots');
      }

      setAvailableSlots(data.slots || []);
    } catch (err: any) {
      setError(err.message || 'Failed to load available slots');
    } finally {
      setLoadingSlots(false);
    }
  }

  async function handleReschedule() {
    if (!selectedSlot) {
      alert('Please select a time slot');
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
        throw new Error(data.error || 'Failed to reschedule appointment');
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
      setError(err.message || 'Failed to reschedule appointment');
    } finally {
      setLoading(false);
    }
  }

  function formatTime(isoString: string): string {
    const date = new Date(isoString);
    return date.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
  }

  function formatDate(isoString: string): string {
    const date = new Date(isoString);
    return date.toLocaleDateString('en-US', {
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
        <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-8 text-center">
          <div className="mb-4 flex justify-center">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
              <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Appointment Rescheduled!</h2>
          <p className="text-gray-600 mb-4">
            Your appointment has been successfully rescheduled. A confirmation email has been sent to you.
          </p>
          <p className="text-sm text-gray-500 mb-6">
            Note: Your access link has been refreshed. To make further changes, please request a new access link from the manage booking page.
          </p>
          <button
            onClick={onClose}
            className="w-full px-6 py-3 bg-gradient-to-r from-teal-600 to-green-600 text-white rounded-xl hover:from-teal-700 hover:to-green-700 transition font-medium"
          >
            Close
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b px-6 py-4 flex justify-between items-center rounded-t-2xl">
          <h2 className="text-xl font-semibold text-gray-900">Reschedule Appointment</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
            aria-label="Close"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-6">
          {/* Current Appointment Info */}
          <div className="bg-gray-50 rounded-lg p-4">
            <h3 className="text-sm font-medium text-gray-700 mb-2">Current Appointment</h3>
            <p className="text-gray-900 font-medium">{serviceName} • {duration} min</p>
            <p className="text-gray-600 text-sm mt-1">
              {formatDate(currentStartTime)} at {formatTime(currentStartTime)}
            </p>
            <p className="text-gray-500 text-xs mt-1">
              Booking ID: <span className="font-mono">{bookingId}</span>
            </p>
          </div>

          {/* Important Notice */}
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
            <div className="flex gap-3">
              <svg className="w-5 h-5 text-amber-600 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              <div>
                <p className="text-sm font-medium text-amber-900">Important</p>
                <p className="text-sm text-amber-700 mt-1">
                  After rescheduling, your access link will be refreshed for security. You'll need to request a new link to make any additional changes.
                </p>
              </div>
            </div>
          </div>

          {/* Date Selector */}
          <div>
            <label htmlFor="date" className="block text-sm font-medium text-gray-700 mb-2">
              Select New Date
            </label>
            <input
              type="date"
              id="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              min={minDate}
              max={maxDateStr}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
            />
          </div>

          {/* Available Slots */}
          <div>
            <h3 className="text-sm font-medium text-gray-700 mb-2">
              Available Time Slots for {formatDate(selectedDate + 'T00:00:00')}
            </h3>

            {loadingSlots && (
              <div className="text-center py-8 text-gray-600">
                Loading available slots...
              </div>
            )}

            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700">
                {error}
              </div>
            )}

            {!loadingSlots && !error && availableSlots.length === 0 && (
              <div className="text-center py-8 text-gray-600">
                No available slots for this date. Try another date.
              </div>
            )}

            {!loadingSlots && !error && availableSlots.length > 0 && (
              <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 max-h-64 overflow-y-auto">
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
                        className={`px-3 py-2 rounded-lg text-sm font-medium transition ${
                          isCurrent
                            ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                            : isSelected
                            ? 'bg-teal-600 text-white'
                            : 'bg-white border border-gray-300 text-gray-700 hover:bg-teal-50 hover:border-teal-300'
                        }`}
                      >
                        {formatTime(slot.start)}
                        {isCurrent && <span className="block text-xs">(current)</span>}
                      </button>
                    );
                  })}
              </div>
            )}
          </div>

          {/* Selected Slot Summary */}
          {selectedSlot && (
            <div className="bg-teal-50 border border-teal-200 rounded-lg p-4">
              <h3 className="text-sm font-medium text-teal-900 mb-1">New Appointment Time</h3>
              <p className="text-teal-800">
                {formatDate(selectedSlot.start)} at {formatTime(selectedSlot.start)} - {formatTime(selectedSlot.end)}
              </p>
              <p className="text-teal-700 text-sm mt-1">
                {serviceName} • {duration} min
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 bg-gray-50 border-t px-6 py-4 flex justify-end gap-3 rounded-b-2xl">
          <button
            onClick={onClose}
            className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-100 transition font-medium"
          >
            Cancel
          </button>
          <button
            onClick={handleReschedule}
            disabled={!selectedSlot || loading}
            className="px-6 py-2 bg-gradient-to-r from-teal-600 to-green-600 text-white rounded-lg hover:from-teal-700 hover:to-green-700 transition font-medium disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Rescheduling...' : 'Confirm Reschedule'}
          </button>
        </div>
      </div>
    </div>
  );
}
