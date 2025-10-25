'use client';

import { useTranslations, useLocale } from 'next-intl';
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
  const t = useTranslations('dashboard.rescheduleConfirmation');
  const locale = useLocale();
  const originalEnd = new Date(appointment.end_time);
  const duration = Math.round((originalEnd.getTime() - originalTime.getTime()) / (1000 * 60));
  const newEnd = new Date(newTime);
  newEnd.setMinutes(newEnd.getMinutes() + duration);

  const isSameDay = originalTime.toDateString() === newTime.toDateString();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/40 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden">
        {/* Header */}
        <div className="px-8 py-6 border-b border-gray-100">
          <h2 className="text-2xl font-bold text-gray-900 tracking-tight">{t('title')}</h2>
          <p className="text-sm text-gray-500 mt-1">{t('subtitle')}</p>
        </div>

        {/* Content */}
        <div className="px-8 py-6 space-y-6">
          {/* Customer Details */}
          <div>
            <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider mb-3">
              {t('customer')}
            </h3>
            <div className="text-base font-semibold text-gray-900">
              {appointment.customer_name || 'Unnamed Customer'}
            </div>
            {(appointment.customer_email || appointment.guest_email) && (
              <div className="text-sm text-gray-500 mt-1">
                {appointment.customer_email || appointment.guest_email}
              </div>
            )}
            {(appointment.customer_phone || appointment.guest_phone) && (
              <div className="text-sm text-gray-500">
                {appointment.customer_phone || appointment.guest_phone}
              </div>
            )}
          </div>

          {/* Service Details */}
          {appointment.service_name && (
            <div>
              <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider mb-3">
                {t('service')}
              </h3>
              <div className="text-base font-semibold text-gray-900">
                {appointment.service_name}
              </div>
              <div className="text-sm text-gray-500">{duration} minutes</div>
            </div>
          )}

          {/* Time Comparison */}
          <div>
            <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider mb-3">
              {t('timeChange')}
            </h3>

            <div className="grid grid-cols-2 gap-4">
              {/* Original Time */}
              <div className="bg-gray-50 border border-gray-100 rounded-xl p-4">
                <div className="text-xs font-semibold uppercase tracking-wider text-gray-500 mb-2">
                  {t('original')}
                </div>
                <div className="text-sm font-semibold text-gray-900">
                  {formatDate(originalTime, 'long', locale)}
                </div>
                <div className="text-lg font-bold text-gray-900 mt-1">
                  {formatTime(originalTime, locale)}
                </div>
                <div className="text-xs text-gray-500 mt-1">
                  {formatTime(originalEnd, locale)}
                </div>
              </div>

              {/* New Time */}
              <div className="bg-gray-50 border border-gray-200 rounded-xl p-4">
                <div className="text-xs font-semibold uppercase tracking-wider text-teal-600 mb-2">
                  {t('new')}
                </div>
                <div className="text-sm font-semibold text-gray-900">
                  {formatDate(newTime, 'long', locale)}
                </div>
                <div className="text-lg font-bold text-gray-900 mt-1">
                  {formatTime(newTime, locale)}
                </div>
                <div className="text-xs text-gray-500 mt-1">
                  {formatTime(newEnd, locale)}
                </div>
              </div>
            </div>

            {/* Change Summary */}
            <div className="mt-4 flex items-center justify-center gap-2 text-sm text-gray-500">
              {isSameDay ? (
                <>
                  <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span>{t('sameDay')}</span>
                </>
              ) : (
                <>
                  <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  <span>{t('differentDay')}</span>
                </>
              )}
            </div>
          </div>

          {/* Notes */}
          {appointment.notes && (
            <div>
              <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider mb-3">
                {t('notes')}
              </h3>
              <div className="text-sm text-gray-900 bg-gray-50 rounded-xl p-4 border border-gray-100">
                {appointment.notes}
              </div>
            </div>
          )}

          {/* Info Notice */}
          <div className="bg-gray-50 border border-gray-100 rounded-xl p-4 flex items-start gap-3">
            <svg className="w-5 h-5 text-gray-400 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <div>
              <div className="text-sm font-semibold text-gray-900">{t('notification.title')}</div>
              <div className="text-xs text-gray-500 mt-1">
                {t('notification.message')}
              </div>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="px-8 py-6 border-t border-gray-100 flex items-center justify-end gap-3">
          <button
            onClick={onCancel}
            className="px-5 py-2.5 text-sm font-semibold text-gray-700 hover:bg-gray-50 rounded-xl transition-all"
          >
            {t('buttons.cancel')}
          </button>
          <button
            onClick={onConfirm}
            className="px-6 py-3 text-sm font-semibold text-white bg-gradient-to-r from-teal-600 to-green-600 rounded-2xl hover:shadow-lg hover:scale-[1.02] transition-all"
          >
            {t('buttons.confirm')}
          </button>
        </div>
      </div>
    </div>
  );
}
