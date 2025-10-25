'use client';

import { useTranslations, useLocale } from 'next-intl';
import { Appointment } from '@/db/types';
import { formatTime, formatDate } from '@/lib/calendar-utils';

interface DragDropRescheduleModalProps {
  appointment: Appointment;
  originalTime: Date;
  newTime: Date;
  onConfirm: () => void;
  onCancel: () => void;
  loading?: boolean;
}

export function DragDropRescheduleModal({
  appointment,
  originalTime,
  newTime,
  onConfirm,
  onCancel,
  loading = false,
}: DragDropRescheduleModalProps) {
  const t = useTranslations('dashboard.dragReschedule');
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
          {/* Customer & Service Details */}
          <div className="bg-gray-50 border border-gray-100 rounded-xl p-4">
            <div className="flex items-start justify-between">
              <div>
                <div className="text-sm font-semibold text-gray-900">
                  {appointment.customer_name || t('guest')}
                </div>
                <div className="text-sm text-gray-500 mt-1">
                  {duration} min
                </div>
              </div>
              {(appointment.customer_email || appointment.guest_email) && (
                <div className="text-xs text-gray-500 text-right">
                  {appointment.customer_email || appointment.guest_email}
                </div>
              )}
            </div>
          </div>

          {/* Time Comparison */}
          <div>
            <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider mb-3">
              {t('timeChange.title')}
            </h3>

            <div className="grid grid-cols-2 gap-4">
              {/* Original Time */}
              <div className="bg-gray-50 border border-gray-100 rounded-xl p-4">
                <div className="text-xs font-semibold uppercase tracking-wider text-gray-500 mb-2">
                  {t('timeChange.from')}
                </div>
                {!isSameDay && (
                  <div className="text-sm font-semibold text-gray-900">
                    {formatDate(originalTime, 'long', locale)}
                  </div>
                )}
                <div className="text-lg font-bold text-gray-900 mt-1">
                  {formatTime(originalTime, locale)}
                </div>
                <div className="text-xs text-gray-500 mt-1">
                  to {formatTime(originalEnd, locale)}
                </div>
              </div>

              {/* New Time */}
              <div className="bg-gradient-to-br from-teal-50 to-green-50 border border-teal-200 rounded-xl p-4">
                <div className="text-xs font-semibold uppercase tracking-wider text-teal-700 mb-2">
                  {t('timeChange.to')}
                </div>
                {!isSameDay && (
                  <div className="text-sm font-semibold text-gray-900">
                    {formatDate(newTime, 'long', locale)}
                  </div>
                )}
                <div className="text-lg font-bold text-gray-900 mt-1">
                  {formatTime(newTime, locale)}
                </div>
                <div className="text-xs text-gray-700 mt-1">
                  to {formatTime(newEnd, locale)}
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
                  <span>{t('timeChange.sameDay')}</span>
                </>
              ) : (
                <>
                  <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  <span>{t('timeChange.differentDay')}</span>
                </>
              )}
            </div>
          </div>

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
            disabled={loading}
            className="px-5 py-2.5 text-sm font-semibold text-gray-700 hover:bg-gray-50 rounded-xl transition-all disabled:opacity-50"
          >
            {t('buttons.cancel')}
          </button>
          <button
            onClick={onConfirm}
            disabled={loading}
            className="px-6 py-3 text-sm font-semibold text-white bg-gradient-to-r from-teal-600 to-green-600 rounded-2xl hover:shadow-lg hover:scale-[1.02] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? t('buttons.confirming') : t('buttons.confirm')}
          </button>
        </div>
      </div>
    </div>
  );
}
