'use client';

import { useEffect, useState } from 'react';
import { Appointment, AppointmentStatus } from '@/db/types';
import { formatDate, formatTime } from '@/lib/calendar-utils';
import { apiRequest } from '@/lib/auth/api-client';
import { useAuth } from '@/contexts/AuthContext';

interface AppointmentListProps {
  currentDate: Date;
}

type FilterStatus = AppointmentStatus | 'all';
type SortField = 'start_time' | 'customer_name' | 'status';
type SortDirection = 'asc' | 'desc';

export function AppointmentList({ currentDate }: AppointmentListProps) {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedAppointments, setSelectedAppointments] = useState<Set<string>>(new Set());
  const { isAuthenticated, isLoading: authLoading } = useAuth();

  // Filters
  const [filterStatus, setFilterStatus] = useState<FilterStatus>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortField, setSortField] = useState<SortField>('start_time');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');

  useEffect(() => {
    if (authLoading) {
      return;
    }

    if (!isAuthenticated) {
      setAppointments([]);
      setLoading(false);
      return;
    }

    loadAppointments();
  }, [currentDate, isAuthenticated, authLoading]);

  async function loadAppointments() {
    if (!isAuthenticated) {
      setAppointments([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const start = new Date(currentDate);
      start.setHours(0, 0, 0, 0);

      const end = new Date(currentDate);
      end.setDate(end.getDate() + 30);
      end.setHours(23, 59, 59, 999);

      const params = new URLSearchParams({
        start: start.toISOString(),
        end: end.toISOString(),
      });

      const data = await apiRequest<Appointment[]>(`/api/appointments?${params.toString()}`);
      setAppointments(data);
    } catch (error) {
      console.error('Failed to load appointments:', error);
    } finally {
      setLoading(false);
    }
  }

  function toggleSelection(appointmentId: string) {
    const newSelection = new Set(selectedAppointments);
    if (newSelection.has(appointmentId)) {
      newSelection.delete(appointmentId);
    } else {
      newSelection.add(appointmentId);
    }
    setSelectedAppointments(newSelection);
  }

  function toggleSelectAll() {
    if (selectedAppointments.size === filteredAppointments.length) {
      setSelectedAppointments(new Set());
    } else {
      setSelectedAppointments(new Set(filteredAppointments.map(apt => apt.id)));
    }
  }

  async function handleBulkCancel() {
    if (!isAuthenticated) {
      alert('You must be signed in to cancel appointments.');
      return;
    }

    if (!confirm(`Cancel ${selectedAppointments.size} appointments?`)) return;

    try {
      const promises = Array.from(selectedAppointments).map(id =>
        apiRequest(`/api/appointments/${id}`, {
          method: 'PATCH',
          body: JSON.stringify({ status: 'cancelled' }),
        })
      );

      await Promise.all(promises);
      setSelectedAppointments(new Set());
      await loadAppointments();
    } catch (error) {
      console.error('Failed to cancel appointments:', error);
      alert('Failed to cancel some appointments');
    }
  }

  async function handleExport() {
    const data = filteredAppointments.map(apt => ({
      Date: formatDate(new Date(apt.start_time)),
      Time: formatTime(new Date(apt.start_time)),
      Customer: apt.customer_name,
      Email: apt.customer_email,
      Phone: apt.customer_phone,
      Status: apt.status,
      Notes: apt.notes,
    }));

    const csv = [
      Object.keys(data[0]).join(','),
      ...data.map(row => Object.values(row).map(v => `"${v || ''}"`).join(','))
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `appointments-${formatDate(currentDate)}.csv`;
    a.click();
  }

  function handleSort(field: SortField) {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  }

  // Apply filters and sorting
  let filteredAppointments = appointments.filter(apt => {
    if (filterStatus !== 'all' && apt.status !== filterStatus) return false;

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      return (
        apt.customer_name?.toLowerCase().includes(query) ||
        apt.customer_email?.toLowerCase().includes(query) ||
        apt.customer_phone?.toLowerCase().includes(query) ||
        apt.notes?.toLowerCase().includes(query)
      );
    }

    return true;
  });

  filteredAppointments.sort((a, b) => {
    let aVal: any, bVal: any;

    switch (sortField) {
      case 'start_time':
        aVal = new Date(a.start_time).getTime();
        bVal = new Date(b.start_time).getTime();
        break;
      case 'customer_name':
        aVal = a.customer_name || '';
        bVal = b.customer_name || '';
        break;
      case 'status':
        aVal = a.status;
        bVal = b.status;
        break;
    }

    if (aVal < bVal) return sortDirection === 'asc' ? -1 : 1;
    if (aVal > bVal) return sortDirection === 'asc' ? 1 : -1;
    return 0;
  });

  const statusColors: Record<string, string> = {
    pending: 'bg-yellow-100 text-yellow-800',
    confirmed: 'bg-teal-100 text-teal-800',
    cancelled: 'bg-gray-100 text-gray-600',
    canceled: 'bg-gray-100 text-gray-600',
    completed: 'bg-green-100 text-green-800',
  };

  if (loading) {
    return (
      <div className="bg-white rounded-2xl shadow-sm p-8 flex items-center justify-center">
        <div className="text-gray-500">Loading appointments...</div>
      </div>
    );
  }

  if (!authLoading && !isAuthenticated) {
    return (
      <div className="bg-white rounded-2xl shadow-sm p-8 flex items-center justify-center">
        <div className="text-gray-500">Please sign in to view appointments.</div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
      {/* Filters */}
      <div className="p-6 border-b border-gray-200 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-semibold text-gray-900">Appointments</h2>

          {selectedAppointments.size > 0 && (
            <div className="flex gap-2">
              <button
                onClick={handleBulkCancel}
                className="px-4 py-2 text-red-600 bg-red-50 rounded-lg font-medium hover:bg-red-100 transition-colors"
              >
                Cancel Selected ({selectedAppointments.size})
              </button>
            </div>
          )}
        </div>

        <div className="flex gap-4">
          <div className="flex-1">
            <input
              type="text"
              placeholder="Search by name, email, phone, or notes..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
            />
          </div>

          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value as FilterStatus)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
          >
            <option value="all">All Statuses</option>
            <option value="pending">Pending</option>
            <option value="confirmed">Confirmed</option>
            <option value="completed">Completed</option>
            <option value="cancelled">Cancelled</option>
          </select>

          <button
            onClick={handleExport}
            className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg font-medium hover:bg-gray-200 transition-colors flex items-center gap-2"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            Export
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left">
                <input
                  type="checkbox"
                  checked={selectedAppointments.size === filteredAppointments.length && filteredAppointments.length > 0}
                  onChange={toggleSelectAll}
                  className="rounded border-gray-300 text-teal-600 focus:ring-teal-500"
                />
              </th>
              <th
                className="px-6 py-3 text-left text-sm font-medium text-gray-700 cursor-pointer hover:bg-gray-100"
                onClick={() => handleSort('start_time')}
              >
                <div className="flex items-center gap-2">
                  Date & Time
                  {sortField === 'start_time' && (
                    <svg className={`w-4 h-4 ${sortDirection === 'desc' ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                    </svg>
                  )}
                </div>
              </th>
              <th
                className="px-6 py-3 text-left text-sm font-medium text-gray-700 cursor-pointer hover:bg-gray-100"
                onClick={() => handleSort('customer_name')}
              >
                <div className="flex items-center gap-2">
                  Customer
                  {sortField === 'customer_name' && (
                    <svg className={`w-4 h-4 ${sortDirection === 'desc' ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                    </svg>
                  )}
                </div>
              </th>
              <th className="px-6 py-3 text-left text-sm font-medium text-gray-700">Contact</th>
              <th
                className="px-6 py-3 text-left text-sm font-medium text-gray-700 cursor-pointer hover:bg-gray-100"
                onClick={() => handleSort('status')}
              >
                <div className="flex items-center gap-2">
                  Status
                  {sortField === 'status' && (
                    <svg className={`w-4 h-4 ${sortDirection === 'desc' ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                    </svg>
                  )}
                </div>
              </th>
              <th className="px-6 py-3 text-left text-sm font-medium text-gray-700">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {filteredAppointments.map((apt) => (
              <tr key={apt.id} className="hover:bg-gray-50">
                <td className="px-6 py-4">
                  <input
                    type="checkbox"
                    checked={selectedAppointments.has(apt.id)}
                    onChange={() => toggleSelection(apt.id)}
                    className="rounded border-gray-300 text-teal-600 focus:ring-teal-500"
                  />
                </td>
                <td className="px-6 py-4">
                  <div className="text-sm font-medium text-gray-900">
                    {formatDate(new Date(apt.start_time))}
                  </div>
                  <div className="text-sm text-gray-500">
                    {formatTime(new Date(apt.start_time))} - {formatTime(new Date(apt.end_time))}
                  </div>
                </td>
                <td className="px-6 py-4">
                  <div className="text-sm font-medium text-gray-900">{apt.customer_name}</div>
                </td>
                <td className="px-6 py-4">
                  <div className="text-sm text-gray-500">{apt.customer_email}</div>
                  <div className="text-sm text-gray-500">{apt.customer_phone}</div>
                </td>
                <td className="px-6 py-4">
                  <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${statusColors[apt.status] ?? 'bg-gray-100 text-gray-600'}`}>
                    {apt.status}
                  </span>
                </td>
                <td className="px-6 py-4">
                  <div className="flex gap-2">
                    <button
                      className="p-1 text-gray-500 hover:text-teal-600 hover:bg-teal-50 rounded transition-colors"
                      title="View details"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                      </svg>
                    </button>
                    <button
                      className="p-1 text-gray-500 hover:text-teal-600 hover:bg-teal-50 rounded transition-colors"
                      title="Edit"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                      </svg>
                    </button>
                    {apt.status !== 'cancelled' && (
                      <button
                        className="p-1 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                        title="Cancel"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {filteredAppointments.length === 0 && (
          <div className="text-center py-12 text-gray-500">
            No appointments found
          </div>
        )}
      </div>
    </div>
  );
}