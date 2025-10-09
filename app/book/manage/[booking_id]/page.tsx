'use client';

import { useState, useEffect } from 'react';
import { useParams, useSearchParams } from 'next/navigation';

// TODO: Define a proper type for the appointment
interface Appointment {
  id: string;
  bookingId: string;
  serviceName: string;
  startTime: string;
  endTime: string;
  customerName: string;
  status: string;
}

export default function ManageAppointmentPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const bookingId = params.booking_id as string;
  const token = searchParams.get('token');

  const [appointment, setAppointment] = useState<Appointment | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center items-center">
      <div className="max-w-lg w-full bg-white p-8 shadow-2xl rounded-2xl">
        <h1 className="text-2xl font-bold text-center text-gray-800 mb-4">
          Booking Details
        </h1>
        <p className="text-center text-gray-600 mb-6">Booking ID: {appointment.bookingId}</p>
        <div className="space-y-4">
            <div>
                <h3 className="font-medium text-gray-900">Service</h3>
                <p className="text-gray-700">{appointment.serviceName}</p>
            </div>
            <div>
                <h3 className="font-medium text-gray-900">When</h3>
                <p className="text-gray-700">{new Date(appointment.startTime).toLocaleString()}</p>
            </div>
            <div>
                <h3 className="font-medium text-gray-900">Status</h3>
                <p className="text-gray-700 capitalize">{appointment.status}</p>
            </div>
        </div>
        {appointment.status === 'confirmed' && (
            <div className="mt-8 flex justify-end space-x-4">
                <button 
                    onClick={() => alert('Rescheduling is not implemented yet.')} 
                    className="px-5 py-2 text-sm font-semibold text-teal-600 hover:bg-teal-50 rounded-xl transition-all"
                >
                    Reschedule
                </button>
                <button 
                    onClick={handleCancel}
                    className="py-2 px-4 border border-transparent rounded-xl shadow-sm text-sm font-medium text-white bg-red-600 hover:bg-red-700"
                >
                    Cancel Appointment
                </button>
            </div>
        )}
      </div>
    </div>
  );
}
