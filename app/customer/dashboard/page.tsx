"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import RescheduleModal from './components/RescheduleModal';

type AppointmentStatus = 'confirmed' | 'canceled' | 'completed' | 'no_show';

interface Appointment {
  id: string;
  bookingId: string;
  businessName: string;
  subdomain: string;
  serviceName: string;
  serviceId?: string;
  categoryName: string;
  startTime: string;
  endTime: string;
  duration: number;
  price: number;
  status: AppointmentStatus;
  serviceColor: string;
}

type FilterTab = 'all' | 'upcoming' | 'past' | 'canceled';

interface RescheduleState {
  appointmentId: string;
  bookingId: string;
  businessName: string;
  subdomain: string;
  serviceName: string;
  serviceId: string;
  currentStartTime: string;
  currentEndTime: string;
  duration: number;
}

function CustomerDashboardContent() {
  const router = useRouter();
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeFilter, setActiveFilter] = useState<FilterTab>('upcoming');
  const [cancelingId, setCancelingId] = useState<string | null>(null);
  const [linkingBookings, setLinkingBookings] = useState(false);
  const [reschedulingAppointment, setReschedulingAppointment] = useState<RescheduleState | null>(null);

  useEffect(() => {
    fetchAppointments();
  }, [activeFilter]);

  async function fetchAppointments() {
    setLoading(true);
    setError(null);

    try {
      // Get access token from localStorage (set during login)
      const accessToken = localStorage.getItem('accessToken');
      if (!accessToken) {
        router.push('/customer/login');
        return;
      }

      let url = '/api/customer/appointments';
      const params = new URLSearchParams();

      if (activeFilter === 'upcoming') {
        params.append('upcoming', 'true');
        params.append('status', 'confirmed');
      } else if (activeFilter === 'past') {
        // Past appointments (confirmed or completed)
        // We'll filter on client side for now
      } else if (activeFilter === 'canceled') {
        params.append('status', 'canceled');
      }

      if (params.toString()) {
        url += `?${params.toString()}`;
      }

      const response = await fetch(url, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

      if (response.status === 401) {
        // Token expired, redirect to login
        localStorage.removeItem('accessToken');
        router.push('/customer/login');
        return;
      }

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch appointments');
      }

      // Client-side filtering for past appointments
      let filtered = data.appointments;
      if (activeFilter === 'past') {
        const now = new Date();
        filtered = filtered.filter((apt: Appointment) =>
          new Date(apt.startTime) < now && apt.status !== 'canceled'
        );
      }

      setAppointments(filtered);
    } catch (err: any) {
      setError(err.message || 'Failed to load appointments');
    } finally {
      setLoading(false);
    }
  }

  async function handleCancelAppointment(appointmentId: string, bookingId: string) {
    if (!confirm(`Are you sure you want to cancel booking ${bookingId}?`)) {
      return;
    }

    setCancelingId(appointmentId);

    try {
      const accessToken = localStorage.getItem('accessToken');
      if (!accessToken) {
        router.push('/customer/login');
        return;
      }

      const response = await fetch(`/api/customer/appointments/${appointmentId}/cancel`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to cancel appointment');
      }

      alert('Appointment canceled successfully');
      fetchAppointments(); // Refresh list
    } catch (err: any) {
      alert(err.message || 'Failed to cancel appointment');
    } finally {
      setCancelingId(null);
    }
  }

  async function handleLinkGuestBookings() {
    setLinkingBookings(true);

    try {
      const accessToken = localStorage.getItem('accessToken');
      if (!accessToken) {
        router.push('/customer/login');
        return;
      }

      const response = await fetch('/api/customer/link-bookings', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to link bookings');
      }

      if (data.linkedBookings > 0) {
        alert(`Successfully linked ${data.linkedBookings} guest booking(s) to your account!`);
        fetchAppointments(); // Refresh list
      } else {
        alert('No guest bookings found to link.');
      }
    } catch (err: any) {
      alert(err.message || 'Failed to link bookings');
    } finally {
      setLinkingBookings(false);
    }
  }

  async function handleRescheduleAppointment(appointment: Appointment) {
    // If serviceId is missing, fetch full appointment details to get it
    let serviceId = appointment.serviceId;

    if (!serviceId || serviceId === 'unknown') {
      try {
        const accessToken = localStorage.getItem('accessToken');
        const response = await fetch(`/api/customer/appointments/${appointment.id}`, {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        });

        if (response.ok) {
          const data = await response.json();
          // Try to get external_id from service details
          // For now, we'll show an error if it's still not available
          serviceId = data.appointment?.service?.external_id || null;
        }
      } catch (error) {
        console.error('Failed to fetch appointment details:', error);
      }

      if (!serviceId) {
        alert('Cannot reschedule this appointment. Service information is missing. Please contact support.');
        return;
      }
    }

    setReschedulingAppointment({
      appointmentId: appointment.id,
      bookingId: appointment.bookingId,
      businessName: appointment.businessName,
      subdomain: appointment.subdomain,
      serviceName: appointment.serviceName,
      serviceId,
      currentStartTime: appointment.startTime,
      currentEndTime: appointment.endTime,
      duration: appointment.duration,
    });
  }

  function formatDateTime(isoString: string): string {
    const date = new Date(isoString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });
  }

  function formatPrice(cents: number): string {
    return `$${(cents / 100).toFixed(2)}`;
  }

  function getStatusBadgeColor(status: AppointmentStatus): string {
    switch (status) {
      case 'confirmed':
        return 'bg-green-100 text-green-800';
      case 'canceled':
        return 'bg-red-100 text-red-800';
      case 'completed':
        return 'bg-blue-100 text-blue-800';
      case 'no_show':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-teal-50 to-green-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex justify-between items-center">
            <h1 className="text-2xl font-semibold text-gray-900">Your Bookings</h1>
            <button
              onClick={() => {
                localStorage.removeItem('accessToken');
                router.push('/customer/login');
              }}
              className="text-sm text-gray-600 hover:text-gray-900"
            >
              Sign Out
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Filter Tabs */}
        <div className="mb-6 flex gap-2">
          <button
            onClick={() => setActiveFilter('upcoming')}
            className={`px-4 py-2 rounded-lg font-medium transition ${
              activeFilter === 'upcoming'
                ? 'bg-teal-600 text-white'
                : 'bg-white text-gray-700 hover:bg-gray-50'
            }`}
          >
            Upcoming
          </button>
          <button
            onClick={() => setActiveFilter('past')}
            className={`px-4 py-2 rounded-lg font-medium transition ${
              activeFilter === 'past'
                ? 'bg-teal-600 text-white'
                : 'bg-white text-gray-700 hover:bg-gray-50'
            }`}
          >
            Past
          </button>
          <button
            onClick={() => setActiveFilter('canceled')}
            className={`px-4 py-2 rounded-lg font-medium transition ${
              activeFilter === 'canceled'
                ? 'bg-teal-600 text-white'
                : 'bg-white text-gray-700 hover:bg-gray-50'
            }`}
          >
            Canceled
          </button>
          <button
            onClick={() => setActiveFilter('all')}
            className={`px-4 py-2 rounded-lg font-medium transition ${
              activeFilter === 'all'
                ? 'bg-teal-600 text-white'
                : 'bg-white text-gray-700 hover:bg-gray-50'
            }`}
          >
            All
          </button>
        </div>

        {/* Loading State */}
        {loading && (
          <div className="text-center py-12">
            <p className="text-gray-600">Loading appointments...</p>
          </div>
        )}

        {/* Error State */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
            <p className="text-red-700">{error}</p>
          </div>
        )}

        {/* Empty State */}
        {!loading && !error && appointments.length === 0 && (
          <div className="text-center py-12 bg-white rounded-2xl shadow-sm">
            <p className="text-gray-600 mb-4">No appointments found</p>
            <div className="flex flex-col gap-3 items-center">
              <button
                onClick={handleLinkGuestBookings}
                disabled={linkingBookings}
                className="px-6 py-2 border border-teal-600 text-teal-700 rounded-lg font-medium hover:bg-teal-50 disabled:opacity-50"
              >
                {linkingBookings ? 'Checking...' : 'Link Previous Guest Bookings'}
              </button>
              <span className="text-gray-500 text-sm">or</span>
              <Link
                href="/book"
                className="inline-block px-6 py-2 bg-gradient-to-r from-teal-600 to-green-600 text-white rounded-lg font-medium hover:from-teal-700 hover:to-green-700"
              >
                Book an Appointment
              </Link>
            </div>
          </div>
        )}

        {/* Appointments List */}
        {!loading && !error && appointments.length > 0 && (
          <div className="space-y-4">
            {appointments.map((appointment) => (
              <div
                key={appointment.id}
                className="bg-white rounded-2xl shadow-sm p-6 hover:shadow-md transition"
              >
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-xl font-semibold text-gray-900">
                        {appointment.businessName}
                      </h3>
                      <span className={`px-2 py-1 text-xs rounded-full font-medium ${getStatusBadgeColor(appointment.status)}`}>
                        {appointment.status}
                      </span>
                    </div>

                    <div className="flex items-center gap-2 mb-1">
                      <div
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: appointment.serviceColor }}
                      />
                      <p className="text-gray-700 font-medium">
                        {appointment.serviceName} • {appointment.duration} min
                      </p>
                    </div>

                    <p className="text-gray-600 text-sm mb-1">
                      {formatDateTime(appointment.startTime)}
                    </p>

                    <p className="text-gray-500 text-sm">
                      Booking ID: <span className="font-mono font-medium">{appointment.bookingId}</span>
                    </p>

                    <p className="text-teal-700 font-semibold mt-2">
                      {formatPrice(appointment.price)}
                    </p>
                  </div>

                  <div className="flex flex-col gap-2 ml-4">
                    {appointment.status === 'confirmed' && new Date(appointment.startTime) > new Date() && (
                      <>
                        <button
                          onClick={() => handleCancelAppointment(appointment.id, appointment.bookingId)}
                          disabled={cancelingId === appointment.id}
                          className="px-4 py-2 border border-red-300 text-red-700 rounded-lg hover:bg-red-50 transition disabled:opacity-50 text-sm font-medium"
                        >
                          {cancelingId === appointment.id ? 'Canceling...' : 'Cancel'}
                        </button>
                        <button
                          onClick={() => handleRescheduleAppointment(appointment)}
                          className="px-4 py-2 border border-teal-300 text-teal-700 rounded-lg hover:bg-teal-50 transition text-sm font-medium"
                        >
                          Reschedule
                        </button>
                      </>
                    )}
                    <Link
                      href={`/book/${appointment.subdomain}`}
                      className="px-4 py-2 text-gray-700 text-center rounded-lg hover:bg-gray-100 transition text-sm font-medium"
                    >
                      View Business
                    </Link>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Reschedule Modal */}
      {reschedulingAppointment && (
        <RescheduleModal
          appointmentId={reschedulingAppointment.appointmentId}
          bookingId={reschedulingAppointment.bookingId}
          businessName={reschedulingAppointment.businessName}
          subdomain={reschedulingAppointment.subdomain}
          serviceName={reschedulingAppointment.serviceName}
          serviceId={reschedulingAppointment.serviceId}
          currentStartTime={reschedulingAppointment.currentStartTime}
          currentEndTime={reschedulingAppointment.currentEndTime}
          duration={reschedulingAppointment.duration}
          onClose={() => setReschedulingAppointment(null)}
          onSuccess={() => {
            fetchAppointments();
            setReschedulingAppointment(null);
          }}
        />
      )}
    </div>
  );
}

export default function CustomerDashboardPage() {
  return (
    <ProtectedRoute requireRole="customer">
      <CustomerDashboardContent />
    </ProtectedRoute>
  );
}
