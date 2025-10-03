'use client';

import { useState, useEffect } from 'react';
import { AppointmentStatus } from '@/db/types';
import { apiRequest } from '@/lib/auth/api-client';

interface Service {
  id: string;
  name: string;
  duration_minutes: number;
  price_cents: number;
  category_name?: string;
}

interface CreateAppointmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  defaultDate?: Date;
}

interface FormData {
  customer_name: string;
  customer_email: string;
  customer_phone: string;
  service_id: string;
  start_time: string;
  duration: number;
  notes: string;
  status: AppointmentStatus;
}

export function CreateAppointmentModal({ isOpen, onClose, onSuccess, defaultDate }: CreateAppointmentModalProps) {
  const [loading, setLoading] = useState(false);
  const [loadingServices, setLoadingServices] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [services, setServices] = useState<Service[]>([]);
  const [formData, setFormData] = useState<FormData>({
    customer_name: '',
    customer_email: '',
    customer_phone: '',
    service_id: '',
    start_time: defaultDate ? formatDateTimeLocal(defaultDate) : '',
    duration: 30,
    notes: '',
    status: 'confirmed',
  });

  useEffect(() => {
    if (isOpen) {
      loadServices();
      if (defaultDate) {
        setFormData(prev => ({ ...prev, start_time: formatDateTimeLocal(defaultDate) }));
      }
    }
  }, [isOpen, defaultDate]);

  async function loadServices() {
    setLoadingServices(true);
    try {
      const data = await apiRequest<Service[]>('/api/services');
      setServices(data);
      if (data.length > 0 && !formData.service_id) {
        setFormData(prev => ({ 
          ...prev, 
          service_id: data[0].id, 
          duration: data[0].duration_minutes 
        }));
      }
    } catch (err) {
      console.error('Failed to load services:', err);
      setError('Failed to load services. Please try again.');
    } finally {
      setLoadingServices(false);
    }
  }

  if (!isOpen) return null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      await apiRequest('/api/appointments/manual', {
        method: 'POST',
        body: JSON.stringify(formData),
      });

      onSuccess();
      onClose();
      resetForm();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to create appointment. Please try again.';
      setError(message);
    } finally {
      setLoading(false);
    }
  }

  function resetForm() {
    setFormData({
      customer_name: '',
      customer_email: '',
      customer_phone: '',
      service_id: services[0]?.id || '',
      start_time: defaultDate ? formatDateTimeLocal(defaultDate) : '',
      duration: services[0]?.duration_minutes || 30,
      notes: '',
      status: 'confirmed',
    });
    setError(null);
  }

  function handleClose() {
    if (!loading) {
      onClose();
      resetForm();
    }
  }

  const selectedService = services.find(s => s.id === formData.service_id);

  return (
    <div 
      className="fixed inset-0 bg-gray-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) handleClose();
      }}
    >
      <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex-shrink-0 bg-white border-b border-gray-200/60 px-6 py-5 flex items-center justify-between">
          <h2 className="text-2xl font-bold text-gray-900 tracking-tight">New Appointment</h2>
          <button
            onClick={handleClose}
            disabled={loading}
            className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-gray-100 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            aria-label="Close modal"
          >
            <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto">
          <form onSubmit={handleSubmit} className="p-6">
            {error && (
              <div className="mb-6 bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-xl flex items-start gap-3">
                <svg className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <div className="flex-1 text-sm leading-relaxed">{error}</div>
              </div>
            )}

            {/* Customer Information */}
            <div className="mb-8">
              <h3 className="text-base font-semibold text-gray-900 mb-4">Customer Information</h3>
              <div className="space-y-4">
                <div>
                  <label htmlFor="customer_name" className="block text-sm font-semibold text-gray-900 mb-2">
                    Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    id="customer_name"
                    required
                    value={formData.customer_name}
                    onChange={(e) => setFormData({ ...formData, customer_name: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent transition-all text-gray-900 placeholder-gray-400"
                    placeholder="John Doe"
                    disabled={loading}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="customer_email" className="block text-sm font-semibold text-gray-900 mb-2">
                      Email <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="email"
                      id="customer_email"
                      required
                      value={formData.customer_email}
                      onChange={(e) => setFormData({ ...formData, customer_email: e.target.value })}
                      className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent transition-all text-gray-900 placeholder-gray-400"
                      placeholder="john@example.com"
                      disabled={loading}
                    />
                  </div>

                  <div>
                    <label htmlFor="customer_phone" className="block text-sm font-semibold text-gray-900 mb-2">
                      Phone
                    </label>
                    <input
                      type="tel"
                      id="customer_phone"
                      value={formData.customer_phone}
                      onChange={(e) => setFormData({ ...formData, customer_phone: e.target.value })}
                      className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent transition-all text-gray-900 placeholder-gray-400"
                      placeholder="+1 (555) 123-4567"
                      disabled={loading}
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Appointment Details */}
            <div className="mb-8">
              <h3 className="text-base font-semibold text-gray-900 mb-4">Appointment Details</h3>
              <div className="space-y-4">
                <div>
                  <label htmlFor="service_id" className="block text-sm font-semibold text-gray-900 mb-2">
                    Service <span className="text-red-500">*</span>
                  </label>
                  {loadingServices ? (
                    <div className="w-full px-4 py-3 border border-gray-200 rounded-xl bg-gray-50 text-gray-500">
                      Loading services...
                    </div>
                  ) : (
                    <select
                      id="service_id"
                      required
                      value={formData.service_id}
                      onChange={(e) => {
                        const serviceId = e.target.value;
                        const service = services.find(s => s.id === serviceId);
                        setFormData({
                          ...formData,
                          service_id: serviceId,
                          duration: service?.duration_minutes ?? formData.duration
                        });
                      }}
                      className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent transition-all text-gray-900 bg-white disabled:bg-gray-50 disabled:text-gray-500"
                      disabled={loading || services.length === 0}
                    >
                      {services.length === 0 ? (
                        <option value="">No services available</option>
                      ) : (
                        <>
                          <option value="">Select a service</option>
                          {services.map(service => (
                            <option key={service.id} value={service.id}>
                              {service.name} • {service.duration_minutes} min • ${(service.price_cents / 100).toFixed(2)}
                            </option>
                          ))}
                        </>
                      )}
                    </select>
                  )}
                  {selectedService && (
                    <div className="mt-2 px-3 py-2 bg-teal-50 border border-teal-100 rounded-lg">
                      <div className="text-sm text-teal-900 font-medium">{selectedService.name}</div>
                      <div className="text-xs text-teal-700 mt-0.5">
                        {selectedService.duration_minutes} minutes • ${(selectedService.price_cents / 100).toFixed(2)}
                      </div>
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="start_time" className="block text-sm font-semibold text-gray-900 mb-2">
                      Start Time <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="datetime-local"
                      id="start_time"
                      required
                      value={formData.start_time}
                      onChange={(e) => setFormData({ ...formData, start_time: e.target.value })}
                      className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent transition-all text-gray-900"
                      disabled={loading}
                    />
                  </div>

                  <div>
                    <label htmlFor="duration" className="block text-sm font-semibold text-gray-900 mb-2">
                      Duration (minutes) <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="number"
                      id="duration"
                      required
                      min="5"
                      step="5"
                      value={formData.duration}
                      onChange={(e) => setFormData({ ...formData, duration: parseInt(e.target.value) || 0 })}
                      className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent transition-all text-gray-900"
                      disabled={loading}
                    />
                  </div>
                </div>

                <div>
                  <label htmlFor="status" className="block text-sm font-semibold text-gray-900 mb-2">
                    Status <span className="text-red-500">*</span>
                  </label>
                  <select
                    id="status"
                    required
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value as AppointmentStatus })}
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent transition-all text-gray-900 bg-white"
                    disabled={loading}
                  >
                    <option value="confirmed">Confirmed</option>
                    <option value="completed">Completed</option>
                    <option value="canceled">Cancelled</option>
                  </select>
                </div>

                <div>
                  <label htmlFor="notes" className="block text-sm font-semibold text-gray-900 mb-2">
                    Notes
                  </label>
                  <textarea
                    id="notes"
                    rows={3}
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent transition-all resize-none text-gray-900 placeholder-gray-400"
                    placeholder="Additional notes or special requests..."
                    disabled={loading}
                  />
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-3 justify-end pt-6 border-t border-gray-200/60">
              <button
                type="button"
                onClick={handleClose}
                disabled={loading}
                className="px-6 py-3 text-sm font-semibold text-gray-700 hover:bg-gray-50 rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading || services.length === 0}
                className="px-6 py-3 bg-gradient-to-r from-teal-600 to-green-600 text-white rounded-xl font-semibold hover:shadow-lg hover:scale-[1.02] transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 disabled:hover:shadow-none flex items-center gap-2"
              >
                {loading ? (
                  <>
                    <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Creating...
                  </>
                ) : (
                  'Create Appointment'
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

function formatDateTimeLocal(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  return `${year}-${month}-${day}T${hours}:${minutes}`;
}
