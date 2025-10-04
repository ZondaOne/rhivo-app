'use client';

import { Appointment } from '@/db/types';
import { formatTime, formatDate } from '@/lib/calendar-utils';

interface RescheduleConfirmationModalProps {
  appointment: Appointment;
  originalTime: Date;
  newTime: Date;
  onConfirm: () => void;
  onCancel: () => void;
}

export function RescheduleConfirmationModal({
  appointment,
  originalTime,
  newTime,
  onConfirm,
  onCancel,
}: RescheduleConfirmationModalProps) {
  const originalEnd = new Date(appointment.end_time);
  const duration = Math.round((originalEnd.getTime() - originalTime.getTime()) / (1000 * 60));
  const newEnd = new Date(newTime);
  newEnd.setMinutes(newEnd.getMinutes() + duration);

  const isSameDay = originalTime.toDateString() === newTime.toDateString();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg mx-4 overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-teal-500 to-green-500 px-6 py-4">
          <h2 className="text-xl font-bold text-white">Confirm Reschedule</h2>
          <p className="text-sm text-teal-50 mt-1">Review the appointment changes before confirming</p>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Customer Details */}
          <div>
            <div className="text-xs font-semibold uppercase tracking-wider text-gray-500 mb-2">
              Customer
            </div>
            <div className="text-base font-semibold text-gray-900">
              {appointment.customer_name || 'Unnamed Customer'}
            </div>
            {(appointment.customer_email || appointment.guest_email) && (
              <div className="text-sm text-gray-600 mt-1">
                {appointment.customer_email || appointment.guest_email}
              </div>
            )}
            {(appointment.customer_phone || appointment.guest_phone) && (
              <div className="text-sm text-gray-600">
                {appointment.customer_phone || appointment.guest_phone}
              </div>
            )}
          </div>

          {/* Service Details */}
          {appointment.service_name && (
            <div>
              <div className="text-xs font-semibold uppercase tracking-wider text-gray-500 mb-2">
                Service
              </div>
              <div className="text-base font-semibold text-gray-900">
                {appointment.service_name}
              </div>
              <div className="text-sm text-gray-600">{duration} minutes</div>
            </div>
          )}

          {/* Time Comparison */}
          <div className="border-t border-gray-200 pt-6">
            <div className="text-xs font-semibold uppercase tracking-wider text-gray-500 mb-4">
              Time Change
            </div>

            <div className="grid grid-cols-2 gap-4">
              {/* Original Time */}
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <div className="text-xs font-semibold uppercase tracking-wider text-red-600 mb-2">
                  Original
                </div>
                <div className="text-sm font-semibold text-gray-900">
                  {formatDate(originalTime, 'long')}
                </div>
                <div className="text-lg font-bold text-red-700 mt-1">
                  {formatTime(originalTime)}
                </div>
                <div className="text-xs text-gray-600 mt-1">
                  {formatTime(originalEnd)} ({duration} min)
                </div>
              </div>

              {/* New Time */}
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <div className="text-xs font-semibold uppercase tracking-wider text-green-600 mb-2">
                  New
                </div>
                <div className="text-sm font-semibold text-gray-900">
                  {formatDate(newTime, 'long')}
                </div>
                <div className="text-lg font-bold text-green-700 mt-1">
                  {formatTime(newTime)}
                </div>
                <div className="text-xs text-gray-600 mt-1">
                  {formatTime(newEnd)} ({duration} min)
                </div>
              </div>
            </div>

            {/* Change Summary */}
            <div className="mt-4 flex items-center justify-center gap-2 text-sm text-gray-600">
              {isSameDay ? (
                <>
                  <svg className="w-4 h-4 text-teal-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span>Time change on same day</span>
                </>
              ) : (
                <>
                  <svg className="w-4 h-4 text-teal-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  <span>Date and time change</span>
                </>
              )}
            </div>
          </div>

          {/* Notes */}
          {appointment.notes && (
            <div>
              <div className="text-xs font-semibold uppercase tracking-wider text-gray-500 mb-2">
                Notes
              </div>
              <div className="text-sm text-gray-700 bg-gray-50 rounded-lg p-3 border border-gray-200">
                {appointment.notes}
              </div>
            </div>
          )}

          {/* Warning */}
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 flex items-start gap-3">
            <svg className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <div>
              <div className="text-sm font-semibold text-amber-900">Customer will be notified</div>
              <div className="text-xs text-amber-700 mt-1">
                An email will be sent to the customer with the updated appointment time.
              </div>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="bg-gray-50 px-6 py-4 flex items-center justify-end gap-3 border-t border-gray-200">
          <button
            onClick={onCancel}
            className="px-4 py-2 text-sm font-semibold text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className="px-6 py-2 text-sm font-semibold text-white bg-gradient-to-r from-teal-500 to-green-500 rounded-lg hover:from-teal-600 hover:to-green-600 transition-all shadow-sm"
          >
            Confirm Reschedule
          </button>
        </div>
      </div>
    </div>
  );
}
