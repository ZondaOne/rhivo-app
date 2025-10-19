'use client';

import { useState, useEffect } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
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
      setError('Missing booking information.');
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
          setError(data.error || 'Failed to load appointment.');
        }
      } catch {
        setError('An unexpected error occurred.');
      } finally {
        setLoading(false);
      }
    };

    fetchAppointment();
  }, [bookingId, token]);

  const handleCancel = async () => {
    if (!appointment) return;

    if (confirm('Are you sure you want to cancel this appointment?')) {
      try {
        const res = await fetch(`/api/booking/guest-appointment/${bookingId}/cancel`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ token }),
        });

        if (res.ok) {
          alert('Appointment cancelled successfully.');
          // Refresh appointment data
          setAppointment({ ...appointment, status: 'canceled' });
        } else {
          const data = await res.json();
          alert(data.error || 'Failed to cancel appointment.');
        }
      } catch {
        alert('An unexpected error occurred.');
      }
    }
  };

  const handleRescheduleSuccess = () => {
    setShowRescheduleModal(false);
    // Refresh appointment data after reschedule
    // Note: Token will be invalidated, so we'll need to show a message
    alert('Your appointment has been successfully rescheduled! Please check your email for confirmation. This access link is no longer valid.');
    window.location.href = '/book/manage';
  };

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center">Loading...</div>;
  }

  if (error) {
    return <div className="min-h-screen flex items-center justify-center text-red-500">Error: {error}</div>;
  }

  if (!appointment) {
    return <div className="min-h-screen flex items-center justify-center">No appointment found.</div>;
  }

  return (
    <>
      <div className="min-h-screen bg-gray-50 flex flex-col justify-center items-center p-4">
        <div className="max-w-lg w-full bg-white p-8 shadow-2xl rounded-2xl">
          <h1 className="text-2xl font-bold text-center text-gray-800 mb-4">
            Booking Details
          </h1>
          <p className="text-center text-gray-600 mb-6">
            Booking ID: <span className="font-mono font-semibold">{appointment.bookingId}</span>
          </p>

          <div className="space-y-4">
            <div>
              <h3 className="font-medium text-gray-900">Business</h3>
              <p className="text-gray-700">{appointment.businessName}</p>
            </div>
            <div>
              <h3 className="font-medium text-gray-900">Service</h3>
              <p className="text-gray-700">{appointment.serviceName} • {appointment.duration} min</p>
            </div>
            <div>
              <h3 className="font-medium text-gray-900">When</h3>
              <p className="text-gray-700">
                {new Date(appointment.startTime).toLocaleDateString('en-US', {
                  weekday: 'long',
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                })}
              </p>
              <p className="text-gray-700 font-semibold mt-1">
                {new Date(appointment.startTime).toLocaleTimeString('en-US', {
                  hour: 'numeric',
                  minute: '2-digit',
                  hour12: true,
                })}
                {' - '}
                {new Date(appointment.endTime).toLocaleTimeString('en-US', {
                  hour: 'numeric',
                  minute: '2-digit',
                  hour12: true,
                })}
              </p>
            </div>
            <div>
              <h3 className="font-medium text-gray-900">Status</h3>
              <p className={`inline-block px-3 py-1 rounded-full text-sm font-medium ${
                appointment.status === 'confirmed'
                  ? 'bg-green-100 text-green-800'
                  : appointment.status === 'canceled'
                  ? 'bg-red-100 text-red-800'
                  : 'bg-gray-100 text-gray-800'
              }`}>
                {appointment.status.charAt(0).toUpperCase() + appointment.status.slice(1)}
              </p>
            </div>
          </div>

          {appointment.status === 'confirmed' && (
            <div className="mt-8 flex justify-end space-x-4">
              <button
                onClick={() => setShowRescheduleModal(true)}
                className="px-5 py-2 text-sm font-semibold text-teal-600 hover:bg-teal-50 rounded-xl transition-all border border-teal-600"
              >
                Reschedule
              </button>
              <button
                onClick={handleCancel}
                className="py-2 px-4 border border-transparent rounded-xl shadow-sm text-sm font-medium text-white bg-red-600 hover:bg-red-700 transition-all"
              >
                Cancel Appointment
              </button>
            </div>
          )}

          {appointment.status === 'canceled' && (
            <div className="mt-8 text-center">
              <p className="text-gray-600">This appointment has been canceled.</p>
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
