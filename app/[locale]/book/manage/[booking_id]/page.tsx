'use client';

import { useState, useEffect } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import { useTranslations, useLocale } from 'next-intl';
import GuestRescheduleModal from './components/GuestRescheduleModal';

interface Appointment {
  id: string;
  bookingId: string;
  serviceName: string;
  serviceId: string;
  serviceDbId: string;
  duration: number;
  startTime: string;
  endTime: string;
  customerName: string;
  status: string;
  subdomain: string;
  businessName: string;
}

export default function ManageAppointmentPage() {
  const t = useTranslations('manageBooking.details');
  const locale = useLocale();
  const params = useParams();
  const searchParams = useSearchParams();
  const bookingId = params.booking_id as string;
  const token = searchParams.get('token');

  const [appointment, setAppointment] = useState<Appointment | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showRescheduleModal, setShowRescheduleModal] = useState(false);

  useEffect(() => {
    if (!bookingId || !token) {
      setError(t('missingInfo'));
      setLoading(false);
      return;
    }

    const fetchAppointment = async () => {
      try {
        const res = await fetch(`/api/booking/guest-appointment/${bookingId}?token=${token}`);
        const data = await res.json();

        if (res.ok) {
          setAppointment(data.appointment);
        } else {
          setError(data.error || t('loadFailed'));
        }
      } catch {
        setError(t('unexpectedError'));
      } finally {
        setLoading(false);
      }
    };

    fetchAppointment();
  }, [bookingId, token, t]);

  const handleCancel = async () => {
    if (!appointment) return;

    if (confirm(t('cancelConfirm'))) {
      try {
        const res = await fetch(`/api/booking/guest-appointment/${bookingId}/cancel`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ token }),
        });

        if (res.ok) {
          alert(t('cancelSuccess'));
          // Refresh appointment data
          setAppointment({ ...appointment, status: 'canceled' });
        } else {
          const data = await res.json();
          alert(data.error || t('cancelFailed'));
        }
      } catch {
        alert(t('unexpectedError'));
      }
    }
  };

  const handleRescheduleSuccess = () => {
    setShowRescheduleModal(false);
    // Refresh appointment data after reschedule
    // Note: Token will be invalidated, so we'll need to show a message
    alert(t('cancelSuccess'));
    window.location.href = `/${locale}/book/manage`;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full p-8">
          <div className="flex flex-col items-center gap-4">
            <div className="relative w-12 h-12">
              <div className="absolute inset-0 border-4 border-teal-200 rounded-full" />
              <div className="absolute inset-0 border-4 border-teal-600 rounded-full border-t-transparent animate-spin" />
            </div>
            <p className="text-sm font-medium text-gray-700">{t('loading')}</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden">
          <div className="px-8 py-6 border-b border-gray-100">
            <h1 className="text-2xl font-bold text-gray-900 tracking-tight">{t('error')}</h1>
          </div>
          <div className="px-8 py-6">
            <div className="p-4 bg-red-50 border border-red-200 rounded-xl flex items-start gap-3">
              <svg className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <p className="text-sm text-red-800">{error}</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!appointment) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full p-8">
          <p className="text-sm text-gray-500 text-center">{t('noAppointment')}</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden">
          {/* Header */}
          <div className="px-8 py-6 border-b border-gray-100">
            <h1 className="text-2xl font-bold text-gray-900 tracking-tight mb-2">
              {t('title')}
            </h1>
            <p className="text-sm text-gray-500">
              {t('bookingIdLabel')}: <span className="font-mono font-semibold text-gray-700">{appointment.bookingId}</span>
            </p>
          </div>

          {/* Content */}
          <div className="px-8 py-6 space-y-5">
            {/* Business */}
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-teal-50 flex items-center justify-center flex-shrink-0">
                <svg className="w-5 h-5 text-teal-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                </svg>
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">{t('business')}</h3>
                <p className="text-sm font-semibold text-gray-900">{appointment.businessName}</p>
              </div>
            </div>

            {/* Service */}
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-purple-50 flex items-center justify-center flex-shrink-0">
                <svg className="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
                </svg>
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">{t('service')}</h3>
                <p className="text-sm font-semibold text-gray-900">{appointment.serviceName}</p>
                <p className="text-xs text-gray-500 mt-0.5">{appointment.duration} {t('minutes')}</p>
              </div>
            </div>

            {/* Date & Time */}
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center flex-shrink-0">
                <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">{t('when')}</h3>
                <p className="text-sm font-semibold text-gray-900">
                  {new Date(appointment.startTime).toLocaleDateString(locale, {
                    weekday: 'long',
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                  })}
                </p>
                <p className="text-sm text-gray-600 mt-1">
                  {new Date(appointment.startTime).toLocaleTimeString(locale, {
                    hour: 'numeric',
                    minute: '2-digit',
                    hour12: true,
                  })}
                  {' - '}
                  {new Date(appointment.endTime).toLocaleTimeString(locale, {
                    hour: 'numeric',
                    minute: '2-digit',
                    hour12: true,
                  })}
                </p>
              </div>
            </div>

            {/* Status */}
            <div className="flex items-start gap-3">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${
                appointment.status === 'confirmed' ? 'bg-green-50' : 'bg-red-50'
              }`}>
                {appointment.status === 'confirmed' ? (
                  <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                ) : (
                  <svg className="w-5 h-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">{t('status')}</h3>
                <span className={`inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-semibold ${
                  appointment.status === 'confirmed'
                    ? 'bg-green-50 text-green-700 ring-1 ring-green-600/20'
                    : appointment.status === 'canceled'
                    ? 'bg-red-50 text-red-700 ring-1 ring-red-600/20'
                    : 'bg-gray-50 text-gray-700 ring-1 ring-gray-600/20'
                }`}>
                  {appointment.status === 'confirmed' ? t('statusConfirmed') : appointment.status === 'canceled' ? t('statusCanceled') : appointment.status}
                </span>
              </div>
            </div>
          </div>

          {/* Actions */}
          {appointment.status === 'confirmed' && (
            <div className="px-8 py-6 bg-gray-50 border-t border-gray-100 flex flex-col sm:flex-row gap-3">
              <button
                onClick={() => setShowRescheduleModal(true)}
                className="flex-1 px-5 py-2.5 text-sm font-semibold text-teal-700 bg-white hover:bg-teal-50 rounded-xl transition-all border border-teal-300 hover:border-teal-400"
              >
                {t('rescheduleButton')}
              </button>
              <button
                onClick={handleCancel}
                className="flex-1 px-5 py-2.5 text-sm font-semibold text-white bg-red-600 hover:bg-red-700 rounded-xl transition-all shadow-sm hover:shadow-md"
              >
                {t('cancelButton')}
              </button>
            </div>
          )}

          {appointment.status === 'canceled' && (
            <div className="px-8 py-6 bg-gray-50 border-t border-gray-100">
              <p className="text-sm text-gray-600 text-center">{t('canceledMessage')}</p>
            </div>
          )}
        </div>
      </div>

      {showRescheduleModal && token && (
        <GuestRescheduleModal
          bookingId={bookingId}
          subdomain={appointment.subdomain}
          serviceName={appointment.serviceName}
          serviceId={appointment.serviceId}
          currentStartTime={appointment.startTime}
          currentEndTime={appointment.endTime}
          duration={appointment.duration}
          token={token}
          onClose={() => setShowRescheduleModal(false)}
          onSuccess={handleRescheduleSuccess}
        />
      )}
    </>
  );
}
