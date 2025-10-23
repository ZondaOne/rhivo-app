'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { useAuth } from '@/contexts/AuthContext';
import { BusinessProvider, useBusiness } from '@/contexts/BusinessContext';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { DashboardSidebar } from '@/components/dashboard/DashboardSidebar';
import { BusinessSelector } from '@/components/dashboard/BusinessSelector';
import { Logo } from '@/components/Logo';

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
