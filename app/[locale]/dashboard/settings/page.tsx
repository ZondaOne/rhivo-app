'use client';

import { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { useAuth } from '@/contexts/AuthContext';
import { BusinessProvider, useBusiness } from '@/contexts/BusinessContext';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { DashboardSidebar } from '@/components/dashboard/DashboardSidebar';
import { BusinessSelector } from '@/components/dashboard/BusinessSelector';
import { Logo } from '@/components/Logo';
import type { TenantConfig } from '@/lib/config/tenant-schema';

type SettingsCategory = 'profile' | 'business' | 'booking' | 'availability' | 'security' | 'actions';

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

  // Category navigation state
  const [activeCategory, setActiveCategory] = useState<SettingsCategory>('profile');

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

  // Business config state
  const [businessConfig, setBusinessConfig] = useState<TenantConfig | null>(null);
  const [loadingConfig, setLoadingConfig] = useState(false);
  const [configError, setConfigError] = useState<string | null>(null);

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

  // Fetch business config
  useEffect(() => {
    if (isAuthenticated && accessToken && selectedBusinessId) {
      fetchBusinessConfig();
    }
  }, [isAuthenticated, accessToken, selectedBusinessId]);

  async function fetchBusinessConfig() {
    if (!selectedBusinessId) return;

    setLoadingConfig(true);
    setConfigError(null);

    try {
      const res = await fetch(`/api/config/business?businessId=${selectedBusinessId}`, {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
        },
      });

      if (!res.ok) {
        throw new Error('Failed to fetch business config');
      }

      const data = await res.json();
      if (data.success && data.config) {
        setBusinessConfig(data.config);
      }
    } catch (err) {
      console.error('Error fetching business config:', err);
      setConfigError('Failed to load business configuration');
    } finally {
      setLoadingConfig(false);
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

  // Get business details from YAML config
  const businessDetails = businessConfig ? {
    id: businessConfig.business.id,
    name: businessConfig.business.name,
    description: businessConfig.business.description,
    timezone: businessConfig.business.timezone,
    locale: businessConfig.business.locale,
    currency: businessConfig.business.currency,
    email: businessConfig.contact.email,
    phone: businessConfig.contact.phone,
    website: businessConfig.contact.website,
    address: businessConfig.contact.address,
    latitude: businessConfig.contact.latitude,
    longitude: businessConfig.contact.longitude,
    timeSlotDuration: businessConfig.timeSlotDuration,
    maxSimultaneousBookings: businessConfig.bookingLimits?.maxSimultaneousBookings,
    advanceBookingDays: businessConfig.bookingLimits?.advanceBookingDays,
  } : null;

  // Category definitions with icons
  const categories = [
    {
      id: 'profile' as SettingsCategory,
      label: t('categories.profile.label'),
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
        </svg>
      ),
    },
    {
      id: 'business' as SettingsCategory,
      label: t('categories.business.label'),
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
        </svg>
      ),
    },
    {
      id: 'booking' as SettingsCategory,
      label: t('categories.booking.label'),
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
    },
    {
      id: 'availability' as SettingsCategory,
      label: t('categories.availability.label'),
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
      ),
    },
    {
      id: 'security' as SettingsCategory,
      label: t('categories.security.label'),
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
        </svg>
      ),
    },
    {
      id: 'actions' as SettingsCategory,
      label: t('categories.actions.label'),
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 10V3L4 14h7v7l9-11h-7z" />
        </svg>
      ),
    },
  ];

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
          <div className="px-4 sm:px-8 lg:px-12 py-4 sm:py-5 relative flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 sm:gap-8">
            <div className="flex items-center gap-3 sm:gap-6 min-w-0 flex-1 w-full sm:w-auto">
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
            <div className="hidden lg:block absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
              <Logo size="sm" />
            </div>
          </div>
        </header>

        {/* Settings Content */}
        <div className="px-4 sm:px-8 lg:px-12 py-6 sm:py-8">
          <div className="max-w-7xl mx-auto">
            {/* Page Title */}
            <div className="mb-6 sm:mb-8">
              <h2 className="text-xl sm:text-2xl font-bold text-gray-900 tracking-tight">{t('title')}</h2>
              <p className="text-sm text-gray-500 mt-1.5">{t('subtitle')}</p>
            </div>

            {/* Two Column Layout */}
            <div className="flex flex-col lg:flex-row gap-6 lg:gap-8">
              {/* Category Navigation - Vertical sidebar */}
              <nav className="w-full lg:w-64 flex-shrink-0">
                <div className="bg-white border border-gray-200/60 rounded-2xl p-2 shadow-sm">
                  <div className="space-y-1">
                    {categories.map((category) => (
                      <button
                        key={category.id}
                        onClick={() => setActiveCategory(category.id)}
                        className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-left transition-all ${
                          activeCategory === category.id
                            ? 'bg-gradient-to-r from-teal-600 to-green-600 text-white shadow-sm'
                            : 'text-gray-700 hover:bg-gray-50'
                        }`}
                      >
                        <span className={`w-5 h-5 ${activeCategory === category.id ? 'text-white' : 'text-gray-400'}`}>
                          {category.icon}
                        </span>
                        <span className="text-sm font-semibold">{category.label}</span>
                      </button>
                    ))}
                  </div>
                </div>
              </nav>

              {/* Content Area */}
              <div className="flex-1">
              {/* Profile Category */}
              {activeCategory === 'profile' && (
                <div className="bg-white border border-gray-200/60 rounded-2xl p-8 shadow-sm transition-all hover:shadow-md">
                  <div className="mb-8">
                    <h3 className="text-2xl font-bold text-gray-900 tracking-tight">{t('categories.profile.title')}</h3>
                    <p className="text-sm text-gray-500 mt-1.5">{t('categories.profile.description')}</p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="bg-gray-50/80 rounded-xl p-6 border border-gray-100">
                      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">{t('account.email')}</p>
                      <p className="text-base text-gray-900 break-all">{user?.email}</p>
                    </div>
                    <div className="bg-gray-50/80 rounded-xl p-6 border border-gray-100">
                      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">{t('account.role')}</p>
                      <p className="text-base text-gray-900 capitalize">{user?.role}</p>
                    </div>
                    {user?.business_id && (
                      <div className="md:col-span-2 bg-gray-50/80 rounded-xl p-6 border border-gray-100">
                        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">{t('account.linkedBusiness')}</p>
                        <p className="text-sm text-gray-700 font-mono bg-white px-3 py-2 rounded-lg inline-block break-all">{user.business_id}</p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Business Information Category */}
              {activeCategory === 'business' && (
                loadingConfig ? (
                  <div className="bg-white border border-gray-200/60 rounded-2xl p-8 shadow-sm">
                    <div className="text-center py-16">
                      <div className="inline-block animate-spin rounded-full h-8 w-8 border-2 border-gray-200 border-t-teal-600"></div>
                      <p className="text-sm text-gray-500 mt-3">Loading business configuration...</p>
                    </div>
                  </div>
                ) : configError ? (
                  <div className="bg-white border border-gray-200/60 rounded-2xl p-8 shadow-sm">
                    <div className="text-center py-16">
                      <div className="w-16 h-16 mx-auto bg-red-100 rounded-2xl flex items-center justify-center mb-4">
                        <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                      </div>
                      <h4 className="text-sm font-semibold text-gray-900 mb-1.5">Failed to load configuration</h4>
                      <p className="text-sm text-gray-500">{configError}</p>
                    </div>
                  </div>
                ) : businessDetails ? (
                <div className="space-y-6">
                  {/* Basic Information */}
                  <div className="bg-white border border-gray-200/60 rounded-2xl p-8 shadow-sm transition-all hover:shadow-md">
                    <div className="mb-8">
                      <h3 className="text-2xl font-bold text-gray-900 tracking-tight">{t('businessDetails.basicInfo')}</h3>
                      <p className="text-sm text-gray-500 mt-1.5">{t('categories.business.description')}</p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="bg-gray-50/80 rounded-xl p-6 border border-gray-100">
                        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">{t('businessDetails.name')}</p>
                        <p className="text-base text-gray-900 break-words">{businessDetails.name}</p>
                      </div>
                      <div className="bg-gray-50/80 rounded-xl p-6 border border-gray-100">
                        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">{t('businessDetails.businessId')}</p>
                        <p className="text-sm text-gray-700 font-mono bg-white px-3 py-2 rounded-lg inline-block break-all">{businessDetails.id}</p>
                      </div>
                      {businessDetails.description && (
                        <div className="md:col-span-2 bg-gray-50/80 rounded-xl p-6 border border-gray-100">
                          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">{t('businessDetails.description')}</p>
                          <p className="text-base text-gray-700 leading-relaxed">{businessDetails.description}</p>
                        </div>
                      )}
                      <div className="bg-gray-50/80 rounded-xl p-6 border border-gray-100">
                        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">{t('businessDetails.timezone')}</p>
                        <p className="text-base text-gray-900">{businessDetails.timezone}</p>
                      </div>
                      <div className="bg-gray-50/80 rounded-xl p-6 border border-gray-100">
                        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">{t('businessDetails.locale')}</p>
                        <p className="text-base text-gray-900">{businessDetails.locale}</p>
                      </div>
                      <div className="bg-gray-50/80 rounded-xl p-6 border border-gray-100">
                        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">{t('businessDetails.currency')}</p>
                        <p className="text-base text-gray-900">{businessDetails.currency}</p>
                      </div>
                    </div>
                  </div>

                  {/* Contact Information */}
                  <div className="bg-white border border-gray-200/60 rounded-2xl p-8 shadow-sm transition-all hover:shadow-md">
                    <div className="mb-8">
                      <h3 className="text-2xl font-bold text-gray-900 tracking-tight">{t('businessDetails.contactInfo')}</h3>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {businessDetails.email && (
                        <div className="bg-gray-50/80 rounded-xl p-6 border border-gray-100">
                          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">{t('businessDetails.email')}</p>
                          <p className="text-base text-gray-900 break-all">{businessDetails.email}</p>
                        </div>
                      )}
                      {businessDetails.phone && (
                        <div className="bg-gray-50/80 rounded-xl p-6 border border-gray-100">
                          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">{t('businessDetails.phone')}</p>
                          <p className="text-base text-gray-900">{businessDetails.phone}</p>
                        </div>
                      )}
                      {businessDetails.website && (
                        <div className="md:col-span-2 bg-gray-50/80 rounded-xl p-6 border border-gray-100">
                          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">{t('businessDetails.website')}</p>
                          <a
                            href={businessDetails.website}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-base text-teal-600 hover:text-teal-700 inline-flex items-center gap-1.5 transition-colors break-all group"
                          >
                            <span className="break-all">{businessDetails.website}</span>
                            <svg className="w-4 h-4 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                            </svg>
                          </a>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Contact Team Section */}
                  <div className="bg-gradient-to-br from-teal-50 to-green-50 border border-teal-200/60 rounded-2xl p-8 shadow-sm">
                    <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
                      <div className="flex-1">
                        <h3 className="text-xl font-bold text-gray-900 tracking-tight mb-2">{t('contactTeam.title')}</h3>
                        <p className="text-sm text-gray-600 leading-relaxed">
                          {t('contactTeam.description')}
                          <span className="block mt-1 text-xs text-gray-500">{t('contactTeam.futureNote')}</span>
                        </p>
                      </div>
                      <a
                        href={`mailto:team@zonda.one?subject=Business%20Configuration%20Update%20Request&body=Hi%20team,%0D%0A%0D%0AI%20would%20like%20to%20update%20my%20business%20configuration.%0D%0A%0D%0ABusiness%20ID:%20${businessDetails.id}%0D%0ABusiness%20Name:%20${encodeURIComponent(businessDetails.name)}%0D%0A%0D%0AChanges%20needed:%0D%0A-%20%0D%0A%0D%0AThank%20you!`}
                        className="flex-shrink-0 inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-teal-600 to-green-600 text-white rounded-xl font-semibold hover:shadow-lg hover:scale-[1.02] transition-all"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                        </svg>
                        {t('contactTeam.button')}
                      </a>
                    </div>
                  </div>

                  {/* Address */}
                  {businessDetails.address && (
                    <div className="bg-white border border-gray-200/60 rounded-2xl p-8 shadow-sm transition-all hover:shadow-md">
                      <div className="mb-8">
                        <h3 className="text-2xl font-bold text-gray-900 tracking-tight">{t('businessDetails.address')}</h3>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="md:col-span-2 bg-gray-50/80 rounded-xl p-6 border border-gray-100">
                          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">{t('businessDetails.street')}</p>
                          <p className="text-base text-gray-900">{businessDetails.address.street}</p>
                        </div>
                        <div className="bg-gray-50/80 rounded-xl p-6 border border-gray-100">
                          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">{t('businessDetails.city')}</p>
                          <p className="text-base text-gray-900">{businessDetails.address.city}</p>
                        </div>
                        <div className="bg-gray-50/80 rounded-xl p-6 border border-gray-100">
                          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">{t('businessDetails.state')}</p>
                          <p className="text-base text-gray-900">{businessDetails.address.state}</p>
                        </div>
                        <div className="bg-gray-50/80 rounded-xl p-6 border border-gray-100">
                          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">{t('businessDetails.postalCode')}</p>
                          <p className="text-base text-gray-900">{businessDetails.address.postalCode}</p>
                        </div>
                        <div className="bg-gray-50/80 rounded-xl p-6 border border-gray-100">
                          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">{t('businessDetails.country')}</p>
                          <p className="text-base text-gray-900">{businessDetails.address.country}</p>
                        </div>
                        {businessDetails.latitude && businessDetails.longitude && (
                          <div className="md:col-span-2 bg-gray-50/80 rounded-xl p-6 border border-gray-100">
                            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">{t('businessDetails.coordinates')}</p>
                            <p className="text-sm text-gray-700 font-mono bg-white px-3 py-2 rounded-lg inline-block break-all">
                              {businessDetails.latitude}, {businessDetails.longitude}
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
                ) : (
                  <div className="bg-white border border-gray-200/60 rounded-2xl p-8 shadow-sm">
                    <div className="text-center py-16">
                      <div className="w-16 h-16 mx-auto bg-gray-100 rounded-2xl flex items-center justify-center mb-4">
                        <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                        </svg>
                      </div>
                      <h4 className="text-sm font-semibold text-gray-900 mb-1.5">No business selected</h4>
                      <p className="text-sm text-gray-500">Please select a business to view its configuration</p>
                    </div>
                  </div>
                )
              )}

              {/* Booking Settings Category */}
              {activeCategory === 'booking' && businessDetails && (
                <div className="bg-white border border-gray-200/60 rounded-2xl p-8 shadow-sm transition-all hover:shadow-md">
                  <div className="mb-8">
                    <h3 className="text-2xl font-bold text-gray-900 tracking-tight">{t('categories.booking.title')}</h3>
                    <p className="text-sm text-gray-500 mt-1.5">{t('categories.booking.description')}</p>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
                    <div className="bg-gradient-to-br from-teal-50 to-teal-100/50 rounded-xl p-6 border border-teal-200/50">
                      <p className="text-xs font-semibold text-teal-700 uppercase tracking-wide mb-3">{t('businessDetails.timeSlotDuration')}</p>
                      <div className="flex items-baseline gap-2">
                        <p className="text-4xl font-bold text-teal-600 tracking-tight">{businessDetails.timeSlotDuration}</p>
                        <p className="text-sm font-medium text-teal-700">{t('businessDetails.minutes')}</p>
                      </div>
                    </div>
                    {businessDetails.maxSimultaneousBookings && (
                      <div className="bg-gradient-to-br from-green-50 to-green-100/50 rounded-xl p-6 border border-green-200/50">
                        <p className="text-xs font-semibold text-green-700 uppercase tracking-wide mb-3">{t('businessDetails.maxBookings')}</p>
                        <div className="flex items-baseline gap-2">
                          <p className="text-4xl font-bold text-green-600 tracking-tight">{businessDetails.maxSimultaneousBookings}</p>
                          <p className="text-sm font-medium text-green-700">simultaneous</p>
                        </div>
                      </div>
                    )}
                    {businessDetails.advanceBookingDays && (
                      <div className="bg-gray-50/80 rounded-xl p-6 border border-gray-100">
                        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">{t('businessDetails.advanceBooking')}</p>
                        <div className="flex items-baseline gap-2">
                          <p className="text-4xl font-bold text-gray-900 tracking-tight">{businessDetails.advanceBookingDays}</p>
                          <p className="text-sm font-medium text-gray-500">{t('businessDetails.days')}</p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Availability Category */}
              {activeCategory === 'availability' && (
                <div className="bg-white border border-gray-200/60 rounded-2xl p-8 shadow-sm transition-all hover:shadow-md">
                  <div className="flex flex-col sm:flex-row items-start sm:justify-between gap-4 mb-8">
                    <div>
                      <h3 className="text-2xl font-bold text-gray-900 tracking-tight">{t('categories.availability.title')}</h3>
                      <p className="text-sm text-gray-500 mt-1.5">{t('categories.availability.description')}</p>
                    </div>
                    <button
                      onClick={() => setShowAddOffDay(true)}
                      className="whitespace-nowrap px-5 py-2.5 bg-gradient-to-r from-teal-600 to-green-600 text-white rounded-xl font-semibold hover:shadow-lg hover:scale-[1.02] transition-all text-sm"
                    >
                      {t('offDays.addButton')}
                    </button>
                  </div>

                  {/* Success/Error Messages */}
                  {offDaySuccess && (
                    <div className="mb-6 p-4 bg-green-50/50 border border-green-200/60 rounded-xl">
                      <div className="flex items-center gap-3">
                        <div className="w-5 h-5 rounded-full bg-green-500 flex items-center justify-center flex-shrink-0">
                          <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                          </svg>
                        </div>
                        <p className="text-sm font-medium text-green-900">{offDaySuccess}</p>
                      </div>
                    </div>
                  )}

                  {offDayError && (
                    <div className="mb-6 p-4 bg-red-50/50 border border-red-200/60 rounded-xl">
                      <p className="text-sm text-red-900">{offDayError}</p>
                    </div>
                  )}

                  {/* Off Days List */}
                  {loadingOffDays ? (
                    <div className="text-center py-16 bg-gray-50/50 rounded-2xl border border-gray-100">
                      <div className="inline-block animate-spin rounded-full h-8 w-8 border-2 border-gray-200 border-t-teal-600"></div>
                      <p className="text-sm text-gray-500 mt-3">Loading...</p>
                    </div>
                  ) : offDays.length === 0 ? (
                    <div className="text-center py-16 px-6 bg-gray-50/50 rounded-2xl border border-gray-100">
                      <div className="w-16 h-16 mx-auto bg-gray-200/50 rounded-2xl flex items-center justify-center mb-4">
                        <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                      </div>
                      <h4 className="text-sm font-semibold text-gray-900 mb-1.5">{t('offDays.noOffDays')}</h4>
                      <p className="text-sm text-gray-500">{t('offDays.noOffDaysDescription')}</p>
                    </div>
                  ) : (
                    <div className="border border-gray-100 rounded-2xl overflow-hidden divide-y divide-gray-100">
                      {offDays.map((offDay) => (
                        <div key={offDay.date} className="flex items-center justify-between p-6 hover:bg-gray-50/50 transition-colors group">
                          <div className="flex-1 min-w-0">
                            <p className="font-semibold text-gray-900 mb-1">{formatDate(offDay.date)}</p>
                            <p className="text-sm text-gray-600">{offDay.reason}</p>
                          </div>
                          <button
                            onClick={() => handleRemoveOffDay(offDay.date)}
                            className="ml-6 px-4 py-2 text-sm font-medium text-red-600 hover:text-red-700 hover:bg-red-50 rounded-lg transition-all opacity-0 group-hover:opacity-100"
                          >
                            {t('offDays.remove')}
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Security Category */}
              {activeCategory === 'security' && (
                <div className="bg-white border border-gray-200/60 rounded-2xl p-8 shadow-sm transition-all hover:shadow-md">
                  <div className="mb-8">
                    <h3 className="text-2xl font-bold text-gray-900 tracking-tight">{t('categories.security.title')}</h3>
                    <p className="text-sm text-gray-500 mt-1.5">{t('categories.security.description')}</p>
                  </div>

                  {success && (
                    <div className="mb-6 p-4 bg-green-50/50 border border-green-200/60 rounded-xl">
                      <div className="flex items-center gap-3">
                        <div className="w-5 h-5 rounded-full bg-green-500 flex items-center justify-center flex-shrink-0">
                          <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                          </svg>
                        </div>
                        <p className="text-sm font-medium text-green-900">{t('password.changeSuccess')}</p>
                      </div>
                    </div>
                  )}

                  <form onSubmit={handlePasswordChange} className="space-y-6">
                      <div>
                        <label className="block text-sm font-semibold text-gray-900 mb-3">
                          {t('password.currentPassword')}
                        </label>
                        <input
                          type="password"
                          value={currentPassword}
                          onChange={(e) => setCurrentPassword(e.target.value)}
                          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500 transition-all bg-white text-gray-900 placeholder-gray-400"
                          required
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-semibold text-gray-900 mb-3">
                          {t('password.newPassword')}
                        </label>
                        <input
                          type="password"
                          value={newPassword}
                          onChange={(e) => setNewPassword(e.target.value)}
                          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500 transition-all bg-white text-gray-900 placeholder-gray-400"
                          required
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-semibold text-gray-900 mb-3">
                          {t('password.confirmPassword')}
                        </label>
                        <input
                          type="password"
                          value={confirmPassword}
                          onChange={(e) => setConfirmPassword(e.target.value)}
                          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500 transition-all bg-white text-gray-900 placeholder-gray-400"
                          required
                        />
                      </div>

                    {errors.length > 0 && (
                      <div className="text-sm text-red-900 bg-red-50/50 p-4 rounded-xl border border-red-200/60">
                        <p className="font-semibold mb-2">{t('password.requirementsTitle')}</p>
                        <ul className="list-disc list-inside space-y-1 text-red-800">
                          {errors.map((err, i) => (
                            <li key={i}>{err}</li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {error && (
                      <div className="text-sm text-red-900 bg-red-50/50 p-4 rounded-xl border border-red-200/60">{error}</div>
                    )}

                    <div className="text-xs text-gray-600 bg-gray-50/80 p-4 rounded-xl border border-gray-100">
                      <p className="font-semibold mb-2 text-gray-900">{t('password.requirementsTitle')}</p>
                      <ul className="list-disc list-inside space-y-1.5">
                        <li>{t('password.requirement1')}</li>
                        <li>{t('password.requirement2')}</li>
                        <li>{t('password.requirement3')}</li>
                        <li>{t('password.requirement4')}</li>
                      </ul>
                    </div>

                    <button
                      type="submit"
                      disabled={pending}
                      className="w-full px-6 py-3 bg-gradient-to-r from-teal-600 to-green-600 text-white rounded-xl font-semibold hover:shadow-lg hover:scale-[1.01] transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
                    >
                      {pending ? t('password.updating') : t('password.updateButton')}
                    </button>
                  </form>
                </div>
              )}

              {/* Quick Actions Category */}
              {activeCategory === 'actions' && businessDetails && (
                <div className="bg-white border border-gray-200/60 rounded-2xl p-8 shadow-sm transition-all hover:shadow-md">
                  <div className="mb-8">
                    <h3 className="text-2xl font-bold text-gray-900 tracking-tight">{t('categories.actions.title')}</h3>
                    <p className="text-sm text-gray-500 mt-1.5">{t('categories.actions.description')}</p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <button
                      onClick={() => {
                        if (businessDetails?.website) {
                          window.open(businessDetails.website, '_blank');
                        }
                      }}
                      disabled={!businessDetails?.website}
                      className="group p-6 border border-gray-100 rounded-2xl hover:border-gray-200 hover:shadow-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed text-left bg-gray-50/50"
                    >
                      <div className="flex items-start gap-4">
                        <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center group-hover:bg-gray-100 transition-colors flex-shrink-0 shadow-sm">
                          <svg className="w-6 h-6 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
                          </svg>
                        </div>
                        <div className="flex-1 min-w-0">
                          <h4 className="text-base font-semibold text-gray-900 mb-1">{t('quickActions.viewWebsite')}</h4>
                          <p className="text-sm text-gray-600 leading-relaxed">Open your business website in a new tab</p>
                        </div>
                      </div>
                    </button>

                    <button
                      onClick={() => {
                        const bookingUrl = `${window.location.origin}/booking/${businessDetails?.id}`;
                        navigator.clipboard.writeText(bookingUrl);
                      }}
                      disabled={!businessDetails?.id}
                      className="group p-6 border border-gray-100 rounded-2xl hover:border-gray-200 hover:shadow-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed text-left bg-gray-50/50"
                    >
                      <div className="flex items-start gap-4">
                        <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center group-hover:bg-gray-100 transition-colors flex-shrink-0 shadow-sm">
                          <svg className="w-6 h-6 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                          </svg>
                        </div>
                        <div className="flex-1 min-w-0">
                          <h4 className="text-base font-semibold text-gray-900 mb-1">{t('quickActions.copyBookingLink')}</h4>
                          <p className="text-sm text-gray-600 leading-relaxed">Copy your booking page URL to share</p>
                        </div>
                      </div>
                    </button>
                  </div>
                </div>
              )}
              </div>
            </div>
          </div>

          {/* Add Off Day Modal (Global) */}
          {showAddOffDay && (
            <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
              <div className="bg-white rounded-2xl max-w-lg w-full p-8 shadow-2xl animate-in zoom-in-95 duration-200 max-h-[90vh] overflow-y-auto">
                <div className="flex items-center justify-between mb-8">
                  <h4 className="text-xl font-bold text-gray-900 tracking-tight">{t('offDays.addModal.title')}</h4>
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
                    className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100 transition-colors text-gray-400 hover:text-gray-600 flex-shrink-0"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>

                <form onSubmit={handleAddOffDay} className="space-y-6">
                      <div>
                        <label className="block text-sm font-semibold text-gray-900 mb-3">
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
                          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500 transition-all bg-white text-gray-900"
                          required
                        />
                        {checkingBookings && (
                          <p className="text-xs text-gray-600 mt-2 flex items-center gap-2">
                            <span className="inline-block animate-spin rounded-full h-3 w-3 border-2 border-gray-200 border-t-teal-600"></span>
                            {t('offDays.addModal.checkingBookings')}
                          </p>
                        )}
                      </div>

                      <div>
                        <label className="block text-sm font-semibold text-gray-900 mb-3">
                          {t('offDays.addModal.reasonLabel')}
                        </label>
                        <input
                          type="text"
                          value={offDayReason}
                          onChange={(e) => setOffDayReason(e.target.value)}
                          placeholder={t('offDays.addModal.reasonPlaceholder')}
                          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500 transition-all bg-white text-gray-900 placeholder-gray-400"
                          required
                        />
                      </div>

                      {/* Warning for existing bookings */}
                      {showBookingWarning && existingBookings.length > 0 && (
                        <div className="bg-yellow-50/50 border border-yellow-200/60 rounded-xl p-5 backdrop-blur-sm">
                          <div className="flex items-start gap-4">
                            <div className="w-10 h-10 bg-yellow-100 rounded-lg flex items-center justify-center flex-shrink-0">
                              <svg className="w-5 h-5 text-yellow-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                              </svg>
                            </div>
                            <div className="flex-1 min-w-0">
                              <h5 className="text-sm font-semibold text-yellow-900 mb-2">
                                {t('offDays.addModal.warningTitle')}
                              </h5>
                              <p className="text-sm text-yellow-800 mb-3 leading-relaxed">
                                {t('offDays.addModal.warningMessage', { count: existingBookings.length })}
                              </p>
                              <div className="space-y-2 mb-3">
                                {existingBookings.map((booking) => (
                                  <div key={booking.id} className="bg-white/80 border border-yellow-200/40 rounded-lg p-3 text-xs">
                                    <div className="font-semibold text-gray-900">
                                      {booking.customerName} - {booking.serviceName}
                                    </div>
                                    <div className="text-gray-700 mt-1">
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
                                    <div className="text-gray-600 mt-1">
                                      {booking.customerEmail}
                                    </div>
                                  </div>
                                ))}
                              </div>
                              <p className="text-xs text-yellow-800 leading-relaxed">
                                {t('offDays.addModal.warningNote')}
                              </p>
                            </div>
                          </div>
                        </div>
                      )}

                      {offDayError && (
                        <div className="text-sm text-red-900 bg-red-50/50 p-4 rounded-xl border border-red-200/60">{offDayError}</div>
                      )}

                      <div className="flex flex-col sm:flex-row gap-3 pt-2">
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
                          className="w-full sm:flex-1 px-5 py-3 border border-gray-300 text-gray-700 rounded-xl font-semibold hover:bg-gray-50 hover:border-gray-400 transition-all order-2 sm:order-1"
                        >
                          {t('offDays.addModal.cancel')}
                        </button>
                        <button
                          type="submit"
                          disabled={savingOffDay || checkingBookings}
                          className={`w-full sm:flex-1 px-5 py-3 ${showBookingWarning ? 'bg-gradient-to-r from-yellow-600 to-orange-600' : 'bg-gradient-to-r from-teal-600 to-green-600'} text-white rounded-xl font-semibold hover:shadow-lg hover:scale-[1.01] transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 order-1 sm:order-2`}
                        >
                          {savingOffDay ? t('offDays.addModal.saving') : showBookingWarning ? t('offDays.addModal.continueAnyway') : t('offDays.addModal.save')}
                        </button>
                      </div>
                    </form>
              </div>
            </div>
          )}
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
