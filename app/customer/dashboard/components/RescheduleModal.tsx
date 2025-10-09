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

interface RescheduleModalProps {
  appointmentId: string;
  bookingId: string;
  businessName: string;
  subdomain: string;
  serviceName: string;
  serviceId: string;
  currentStartTime: string;
  currentEndTime: string;
  duration: number;
  onClose: () => void;
  onSuccess: () => void;
}

export default function RescheduleModal({
  appointmentId,
  bookingId,
  businessName,
  subdomain,
  serviceName,
  serviceId,
  currentStartTime,
  currentEndTime,
  duration,
  onClose,
  onSuccess,
}: RescheduleModalProps) {
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [availableSlots, setAvailableSlots] = useState<TimeSlot[]>([]);
  const [selectedSlot, setSelectedSlot] = useState<TimeSlot | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
      const accessToken = localStorage.getItem('accessToken');
      if (!accessToken) {
        alert('Please log in again');
        return;
      }

      const response = await fetch(`/api/customer/appointments/${appointmentId}/reschedule`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          newSlotStart: selectedSlot.start,
          newSlotEnd: selectedSlot.end,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to reschedule appointment');
      }

      alert('Appointment rescheduled successfully!');
      onSuccess();
      onClose();
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

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b px-6 py-4 flex justify-between items-center">
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
            <p className="text-gray-900 font-medium">{businessName}</p>
            <p className="text-gray-700">{serviceName} • {duration} min</p>
            <p className="text-gray-600 text-sm mt-1">
              {formatDate(currentStartTime)} at {formatTime(currentStartTime)}
            </p>
            <p className="text-gray-500 text-xs mt-1">
              Booking ID: <span className="font-mono">{bookingId}</span>
            </p>
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
        <div className="sticky bottom-0 bg-gray-50 border-t px-6 py-4 flex justify-end gap-3">
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
