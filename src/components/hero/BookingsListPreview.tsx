'use client';

import { useState, useEffect } from 'react';

interface Booking {
  id: string;
  clientName: string;
  clientEmail: string;
  startTime: string;
  endTime: string;
  duration: number;
  status: 'confirmed' | 'pending' | 'completed';
  notes?: string;
}

export function BookingsListPreview() {
  const [mounted, setMounted] = useState(false);
  const [hoveredId, setHoveredId] = useState<string | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Mock booking data - matches AppointmentCard structure
  const bookings: Booking[] = [
    {
      id: '1',
      clientName: 'Sarah Johnson',
      clientEmail: 'sarah.j@email.com',
      startTime: '09:00',
      endTime: '09:45',
      duration: 45,
      status: 'confirmed',
    },
    {
      id: '2',
      clientName: 'Michael Chen',
      clientEmail: 'mchen@email.com',
      startTime: '10:30',
      endTime: '11:00',
      duration: 30,
      status: 'confirmed',
    },
    {
      id: '3',
      clientName: 'Emma Wilson',
      clientEmail: 'ewilson@email.com',
      startTime: '11:45',
      endTime: '13:15',
      duration: 90,
      status: 'pending',
      notes: 'First time client',
    },
    {
      id: '4',
      clientName: 'James Brown',
      clientEmail: 'jbrown@email.com',
      startTime: '14:00',
      endTime: '15:00',
      duration: 60,
      status: 'confirmed',
    },
  ];

  // Matches AppointmentCard status colors
  const statusColors = {
    pending: 'bg-yellow-100 text-yellow-800 border-yellow-200',
    confirmed: 'bg-teal-100 text-teal-800 border-teal-200',
    completed: 'bg-green-100 text-green-800 border-green-200',
  };

  const getStatusColor = (status: Booking['status']) => {
    return statusColors[status] ?? '';
  };

  const getStatusIcon = (status: Booking['status']) => {
    switch (status) {
      case 'pending':
        return (
          <svg className="w-3 h-3 text-yellow-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3" />
          </svg>
        );
      case 'confirmed':
        return (
          <svg className="w-3 h-3 text-teal-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        );
      case 'completed':
        return (
          <svg className="w-3 h-3 text-green-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        );
      default:
        return null;
    }
  };

  const getAvatar = (name: string) => {
    if (!name) return '';
    const parts = name.trim().split(/\s+/).filter(Boolean);
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  };

  return (
    <div className={`bg-white rounded-2xl shadow-lg shadow-gray-200/50 border border-gray-200/60 overflow-hidden transition-all duration-700 delay-200 ${
      mounted ? 'opacity-100 scale-100' : 'opacity-0 scale-95'
    }`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">Today's Schedule</h3>
          <p className="text-sm text-gray-500">4 appointments</p>
        </div>
        <button className="px-4 py-2 text-sm font-medium text-teal-600 hover:bg-teal-50 rounded-lg transition-colors">
          View all
        </button>
      </div>

      {/* Bookings List */}
      <div className="space-y-3">
        {bookings.map((booking, index) => (
          <div
            key={booking.id}
            onMouseEnter={() => setHoveredId(booking.id)}
            onMouseLeave={() => setHoveredId(null)}
            className={`
              group relative p-4 rounded-2xl border-2 transition-all duration-300 cursor-pointer
              ${hoveredId === booking.id
                ? 'border-teal-300 bg-teal-50/50 shadow-lg shadow-teal-500/10 scale-[1.02]'
                : 'border-gray-100 bg-gray-50/50 hover:border-gray-200'
              }
              ${mounted ? 'opacity-100 translate-x-0' : 'opacity-0 translate-x-4'}
            `}
            style={{
              transitionDelay: `${index * 100 + 300}ms`,
            }}
          >
            <div className="flex items-center gap-4">
              {/* Avatar */}
              <div className={`
                w-12 h-12 rounded-xl flex items-center justify-center text-white font-semibold text-sm
                bg-gradient-to-br from-teal-500 to-teal-600
                transition-transform duration-300
                ${hoveredId === booking.id ? 'scale-110' : ''}
              `}>
                {getAvatar(booking.clientName)}
              </div>

              {/* Booking Info */}
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-gray-900 truncate">{booking.clientName}</p>
                <p className="text-sm text-gray-600 truncate">{booking.notes ?? booking.clientEmail}</p>
              </div>

              {/* Time */}
              <div className="text-right">
                <p className="text-sm font-semibold text-gray-900">{`${booking.startTime} - ${booking.endTime}`}</p>
                <span className={`
                  inline-flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-medium border
                  transition-all duration-300
                  ${getStatusColor(booking.status)}
                `}>
                  {getStatusIcon(booking.status)}
                  {booking.status.charAt(0).toUpperCase() + booking.status.slice(1)}
                </span>
              </div>
            </div>

            {/* Hover Action Buttons */}
            <div className={`
              absolute right-4 top-1/2 -translate-y-1/2 flex gap-2
              transition-all duration-300
              ${hoveredId === booking.id ? 'opacity-100 translate-x-0' : 'opacity-0 translate-x-4 pointer-events-none'}
            `}>
              <button className="p-2 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors shadow-sm">
                <svg className="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Add New Button */}
      <button className="w-full mt-4 py-3 border-2 border-dashed border-gray-200 rounded-2xl text-sm font-medium text-gray-600 hover:border-teal-300 hover:text-teal-600 hover:bg-teal-50/30 transition-all duration-300 flex items-center justify-center gap-2">
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
        </svg>
        Add new appointment
      </button>
    </div>
  );
}
