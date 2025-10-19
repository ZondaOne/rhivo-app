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
      <div className="min-h-screen flex items-center justify-center px-4">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-teal-600 border-t-transparent mx-auto mb-4"></div>
          <p className="text-gray-500">{t('loading')}</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <div className="text-center">
          <p className="text-red-500 text-lg font-semibold mb-2">{t('error')}</p>
          <p className="text-red-600">{error}</p>
        </div>
      </div>
    );
  }

  if (!appointment) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <p className="text-gray-500 text-lg">{t('noAppointment')}</p>
      </div>
    );
  }

  return (
    <>
      <div className="min-h-screen bg-gray-50 flex flex-col justify-center items-center p-4 sm:p-6 lg:p-8">
        <div className="max-w-lg w-full bg-white p-6 sm:p-8 shadow-2xl rounded-2xl">
          <h1 className="text-2xl sm:text-3xl font-bold text-center text-gray-800 mb-4">
            {t('title')}
          </h1>
          <p className="text-center text-gray-600 mb-6 text-sm sm:text-base">
            {t('bookingIdLabel')}: <span className="font-mono font-semibold">{appointment.bookingId}</span>
          </p>

          <div className="space-y-4 sm:space-y-5">
            <div>
              <h3 className="font-medium text-gray-900 text-sm sm:text-base">{t('business')}</h3>
              <p className="text-gray-700 text-sm sm:text-base">{appointment.businessName}</p>
            </div>
            <div>
              <h3 className="font-medium text-gray-900 text-sm sm:text-base">{t('service')}</h3>
              <p className="text-gray-700 text-sm sm:text-base">{appointment.serviceName} • {appointment.duration} {t('minutes')}</p>
            </div>
            <div>
              <h3 className="font-medium text-gray-900 text-sm sm:text-base">{t('when')}</h3>
              <p className="text-gray-700 text-sm sm:text-base">
                {new Date(appointment.startTime).toLocaleDateString(locale, {
                  weekday: 'long',
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                })}
              </p>
              <p className="text-gray-700 font-semibold mt-1 text-sm sm:text-base">
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
            <div>
              <h3 className="font-medium text-gray-900 text-sm sm:text-base">{t('status')}</h3>
              <p className={`inline-block px-3 py-1 rounded-full text-sm font-medium ${
                appointment.status === 'confirmed'
                  ? 'bg-green-100 text-green-800'
                  : appointment.status === 'canceled'
                  ? 'bg-red-100 text-red-800'
                  : 'bg-gray-100 text-gray-800'
              }`}>
                {appointment.status === 'confirmed' ? t('statusConfirmed') : appointment.status === 'canceled' ? t('statusCanceled') : appointment.status}
              </p>
            </div>
          </div>

          {appointment.status === 'confirmed' && (
            <div className="mt-6 sm:mt-8 flex flex-col sm:flex-row justify-end gap-3 sm:gap-4">
              <button
                onClick={() => setShowRescheduleModal(true)}
                className="w-full sm:w-auto px-5 py-2 text-sm font-semibold text-teal-600 hover:bg-teal-50 rounded-xl transition-all border border-teal-600"
              >
                {t('rescheduleButton')}
              </button>
              <button
                onClick={handleCancel}
                className="w-full sm:w-auto py-2 px-4 border border-transparent rounded-xl shadow-sm text-sm font-medium text-white bg-red-600 hover:bg-red-700 transition-all"
              >
                {t('cancelButton')}
              </button>
            </div>
          )}

          {appointment.status === 'canceled' && (
            <div className="mt-6 sm:mt-8 text-center">
              <p className="text-gray-600 text-sm sm:text-base">{t('canceledMessage')}</p>
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
