'use client';

import { useState, useEffect } from 'react';
import { Appointment } from '@/db/types';
import { formatTime, snapToGrain, GRAIN_MINUTES } from '@/lib/calendar-utils';
import { apiRequest } from '@/lib/auth/api-client';

interface Service {
  id: string;
  name: string;
  duration_minutes: number;
  price_cents: number;
  color: string;
  category_name: string;
}

interface AppointmentEditModalProps {
  appointment: Appointment;
  onClose: () => void;
  onSave: (updatedAppointment?: Appointment) => void;
}

export function AppointmentEditModal({ appointment, onClose, onSave }: AppointmentEditModalProps) {
  const [loading, setLoading] = useState(false);
  const [services, setServices] = useState<Service[]>([]);
  const [notifyCustomer, setNotifyCustomer] = useState(true);

  // Form state
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [selectedTime, setSelectedTime] = useState<string>('');
  const [selectedServiceId, setSelectedServiceId] = useState<string>('');
  const [customerName, setCustomerName] = useState('');
  const [customerEmail, setCustomerEmail] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [notes, setNotes] = useState('');
  const [status, setStatus] = useState<string>('confirmed');

  // Computed values
  const selectedService = services.find(s => s.id === selectedServiceId);
  const endTime = selectedService && selectedTime
    ? calculateEndTime(selectedTime, selectedService.duration_minutes)
    : '';

  useEffect(() => {
    loadServices();

    // Initialize form with appointment data
    const startDate = new Date(appointment.start_time);
    setSelectedDate(startDate.toISOString().split('T')[0]);
    setSelectedTime(formatTimeForInput(startDate));
    setSelectedServiceId(appointment.service_id || '');
    setCustomerName(appointment.customer_name || '');
    setCustomerEmail(appointment.customer_email || appointment.guest_email || '');
    setCustomerPhone(appointment.customer_phone || appointment.guest_phone || '');
    setNotes(appointment.notes || '');
    setStatus(appointment.status);
  }, [appointment]);

  async function loadServices() {
    try {
      const data = await apiRequest<Service[]>('/api/services');
      setServices(data);
    } catch (error) {
      console.error('Failed to load services:', error);
    }
  }

  function formatTimeForInput(date: Date): string {
    const hours = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');
    return `${hours}:${minutes}`;
  }

  function calculateEndTime(startTime: string, durationMinutes: number): string {
    const [hours, minutes] = startTime.split(':').map(Number);
    const start = new Date();
    start.setHours(hours, minutes, 0, 0);

    const end = new Date(start);
    end.setMinutes(end.getMinutes() + durationMinutes);

    return formatTimeForInput(end);
  }

  // Generate 5-minute grain time options
  function generateTimeOptions(): string[] {
    const options: string[] = [];
    const startHour = 6;
    const endHour = 22;

    for (let hour = startHour; hour < endHour; hour++) {
      for (let minute = 0; minute < 60; minute += GRAIN_MINUTES) {
        const time = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
        options.push(time);
      }
    }

    return options;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!selectedDate || !selectedTime || !selectedServiceId) {
      alert('Please fill in all required fields');
      return;
    }

    setLoading(true);

    try {
      const newStartTime = new Date(`${selectedDate}T${selectedTime}`);
      const snappedTime = snapToGrain(newStartTime);

      const originalStart = new Date(appointment.start_time);
      const timeChanged = snappedTime.getTime() !== originalStart.getTime();
      const serviceChanged = selectedServiceId !== appointment.service_id;

      if (timeChanged || serviceChanged) {
        const response = await apiRequest<{ success: boolean; appointment?: Appointment }>('/api/appointments/reschedule', {
          method: 'POST',
          body: JSON.stringify({
            appointmentId: appointment.id,
            newStartTime: snappedTime.toISOString(),
            serviceId: selectedServiceId !== appointment.service_id ? selectedServiceId : undefined,
            notifyCustomer,
          }),
        });

        // Pass the updated appointment back to parent
        onSave(response.appointment);
      } else {
        // No changes made
        onSave();
      }
    } catch (error) {
      console.error('Failed to update appointment:', error);
      alert(error instanceof Error ? error.message : 'Failed to update appointment');
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete() {
    if (!confirm('Cancel this appointment? Customer will be notified.')) {
      return;
    }

    setLoading(true);

    try {
      await apiRequest(`/api/appointments/${appointment.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ status: 'cancelled' }),
      });

      onSave();
    } catch (error) {
      console.error('Failed to cancel appointment:', error);
      alert('Failed to cancel appointment');
    } finally {
      setLoading(false);
    }
  }


  return (
    <div className="fixed inset-0 bg-gray-900/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="px-8 py-6 border-b border-gray-100">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-bold text-gray-900 tracking-tight">Edit Appointment</h2>
            <button
              onClick={onClose}
              className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-gray-100 text-gray-400 hover:text-gray-900 transition-all"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Form - Scrollable */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto px-8 py-6">
          <div className="space-y-8">
            {/* Date & Time Section */}
            <div className="space-y-4">
              <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider">Schedule</h3>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-900 mb-2">
                    Date
                  </label>
                  <input
                    type="date"
                    value={selectedDate}
                    onChange={(e) => setSelectedDate(e.target.value)}
                    className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl text-sm text-gray-900 focus:ring-2 focus:ring-teal-500 focus:border-teal-500 transition-all"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-900 mb-2">
                    Start Time
                  </label>
                  <select
                    value={selectedTime}
                    onChange={(e) => setSelectedTime(e.target.value)}
                    className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl text-sm text-gray-900 focus:ring-2 focus:ring-teal-500 focus:border-teal-500 transition-all appearance-none bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTIiIGhlaWdodD0iOCIgdmlld0JveD0iMCAwIDEyIDgiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PHBhdGggZD0iTTEgMS41TDYgNi41TDExIDEuNSIgc3Ryb2tlPSIjNkI3MjgwIiBzdHJva2Utd2lkdGg9IjIiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIgc3Ryb2tlLWxpbmVqb2luPSJyb3VuZCIvPjwvc3ZnPg==')] bg-[length:12px] bg-[right_1rem_center] bg-no-repeat pr-10"
                    required
                  >
                    <option value="">Select time</option>
                    {generateTimeOptions().map(time => (
                      <option key={time} value={time}>{time}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {/* Service Section */}
            <div className="space-y-4">
              <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider">Service</h3>

              <div>
                <select
                  value={selectedServiceId}
                  onChange={(e) => setSelectedServiceId(e.target.value)}
                  className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl text-sm text-gray-900 focus:ring-2 focus:ring-teal-500 focus:border-teal-500 transition-all appearance-none bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTIiIGhlaWdodD0iOCIgdmlld0JveD0iMCAwIDEyIDgiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PHBhdGggZD0iTTEgMS41TDYgNi41TDExIDEuNSIgc3Ryb2tlPSIjNkI3MjgwIiBzdHJva2Utd2lkdGg9IjIiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIgc3Ryb2tlLWxpbmVqb2luPSJyb3VuZCIvPjwvc3ZnPg==')] bg-[length:12px] bg-[right_1rem_center] bg-no-repeat pr-10"
                  required
                >
                  <option value="">Select service</option>
                  {services.map(service => (
                    <option key={service.id} value={service.id}>
                      {service.name} ({service.duration_minutes} min)
                    </option>
                  ))}
                </select>
              </div>

              {/* Duration Preview */}
              {selectedService && (
                <div className="bg-gray-50 border border-gray-100 rounded-xl p-4">
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-500">Duration</span>
                      <span className="font-semibold text-gray-900">{selectedService.duration_minutes} min</span>
                    </div>
                    {endTime && (
                      <div className="flex justify-between">
                        <span className="text-gray-500">End Time</span>
                        <span className="font-semibold text-gray-900">{endTime}</span>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Customer Information Section */}
            <div className="space-y-4">
              <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider">Customer Information</h3>

              <div>
                <label className="block text-sm font-semibold text-gray-900 mb-2">
                  Name
                </label>
                <input
                  type="text"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl text-sm text-gray-900 placeholder-gray-400 focus:ring-2 focus:ring-teal-500 focus:border-teal-500 transition-all"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-900 mb-2">
                    Email
                  </label>
                  <input
                    type="email"
                    value={customerEmail}
                    onChange={(e) => setCustomerEmail(e.target.value)}
                    className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl text-sm text-gray-900 placeholder-gray-400 focus:ring-2 focus:ring-teal-500 focus:border-teal-500 transition-all"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-900 mb-2">
                    Phone
                  </label>
                  <input
                    type="tel"
                    value={customerPhone}
                    onChange={(e) => setCustomerPhone(e.target.value)}
                    className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl text-sm text-gray-900 placeholder-gray-400 focus:ring-2 focus:ring-teal-500 focus:border-teal-500 transition-all"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-900 mb-2">
                  Notes
                </label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={3}
                  className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl text-sm text-gray-900 placeholder-gray-400 focus:ring-2 focus:ring-teal-500 focus:border-teal-500 transition-all resize-none"
                  placeholder="Add any additional notes..."
                />
              </div>
            </div>

            {/* Notification Toggle */}
            <div className="flex items-center gap-3 p-4 bg-gray-50 border border-gray-100 rounded-xl">
              <input
                type="checkbox"
                id="notifyCustomer"
                checked={notifyCustomer}
                onChange={(e) => setNotifyCustomer(e.target.checked)}
                className="w-5 h-5 text-teal-600 border-gray-300 rounded focus:ring-teal-500"
              />
              <label htmlFor="notifyCustomer" className="flex-1 text-sm font-semibold text-gray-900">
                Notify customer of changes via email
              </label>
            </div>
          </div>
        </form>

        {/* Footer - Action Buttons */}
        <div className="px-8 py-6 border-t border-gray-100 flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={handleDelete}
            disabled={loading}
            className="px-5 py-2.5 text-sm font-semibold text-red-700 hover:bg-red-50 rounded-xl transition-all disabled:opacity-50"
          >
            Cancel Appointment
          </button>

          <div className="flex gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="px-5 py-2.5 text-sm font-semibold text-gray-700 hover:bg-gray-50 rounded-xl transition-all disabled:opacity-50"
            >
              Close
            </button>
            <button
              onClick={handleSubmit}
              disabled={loading}
              className="px-6 py-3 bg-gradient-to-r from-teal-600 to-green-600 text-white rounded-2xl font-semibold hover:shadow-lg hover:scale-[1.02] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
