'use client';

import { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { useAuth } from '@/contexts/AuthContext';
import { BusinessProvider, useBusiness } from '@/contexts/BusinessContext';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { DashboardSidebar } from '@/components/dashboard/DashboardSidebar';
import { BusinessSelector } from '@/components/dashboard/BusinessSelector';
import { Logo } from '@/components/Logo';

interface OffDay {
  date: string;
  reason: string;
  closed: boolean;
  open?: string;
  close?: string;
}

interface ExistingBooking {
  id: string;
  bookingId: string;
  startTime: string;
  endTime: string;
  serviceName: string;
  customerName: string;
  customerEmail: string;
}

function SettingsContent() {
  const t = useTranslations('dashboard.settings');
  const tCommon = useTranslations('dashboard');
  const { user, accessToken, isAuthenticated, logout } = useAuth();
  const { businesses, selectedBusiness, selectedBusinessId, isLoading: businessLoading, selectBusiness } = useBusiness();

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [errors, setErrors] = useState<string[]>([]);
  const [success, setSuccess] = useState(false);
  const [pending, setPending] = useState(false);

  // Off days state
  const [offDays, setOffDays] = useState<OffDay[]>([]);
  const [loadingOffDays, setLoadingOffDays] = useState(false);
  const [showAddOffDay, setShowAddOffDay] = useState(false);
  const [offDayDate, setOffDayDate] = useState('');
  const [offDayReason, setOffDayReason] = useState('');
  const [offDayError, setOffDayError] = useState<string | null>(null);
  const [offDaySuccess, setOffDaySuccess] = useState<string | null>(null);
  const [savingOffDay, setSavingOffDay] = useState(false);
  const [checkingBookings, setCheckingBookings] = useState(false);
  const [existingBookings, setExistingBookings] = useState<ExistingBooking[]>([]);
  const [showBookingWarning, setShowBookingWarning] = useState(false);

  const businessName = selectedBusiness?.name || user?.email?.split('@')[0] || "My Business";

  async function handlePasswordChange(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setErrors([]);

    if (newPassword !== confirmPassword) {
      setError(t('password.passwordsDoNotMatch'));
      return;
    }

    if (currentPassword === newPassword) {
      setError(t('password.samePassword'));
      return;
    }

    setPending(true);

    try {
      const res = await fetch('/api/auth/change-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`,
        },
        body: JSON.stringify({ currentPassword, newPassword }),
      });

      const data = await res.json();

      if (!res.ok) {
        if (data.errors) {
          setErrors(data.errors);
        }
        throw new Error(data.error || t('password.changeFailed'));
      }

      setSuccess(true);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');

      setTimeout(() => setSuccess(false), 3000);
    } catch (err: any) {
      setError(err?.message || t('password.changeFailed'));
    } finally {
      setPending(false);
    }
  }

  // Fetch off days
  useEffect(() => {
    if (isAuthenticated && accessToken) {
      fetchOffDays();
    }
  }, [isAuthenticated, accessToken]);

  async function fetchOffDays() {
    setLoadingOffDays(true);
    try {
      const res = await fetch('/api/settings/availability-exceptions', {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
        },
      });

      if (!res.ok) {
        throw new Error('Failed to fetch off days');
      }

      const data = await res.json();
      setOffDays(data.exceptions || []);
    } catch (err) {
      console.error('Error fetching off days:', err);
      setOffDayError(t('offDays.errors.loadFailed'));
    } finally {
      setLoadingOffDays(false);
    }
  }

  async function checkExistingBookings(date: string) {
    if (!date) return;

    setCheckingBookings(true);
    setExistingBookings([]);
    setShowBookingWarning(false);

    try {
      const res = await fetch(`/api/settings/availability-exceptions?checkDate=${date}`, {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
        },
      });

      if (!res.ok) {
        throw new Error('Failed to check bookings');
      }

      const data = await res.json();

      if (data.hasBookings && data.bookings.length > 0) {
        setExistingBookings(data.bookings);
        setShowBookingWarning(true);
      }
    } catch (err) {
      console.error('Error checking bookings:', err);
    } finally {
      setCheckingBookings(false);
    }
  }

  async function handleAddOffDay(e: React.FormEvent) {
    e.preventDefault();
    setOffDayError(null);

    if (!offDayDate) {
      setOffDayError(t('offDays.errors.dateRequired'));
      return;
    }

    if (!offDayReason.trim()) {
      setOffDayError(t('offDays.errors.reasonRequired'));
      return;
    }

    setSavingOffDay(true);

    try {
      const res = await fetch('/api/settings/availability-exceptions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          date: offDayDate,
          reason: offDayReason,
          closed: true,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || t('offDays.errors.addFailed'));
      }

      // Refresh off days list
      await fetchOffDays();

      // Reset form
      setOffDayDate('');
      setOffDayReason('');
      setShowAddOffDay(false);

      // Show success message
      setOffDaySuccess(t('offDays.success.added'));
      setTimeout(() => setOffDaySuccess(null), 3000);
    } catch (err: any) {
      setOffDayError(err?.message || t('offDays.errors.addFailed'));
    } finally {
      setSavingOffDay(false);
    }
  }

  async function handleRemoveOffDay(date: string) {
    if (!confirm(t('offDays.confirmRemove'))) {
      return;
    }

    try {
      const res = await fetch(`/api/settings/availability-exceptions?date=${date}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
        },
      });

      if (!res.ok) {
        throw new Error(t('offDays.errors.removeFailed'));
      }

      // Refresh off days list
      await fetchOffDays();

      // Show success message
      setOffDaySuccess(t('offDays.success.removed'));
      setTimeout(() => setOffDaySuccess(null), 3000);
    } catch (err: any) {
      setOffDayError(err?.message || t('offDays.errors.removeFailed'));
    }
  }

  function formatDate(dateString: string): string {
    const date = new Date(dateString + 'T00:00:00');
    return date.toLocaleDateString(undefined, {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  }

  // Get business details from selected business config
  const businessDetails = selectedBusiness;

  return (
    <div className="min-h-screen bg-white">
      {/* Sidebar */}
      <DashboardSidebar
        currentPage="settings"
        onNotificationClick={(appointmentId) => {
          if (appointmentId) {
            console.log('Navigate to appointment:', appointmentId);
          }
        }}
      />

      {/* Main Content - No left margin on mobile, ml-20 on desktop */}
      <main className="ml-0 sm:ml-20 min-h-screen pb-20 sm:pb-0">
        {/* Top Bar */}
        <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-sm border-b border-gray-200/60">
          <div className="px-4 sm:px-8 lg:px-12 py-4 sm:py-5 relative flex items-center justify-between gap-4 sm:gap-8">
            <div className="flex items-center gap-3 sm:gap-6 min-w-0 flex-1">
              {/* Business Selector */}
              {businesses.length > 0 ? (
                <div className="w-full sm:max-w-[320px] sm:min-w-[240px]">
                  <BusinessSelector
                    businesses={businesses}
                    selectedBusinessId={selectedBusinessId}
                    onBusinessChange={selectBusiness}
                    isLoading={businessLoading}
                  />
                </div>
              ) : (
                <div className="flex flex-col">
                  <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-900 tracking-tight truncate">{businessName}</h1>
                  <div className="flex items-center gap-2 mt-1">
                    <div className={`w-2 h-2 rounded-full ${isAuthenticated ? 'bg-green-500' : 'bg-gray-400'}`} />
                    <span className="text-xs sm:text-sm text-gray-500">
                      {isAuthenticated ? tCommon('header.connected') : tCommon('header.disconnected')}
                    </span>
                  </div>
                </div>
              )}
            </div>

            {/* Centered Logo - Hidden on mobile */}
            <div className="hidden sm:block absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
              <Logo size="sm" />
            </div>
          </div>
        </header>

        {/* Settings Content */}
        <div className="px-4 sm:px-8 lg:px-12 py-6 sm:py-8">
          <div className="max-w-7xl mx-auto space-y-6 sm:space-y-8">
            {/* Business Details Section */}
            {businessDetails && (
              <section>
                <h3 className="text-lg sm:text-xl font-semibold text-gray-900 mb-3 sm:mb-4">{t('businessDetails.title')}</h3>
                <div className="bg-gray-50 rounded-xl sm:rounded-2xl p-4 sm:p-6 lg:p-8 space-y-4 sm:space-y-6">
                  {/* Basic Info */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
                    <div>
                      <p className="text-sm font-medium text-gray-500">{t('businessDetails.name')}</p>
                      <p className="text-base text-gray-900 mt-1">{businessDetails.name}</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-500">{t('businessDetails.businessId')}</p>
                      <p className="text-base text-gray-900 mt-1 font-mono text-sm">{businessDetails.id}</p>
                    </div>
                  </div>

                  {/* Description */}
                  {businessDetails.description && (
                    <div>
                      <p className="text-sm font-medium text-gray-500">{t('businessDetails.description')}</p>
                      <p className="text-base text-gray-900 mt-1">{businessDetails.description}</p>
                    </div>
                  )}

                  {/* Regional Settings */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 pt-4 border-t border-gray-200">
                    <div>
                      <p className="text-sm font-medium text-gray-500">{t('businessDetails.timezone')}</p>
                      <p className="text-base text-gray-900 mt-1">{businessDetails.timezone}</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-500">{t('businessDetails.locale')}</p>
                      <p className="text-base text-gray-900 mt-1">{businessDetails.locale}</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-500">{t('businessDetails.currency')}</p>
                      <p className="text-base text-gray-900 mt-1">{businessDetails.currency}</p>
                    </div>
                  </div>

                  {/* Contact Information */}
                  <div className="pt-4 border-t border-gray-200">
                    <p className="text-sm font-semibold text-gray-700 mb-3">{t('businessDetails.contactInfo')}</p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
                      {businessDetails.email && (
                        <div>
                          <p className="text-sm font-medium text-gray-500">{t('businessDetails.email')}</p>
                          <p className="text-base text-gray-900 mt-1">{businessDetails.email}</p>
                        </div>
                      )}
                      {businessDetails.phone && (
                        <div>
                          <p className="text-sm font-medium text-gray-500">{t('businessDetails.phone')}</p>
                          <p className="text-base text-gray-900 mt-1">{businessDetails.phone}</p>
                        </div>
                      )}
                      {businessDetails.website && (
                        <div>
                          <p className="text-sm font-medium text-gray-500">{t('businessDetails.website')}</p>
                          <a
                            href={businessDetails.website}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-base text-teal-600 hover:text-teal-700 mt-1 inline-block transition-colors"
                          >
                            {businessDetails.website}
                          </a>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Address */}
                  {businessDetails.address && (
                    <div className="pt-4 border-t border-gray-200">
                      <p className="text-sm font-semibold text-gray-700 mb-3">{t('businessDetails.address')}</p>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="sm:col-span-2">
                          <p className="text-sm font-medium text-gray-500">{t('businessDetails.street')}</p>
                          <p className="text-base text-gray-900 mt-1 break-words">{businessDetails.address.street}</p>
                        </div>
                        <div>
                          <p className="text-sm font-medium text-gray-500">{t('businessDetails.city')}</p>
                          <p className="text-base text-gray-900 mt-1">{businessDetails.address.city}</p>
                        </div>
                        <div>
                          <p className="text-sm font-medium text-gray-500">{t('businessDetails.state')}</p>
                          <p className="text-base text-gray-900 mt-1">{businessDetails.address.state}</p>
                        </div>
                        <div>
                          <p className="text-sm font-medium text-gray-500">{t('businessDetails.postalCode')}</p>
                          <p className="text-base text-gray-900 mt-1">{businessDetails.address.postalCode}</p>
                        </div>
                        <div>
                          <p className="text-sm font-medium text-gray-500">{t('businessDetails.country')}</p>
                          <p className="text-base text-gray-900 mt-1">{businessDetails.address.country}</p>
                        </div>
                      </div>
                      {businessDetails.latitude && businessDetails.longitude && (
                        <div className="mt-4 pt-4 border-t border-gray-200">
                          <p className="text-sm font-medium text-gray-500">{t('businessDetails.coordinates')}</p>
                          <p className="text-base text-gray-900 mt-1 font-mono text-sm">
                            {businessDetails.latitude}, {businessDetails.longitude}
                          </p>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Booking Settings */}
                  <div className="pt-4 border-t border-gray-200">
                    <p className="text-sm font-semibold text-gray-700 mb-3">{t('businessDetails.bookingSettings')}</p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
                      <div>
                        <p className="text-sm font-medium text-gray-500">{t('businessDetails.timeSlotDuration')}</p>
                        <p className="text-base text-gray-900 mt-1">{businessDetails.timeSlotDuration} {t('businessDetails.minutes')}</p>
                      </div>
                      {businessDetails.maxSimultaneousBookings && (
                        <div>
                          <p className="text-sm font-medium text-gray-500">{t('businessDetails.maxBookings')}</p>
                          <p className="text-base text-gray-900 mt-1">{businessDetails.maxSimultaneousBookings}</p>
                        </div>
                      )}
                      {businessDetails.advanceBookingDays && (
                        <div>
                          <p className="text-sm font-medium text-gray-500">{t('businessDetails.advanceBooking')}</p>
                          <p className="text-base text-gray-900 mt-1">{businessDetails.advanceBookingDays} {t('businessDetails.days')}</p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </section>
            )}

            {/* Off Days Management */}
            <section>
              <div className="flex items-center justify-between mb-3 sm:mb-4">
                <div>
                  <h3 className="text-lg sm:text-xl font-semibold text-gray-900">{t('offDays.title')}</h3>
                  <p className="text-sm text-gray-500 mt-1">{t('offDays.description')}</p>
                </div>
                <button
                  onClick={() => setShowAddOffDay(true)}
                  className="px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors text-sm font-medium"
                >
                  {t('offDays.addButton')}
                </button>
              </div>

              {offDaySuccess && (
                <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-xl">
                  <div className="flex items-center gap-2">
                    <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    <p className="text-sm font-medium text-green-800">{offDaySuccess}</p>
                  </div>
                </div>
              )}

              {offDayError && (
                <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-xl">
                  <p className="text-sm text-red-800">{offDayError}</p>
                </div>
              )}

              <div className="bg-gray-50 rounded-xl sm:rounded-2xl p-4 sm:p-6">
                {loadingOffDays ? (
                  <div className="text-center py-8">
                    <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-teal-600"></div>
                    <p className="text-sm text-gray-500 mt-2">Loading...</p>
                  </div>
                ) : offDays.length === 0 ? (
                  <div className="text-center py-8">
                    <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    <h4 className="mt-2 text-sm font-medium text-gray-900">{t('offDays.noOffDays')}</h4>
                    <p className="mt-1 text-sm text-gray-500">{t('offDays.noOffDaysDescription')}</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead>
                        <tr>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            {t('offDays.date')}
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            {t('offDays.reason')}
                          </th>
                          <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                            {t('offDays.actions')}
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200 bg-white">
                        {offDays.map((offDay) => (
                          <tr key={offDay.date} className="hover:bg-gray-50">
                            <td className="px-4 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                              {formatDate(offDay.date)}
                            </td>
                            <td className="px-4 py-4 text-sm text-gray-700">
                              {offDay.reason}
                            </td>
                            <td className="px-4 py-4 whitespace-nowrap text-right text-sm font-medium">
                              <button
                                onClick={() => handleRemoveOffDay(offDay.date)}
                                className="text-red-600 hover:text-red-900 transition-colors"
                              >
                                {t('offDays.remove')}
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              {/* Add Off Day Modal */}
              {showAddOffDay && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                  <div className="bg-white rounded-2xl max-w-md w-full p-6">
                    <h4 className="text-lg font-semibold text-gray-900 mb-4">{t('offDays.addModal.title')}</h4>

                    <form onSubmit={handleAddOffDay} className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          {t('offDays.addModal.dateLabel')}
                        </label>
                        <input
                          type="date"
                          value={offDayDate}
                          onChange={(e) => {
                            setOffDayDate(e.target.value);
                            checkExistingBookings(e.target.value);
                          }}
                          min={new Date().toISOString().split('T')[0]}
                          className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-teal-500 focus:border-transparent transition-all"
                          required
                        />
                        {checkingBookings && (
                          <p className="text-xs text-gray-500 mt-2 flex items-center gap-2">
                            <span className="inline-block animate-spin rounded-full h-3 w-3 border-b-2 border-teal-600"></span>
                            {t('offDays.addModal.checkingBookings')}
                          </p>
                        )}
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          {t('offDays.addModal.reasonLabel')}
                        </label>
                        <input
                          type="text"
                          value={offDayReason}
                          onChange={(e) => setOffDayReason(e.target.value)}
                          placeholder={t('offDays.addModal.reasonPlaceholder')}
                          className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-teal-500 focus:border-transparent transition-all"
                          required
                        />
                      </div>

                      {/* Warning for existing bookings */}
                      {showBookingWarning && existingBookings.length > 0 && (
                        <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4">
                          <div className="flex items-start gap-3">
                            <svg className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                            </svg>
                            <div className="flex-1">
                              <h5 className="text-sm font-semibold text-yellow-900 mb-1">
                                {t('offDays.addModal.warningTitle')}
                              </h5>
                              <p className="text-sm text-yellow-800 mb-3">
                                {t('offDays.addModal.warningMessage', { count: existingBookings.length })}
                              </p>
                              <div className="space-y-2 mb-3">
                                {existingBookings.map((booking) => (
                                  <div key={booking.id} className="bg-white rounded-lg p-3 text-xs">
                                    <div className="font-medium text-gray-900">
                                      {booking.customerName} - {booking.serviceName}
                                    </div>
                                    <div className="text-gray-600 mt-1">
                                      {new Date(booking.startTime).toLocaleTimeString(undefined, {
                                        hour: '2-digit',
                                        minute: '2-digit',
                                      })}
                                      {' '}{t('offDays.addModal.bookingTime')}{' '}
                                      {new Date(booking.endTime).toLocaleTimeString(undefined, {
                                        hour: '2-digit',
                                        minute: '2-digit',
                                      })}
                                    </div>
                                    <div className="text-gray-500 mt-1">
                                      {booking.customerEmail}
                                    </div>
                                  </div>
                                ))}
                              </div>
                              <p className="text-xs text-yellow-700">
                                {t('offDays.addModal.warningNote')}
                              </p>
                            </div>
                          </div>
                        </div>
                      )}

                      {offDayError && (
                        <div className="text-sm text-red-600 bg-red-50 p-3 rounded-lg">{offDayError}</div>
                      )}

                      <div className="flex gap-3 pt-2">
                        <button
                          type="button"
                          onClick={() => {
                            setShowAddOffDay(false);
                            setOffDayDate('');
                            setOffDayReason('');
                            setOffDayError(null);
                            setExistingBookings([]);
                            setShowBookingWarning(false);
                          }}
                          className="flex-1 px-4 py-3 border border-gray-300 text-gray-700 rounded-xl font-medium hover:bg-gray-50 transition-all"
                        >
                          {t('offDays.addModal.cancel')}
                        </button>
                        <button
                          type="submit"
                          disabled={savingOffDay || checkingBookings}
                          className={`flex-1 px-4 py-3 ${showBookingWarning ? 'bg-gradient-to-r from-yellow-600 to-orange-600' : 'bg-gradient-to-r from-teal-600 to-green-600'} text-white rounded-xl font-semibold hover:shadow-lg hover:scale-[1.01] transition-all disabled:opacity-60 disabled:cursor-not-allowed`}
                        >
                          {savingOffDay ? t('offDays.addModal.saving') : showBookingWarning ? t('offDays.addModal.continueAnyway') : t('offDays.addModal.save')}
                        </button>
                      </div>
                    </form>
                  </div>
                </div>
              )}
            </section>

            {/* Two Column Layout for Account & Password */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* Account Information */}
              <section>
                <h3 className="text-lg sm:text-xl font-semibold text-gray-900 mb-3 sm:mb-4">{t('account.title')}</h3>
                <div className="bg-gray-50 rounded-xl sm:rounded-2xl p-4 sm:p-6 space-y-3 h-full">
                <div>
                  <p className="text-sm font-medium text-gray-500">{t('account.email')}</p>
                  <p className="text-base text-gray-900 mt-1">{user?.email}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-500">{t('account.role')}</p>
                  <p className="text-base text-gray-900 mt-1 capitalize">{user?.role}</p>
                </div>
                {user?.business_id && (
                  <div>
                    <p className="text-sm font-medium text-gray-500">{t('account.linkedBusiness')}</p>
                    <p className="text-base text-gray-900 mt-1 font-mono text-sm">{user.business_id}</p>
                  </div>
                )}
                </div>
              </section>

              {/* Quick Actions */}
              <section>
                <h3 className="text-lg sm:text-xl font-semibold text-gray-900 mb-3 sm:mb-4">{t('quickActions.title')}</h3>
                <div className="bg-gray-50 rounded-xl sm:rounded-2xl p-4 sm:p-6 h-full">
                  <div className="space-y-4">
                    <button
                      onClick={() => {
                        if (businessDetails?.website) {
                          window.open(businessDetails.website, '_blank');
                        }
                      }}
                      disabled={!businessDetails?.website}
                      className="w-full px-5 py-3 text-sm font-semibold text-gray-700 hover:bg-white rounded-xl transition-all border border-gray-200 disabled:opacity-50 disabled:cursor-not-allowed text-left"
                    >
                      <div className="flex items-center gap-3">
                        <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
                        </svg>
                        <span>{t('quickActions.viewWebsite')}</span>
                      </div>
                    </button>

                    <button
                      onClick={() => {
                        const bookingUrl = `${window.location.origin}/booking/${businessDetails?.id}`;
                        navigator.clipboard.writeText(bookingUrl);
                      }}
                      disabled={!businessDetails?.id}
                      className="w-full px-5 py-3 text-sm font-semibold text-gray-700 hover:bg-white rounded-xl transition-all border border-gray-200 disabled:opacity-50 disabled:cursor-not-allowed text-left"
                    >
                      <div className="flex items-center gap-3">
                        <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                        </svg>
                        <span>{t('quickActions.copyBookingLink')}</span>
                      </div>
                    </button>
                  </div>
                </div>
              </section>
            </div>

            {/* Change Password */}
            <section>
              <h3 className="text-lg sm:text-xl font-semibold text-gray-900 mb-3 sm:mb-4">{t('password.title')}</h3>

              {success && (
                <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-xl">
                  <div className="flex items-center gap-2">
                    <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    <p className="text-sm font-medium text-green-800">{t('password.changeSuccess')}</p>
                  </div>
                </div>
              )}

              <form onSubmit={handlePasswordChange} className="bg-gray-50 rounded-xl sm:rounded-2xl p-4 sm:p-6 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {t('password.currentPassword')}
                  </label>
                  <input
                    type="password"
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-teal-500 focus:border-transparent transition-all"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {t('password.newPassword')}
                  </label>
                  <input
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-teal-500 focus:border-transparent transition-all"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {t('password.confirmPassword')}
                  </label>
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-teal-500 focus:border-transparent transition-all"
                    required
                  />
                </div>

                {errors.length > 0 && (
                  <div className="text-sm text-red-600 bg-red-50 p-3 rounded-lg">
                    <p className="font-medium mb-1">{t('password.requirementsTitle')}</p>
                    <ul className="list-disc list-inside space-y-1">
                      {errors.map((err, i) => (
                        <li key={i}>{err}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {error && (
                  <div className="text-sm text-red-600 bg-red-50 p-3 rounded-lg">{error}</div>
                )}

                <div className="text-xs text-gray-500 bg-white p-3 rounded-lg border border-gray-200">
                  <p className="font-medium mb-1">{t('password.requirementsTitle')}</p>
                  <ul className="list-disc list-inside space-y-1">
                    <li>{t('password.requirement1')}</li>
                    <li>{t('password.requirement2')}</li>
                    <li>{t('password.requirement3')}</li>
                    <li>{t('password.requirement4')}</li>
                  </ul>
                </div>

                <button
                  type="submit"
                  disabled={pending}
                  className="w-full px-6 py-3 bg-gradient-to-r from-teal-600 to-green-600 text-white rounded-xl font-semibold hover:shadow-lg hover:scale-[1.01] transition-all disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {pending ? t('password.updating') : t('password.updateButton')}
                </button>
              </form>
            </section>
          </div>
        </div>
      </main>
    </div>
  );
}

export default function SettingsPage() {
  return (
    <ProtectedRoute requireRole="owner">
      <BusinessProvider>
        <SettingsContent />
      </BusinessProvider>
    </ProtectedRoute>
  );
}
