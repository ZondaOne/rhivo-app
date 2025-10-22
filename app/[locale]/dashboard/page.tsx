'use client';

import { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { useAuth } from '@/contexts/AuthContext';
import { BusinessProvider, useBusiness } from '@/contexts/BusinessContext';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { BusinessSelector } from '@/components/dashboard/BusinessSelector';
import { Calendar } from '@/components/dashboard/Calendar';
import { CreateAppointmentModal } from '@/components/dashboard/CreateAppointmentModal';
import { DashboardSidebar } from '@/components/dashboard/DashboardSidebar';
import { CalendarView } from '@/lib/calendar-utils';
import OnboardingTutorial from '@/components/dashboard/OnboardingTutorial';
import { Logo } from '@/components/Logo';
import { useRouter } from '@/i18n/routing';

function DashboardContent() {
  const t = useTranslations('dashboard');
  const router = useRouter();
  
  // Initialize from URL params on mount, then use state
  const [view, setView] = useState<CalendarView>('month');
  const [currentDate, setCurrentDate] = useState(new Date());
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const [isInitialized, setIsInitialized] = useState(false);
  const [isSwitchingBusiness, setIsSwitchingBusiness] = useState(false);
  const { isAuthenticated, user, logout } = useAuth();
  const { businesses, selectedBusiness, selectedBusinessId, isLoading: businessLoading, selectBusiness } = useBusiness();

  // Increment refresh key when business changes to force calendar reload
  useEffect(() => {
    if (selectedBusinessId) {
      setIsSwitchingBusiness(true);
      setRefreshKey(prev => prev + 1);
      // Clear switching state after a brief moment
      const timer = setTimeout(() => setIsSwitchingBusiness(false), 300);
      return () => clearTimeout(timer);
    }
  }, [selectedBusinessId]);

  // Read URL params on mount to restore calendar state
  useEffect(() => {
    if (typeof window === 'undefined' || isInitialized) return;

    const params = new URLSearchParams(window.location.search);
    const urlView = params.get('view') as CalendarView | null;
    const urlDate = params.get('date');

    if (urlView && ['month', 'week', 'day', 'list'].includes(urlView)) {
      setView(urlView);
    }

    if (urlDate) {
      const parsedDate = new Date(urlDate);
      if (!isNaN(parsedDate.getTime())) {
        setCurrentDate(parsedDate);
      }
    }

    setIsInitialized(true);
  }, [isInitialized]);

  const businessName = selectedBusiness?.name || user?.email?.split('@')[0] || "My Business";

  return (
    <div className="min-h-screen bg-white">
      {/* Sidebar */}
      <DashboardSidebar
        currentPage="calendar"
        onNotificationClick={(appointmentId) => {
          if (appointmentId) {
            // TODO: Navigate to appointment or scroll to it in calendar
            console.log('Navigate to appointment:', appointmentId);
          }
        }}
      />

      {/* Main Content */}
      <main className="ml-20 min-h-screen">
        {/* Top Bar */}
        <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-sm border-b border-gray-200/60">
          <div className="px-4 py-3 sm:px-8 sm:py-4 md:px-10 md:py-5 lg:px-12 lg:py-5 relative flex items-center justify-between gap-3 sm:gap-4 md:gap-6 lg:gap-8">
            <div className="flex items-center gap-3 sm:gap-4 md:gap-6 min-w-0 flex-1">
              {/* Business Selector */}
              {businesses.length > 0 ? (
                <div className="max-w-full sm:max-w-[200px] md:max-w-[240px] lg:max-w-[280px] xl:max-w-[320px] min-w-0 sm:min-w-[180px] md:min-w-[200px] lg:min-w-[240px] relative z-10">
                  <BusinessSelector
                    businesses={businesses}
                    selectedBusinessId={selectedBusinessId}
                    onBusinessChange={selectBusiness}
                    isLoading={businessLoading}
                  />
                </div>
              ) : (
                <div className="flex flex-col relative z-10">
                  <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-gray-900 tracking-tight truncate">{businessName}</h1>
                  <div className="flex items-center gap-2 mt-1">
                    <div className={`w-2 h-2 rounded-full ${isAuthenticated ? 'bg-green-500' : 'bg-gray-400'}`} />
                    <span className="text-xs sm:text-sm text-gray-500">
                      {isAuthenticated ? t('header.connected') : t('header.disconnected')}
                    </span>
                  </div>
                </div>
              )}
            </div>

            {/* Centered Logo - Visible only on large screens */}
            <div className="hidden lg:flex absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-0 items-center justify-center">
              <Logo size="sm" />
            </div>

            {/* New Appointment Button */}
            <button
              onClick={() => setShowCreateModal(true)}
              disabled={!isAuthenticated}
              className="px-3 py-2 sm:px-4 sm:py-2.5 md:px-5 md:py-3 lg:px-6 lg:py-3 bg-gradient-to-r from-teal-600 to-green-600 text-white rounded-xl sm:rounded-2xl font-semibold hover:shadow-lg hover:scale-[1.02] transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1.5 sm:gap-2 flex-shrink-0 relative z-10 text-sm sm:text-base"
            >
              <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
              </svg>
              <span className="hidden sm:inline">{t('header.newAppointment')}</span>
              <span className="sm:hidden">New</span>
            </button>
          </div>
        </header>

        {/* Calendar Content */}
        <div className="px-12 py-8">
          {/* Controls */}
          <div className="flex items-center justify-between mb-8">
            {/* Date Navigation */}
            <div className="flex items-center gap-4">
              <button
                onClick={() => {
                  const newDate = new Date(currentDate);
                  if (view === 'month') {
                    newDate.setMonth(newDate.getMonth() - 1);
                  } else if (view === 'week') {
                    newDate.setDate(newDate.getDate() - 7);
                  } else {
                    newDate.setDate(newDate.getDate() - 1);
                  }
                  setCurrentDate(newDate);
                }}
                className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-gray-100 transition-all"
              >
                <svg className="w-5 h-5 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
                </svg>
              </button>

              <h2 className="text-2xl font-bold text-gray-900 min-w-[180px] text-center">
                {currentDate.toLocaleDateString(undefined, { month: 'long', year: 'numeric' })}
              </h2>

              <button
                onClick={() => {
                  const newDate = new Date(currentDate);
                  if (view === 'month') {
                    newDate.setMonth(newDate.getMonth() + 1);
                  } else if (view === 'week') {
                    newDate.setDate(newDate.getDate() + 7);
                  } else {
                    newDate.setDate(newDate.getDate() + 1);
                  }
                  setCurrentDate(newDate);
                }}
                className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-gray-100 transition-all"
              >
                <svg className="w-5 h-5 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                </svg>
              </button>

              <button
                onClick={() => setCurrentDate(new Date())}
                className="ml-4 px-5 py-2 text-sm font-semibold text-teal-600 hover:bg-teal-50 rounded-xl transition-all"
              >
                {t('dateNavigation.today')}
              </button>
            </div>

            {/* View Selector */}
            <div className="flex gap-1 bg-gray-100 p-1 rounded-2xl">
              <button
                onClick={() => setView('month')}
                className={`px-6 py-2 rounded-xl text-sm font-semibold transition-all ${
                  view === 'month'
                    ? 'bg-white text-gray-900 shadow-sm'
                    : 'text-gray-500 hover:text-gray-900'
                }`}
              >
                {t('viewMode.month')}
              </button>
              <button
                onClick={() => setView('week')}
                className={`px-6 py-2 rounded-xl text-sm font-semibold transition-all ${
                  view === 'week'
                    ? 'bg-white text-gray-900 shadow-sm'
                    : 'text-gray-500 hover:text-gray-900'
                }`}
              >
                {t('viewMode.week')}
              </button>
              <button
                onClick={() => setView('day')}
                className={`px-6 py-2 rounded-xl text-sm font-semibold transition-all ${
                  view === 'day'
                    ? 'bg-white text-gray-900 shadow-sm'
                    : 'text-gray-500 hover:text-gray-900'
                }`}
              >
                {t('viewMode.day')}
              </button>
              <button
                onClick={() => setView('list')}
                className={`px-6 py-2 rounded-xl text-sm font-semibold transition-all ${
                  view === 'list'
                    ? 'bg-white text-gray-900 shadow-sm'
                    : 'text-gray-500 hover:text-gray-900'
                }`}
              >
                {t('viewMode.list')}
              </button>
            </div>
          </div>

          {/* Calendar View */}
          <div className="relative">
            {/* Switching Business Overlay */}
            {isSwitchingBusiness && (
              <div className="absolute inset-0 bg-white/60 backdrop-blur-[2px] z-10 flex items-center justify-center rounded-2xl transition-opacity duration-200">
                <div className="flex items-center gap-3 px-6 py-3 bg-white rounded-xl shadow-lg border border-gray-200 animate-fade-in">
                  <div className="w-5 h-5 border-2 border-teal-500 border-t-transparent rounded-full animate-spin" />
                  <span className="text-sm font-medium text-gray-700">
                    {t('loading.loadingBusiness', { businessName: selectedBusiness?.name || '' })}
                  </span>
                </div>
              </div>
            )}
            
            <div className={`transition-opacity duration-200 ${isSwitchingBusiness ? 'opacity-50' : 'opacity-100'}`}>
              <Calendar
                key={refreshKey}
                view={view}
                currentDate={currentDate}
                onViewChange={setView}
                onDateChange={setCurrentDate}
                businessId={selectedBusinessId}
              />
            </div>
          </div>
        </div>
      </main>

      {/* Modals */}
      <CreateAppointmentModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onSuccess={() => {
          setRefreshKey(prev => prev + 1);
        }}
        defaultDate={currentDate}
        businessId={selectedBusinessId}
      />
      <OnboardingTutorial />
    </div>
  );
}

export default function DashboardPage() {
  return (
    <ProtectedRoute requireRole="owner">
      <BusinessProvider>
        <DashboardContent />
      </BusinessProvider>
    </ProtectedRoute>
  );
}
