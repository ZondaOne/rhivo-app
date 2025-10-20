'use client';

import { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { useAuth } from '@/contexts/AuthContext';
import { BusinessProvider, useBusiness } from '@/contexts/BusinessContext';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { BusinessSelector } from '@/components/dashboard/BusinessSelector';
import { NotificationCenter } from '@/components/dashboard/NotificationCenter';
import { Logo } from '@/components/Logo';
import { Link } from '@/i18n/routing';
import { BookingsChart } from '@/components/dashboard/insights/BookingsChart';
import { ComingSoonWidget } from '@/components/dashboard/insights/ComingSoonWidget';

function InsightsContent() {
  const t = useTranslations('dashboard');
  const { isAuthenticated, user, logout } = useAuth();
  const { businesses, selectedBusiness, selectedBusinessId, isLoading: businessLoading, selectBusiness } = useBusiness();
  const [timeRange, setTimeRange] = useState<'7d' | '30d' | '90d'>('30d');

  const businessName = selectedBusiness?.name || user?.email?.split('@')[0] || "My Business";

  return (
    <div className="min-h-screen bg-white">
      {/* Sidebar */}
      <aside className="fixed left-0 top-0 h-full w-20 bg-white border-r border-gray-200/60 flex flex-col items-center py-6 z-50">
        {/* Navigation */}
        <nav className="flex-1 flex flex-col gap-2 w-full px-3 pt-2">
          <Link
            href="/dashboard"
            className="w-full h-14 flex items-center justify-center rounded-xl text-gray-400 hover:text-gray-900 hover:bg-gray-50 transition-all relative group"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" />
            </svg>
            <div className="absolute left-full ml-4 px-3 py-1.5 bg-gray-900 text-white text-sm rounded-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all whitespace-nowrap">
              {t('navigation.calendar')}
            </div>
          </Link>

          <button className="w-full h-14 flex items-center justify-center rounded-xl bg-gray-50 text-gray-900 relative group">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" />
            </svg>
            <div className="absolute left-full ml-4 px-3 py-1.5 bg-gray-900 text-white text-sm rounded-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all whitespace-nowrap">
              {t('navigation.insights')}
            </div>
          </button>

          <NotificationCenter
            onNotificationClick={(appointmentId) => {
              if (appointmentId) {
                console.log('Navigate to appointment:', appointmentId);
              }
            }}
          />

          <Link
            href="/dashboard/settings"
            className="w-full h-14 flex items-center justify-center rounded-xl text-gray-400 hover:text-gray-900 hover:bg-gray-50 transition-all relative group"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.324.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 011.37.49l1.296 2.247a1.125 1.125 0 01-.26 1.431l-1.003.827c-.293.24-.438.613-.431.992a6.759 6.759 0 010 .255c-.007.378.138.75.43.99l1.005.828c.424.35.534.954.26 1.43l-1.298 2.247a1.125 1.125 0 01-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.57 6.57 0 01-.22.128c-.331.183-.581.495-.644.869l-.213 1.28c-.09.543-.56.941-1.11.941h-2.594c-.55 0-1.02-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 01-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 01-1.369-.49l-1.297-2.247a1.125 1.125 0 01.26-1.431l1.004-.827c.292-.24.437-.613.43-.992a6.932 6.932 0 010-.255c.007-.378-.138-.75-.43-.99l-1.004-.828a1.125 1.125 0 01-.26-1.43l1.297-2.247a1.125 1.125 0 011.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.087.22-.128.332-.183.582-.495.644-.869l.214-1.281z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            <div className="absolute left-full ml-4 px-3 py-1.5 bg-gray-900 text-white text-sm rounded-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all whitespace-nowrap pointer-events-none">
              {t('navigation.settings')}
            </div>
          </Link>

          <button className="w-full h-14 flex items-center justify-center rounded-xl text-gray-400 hover:text-gray-900 hover:bg-gray-50 transition-all relative group">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 002.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 00-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 00.75-.75 2.25 2.25 0 00-.1-.664m-5.8 0A2.251 2.251 0 0113.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25zM6.75 12h.008v.008H6.75V12zm0 3h.008v.008H6.75V15zm0 3h.008v.008H6.75V18z" />
            </svg>
            <div className="absolute left-full ml-4 px-3 py-1.5 bg-gray-900 text-white text-sm rounded-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all whitespace-nowrap">
              {t('navigation.services')}
            </div>
          </button>
        </nav>

        {/* Bottom Actions */}
        <div className="flex flex-col gap-2 w-full px-3">
          <Link
            href="/debug/api"
            className="w-full h-12 flex items-center justify-center rounded-xl text-gray-400 hover:text-gray-900 hover:bg-gray-50 transition-all relative group"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
            </svg>
            <div className="absolute left-full ml-4 px-3 py-1.5 bg-gray-900 text-white text-sm rounded-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all whitespace-nowrap">
              {t('navigation.debug')}
            </div>
          </Link>

          {isAuthenticated && (
            <div className="relative group">
              <button className="w-full h-12 flex items-center justify-center">
                <div className="w-10 h-10 bg-gradient-to-br from-teal-500 to-green-500 rounded-full flex items-center justify-center">
                  <span className="text-white text-sm font-semibold">
                    {user?.email?.charAt(0).toUpperCase() || 'U'}
                  </span>
                </div>
              </button>
              <div className="absolute left-full bottom-0 ml-4 w-72 bg-white rounded-2xl shadow-2xl border border-gray-200 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all">
                <div className="p-5 border-b border-gray-100">
                  <p className="font-semibold text-gray-900">{user?.email}</p>
                  {user?.role && <p className="text-sm text-gray-500 mt-1 capitalize">{user.role}</p>}
                </div>
                <div className="p-2">
                  <button
                    onClick={logout}
                    className="w-full text-left px-4 py-3 text-sm text-gray-700 hover:bg-gray-50 rounded-xl transition-all"
                  >
                    {t('navigation.signOut')}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </aside>

      {/* Main Content */}
      <main className="ml-20 min-h-screen">
        {/* Top Bar */}
        <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-sm border-b border-gray-200/60">
          <div className="px-12 py-5 relative flex items-center justify-between gap-8">
            <div className="flex items-center gap-6 min-w-0 flex-1">
              {/* Business Selector */}
              {businesses.length > 0 ? (
                <div className="max-w-[320px] min-w-[240px]">
                  <BusinessSelector
                    businesses={businesses}
                    selectedBusinessId={selectedBusinessId}
                    onBusinessChange={selectBusiness}
                    isLoading={businessLoading}
                  />
                </div>
              ) : (
                <div className="flex flex-col">
                  <h1 className="text-3xl font-bold text-gray-900 tracking-tight truncate">{businessName}</h1>
                  <div className="flex items-center gap-2 mt-1">
                    <div className={`w-2 h-2 rounded-full ${isAuthenticated ? 'bg-green-500' : 'bg-gray-400'}`} />
                    <span className="text-sm text-gray-500">
                      {isAuthenticated ? t('header.connected') : t('header.disconnected')}
                    </span>
                  </div>
                </div>
              )}
            </div>

            {/* Centered Logo */}
            <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
              <Logo size="sm" />
            </div>

            {/* Time Range Selector */}
            <div className="flex gap-1 bg-gray-100 p-1 rounded-2xl flex-shrink-0">
              <button
                onClick={() => setTimeRange('7d')}
                className={`px-5 py-2 rounded-xl text-sm font-semibold transition-all ${
                  timeRange === '7d'
                    ? 'bg-white text-gray-900 shadow-sm'
                    : 'text-gray-500 hover:text-gray-900'
                }`}
              >
                7 Days
              </button>
              <button
                onClick={() => setTimeRange('30d')}
                className={`px-5 py-2 rounded-xl text-sm font-semibold transition-all ${
                  timeRange === '30d'
                    ? 'bg-white text-gray-900 shadow-sm'
                    : 'text-gray-500 hover:text-gray-900'
                }`}
              >
                30 Days
              </button>
              <button
                onClick={() => setTimeRange('90d')}
                className={`px-5 py-2 rounded-xl text-sm font-semibold transition-all ${
                  timeRange === '90d'
                    ? 'bg-white text-gray-900 shadow-sm'
                    : 'text-gray-500 hover:text-gray-900'
                }`}
              >
                90 Days
              </button>
            </div>
          </div>
        </header>

        {/* Insights Content */}
        <div className="px-12 py-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-8">Business Insights</h2>

          {/* Widgets Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Bookings Chart */}
            <BookingsChart 
              businessId={selectedBusinessId} 
              timeRange={timeRange}
            />

            {/* Revenue Widget - Coming Soon */}
            <ComingSoonWidget 
              title="Revenue Analytics"
              description="Track your earnings, average booking value, and revenue trends over time."
              icon={
                <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v12m-3-2.818l.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              }
            />

            {/* Customer Insights - Coming Soon */}
            <ComingSoonWidget 
              title="Customer Analytics"
              description="Understand your customer base with repeat booking rates, new vs returning customers, and demographics."
              icon={
                <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" />
                </svg>
              }
            />

            {/* Service Performance - Coming Soon */}
            <ComingSoonWidget 
              title="Service Performance"
              description="See which services are most popular, average duration, and capacity utilization."
              icon={
                <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9.568 3H5.25A2.25 2.25 0 003 5.25v4.318c0 .597.237 1.17.659 1.591l9.581 9.581c.699.699 1.78.872 2.607.33a18.095 18.095 0 005.223-5.223c.542-.827.369-1.908-.33-2.607L11.16 3.66A2.25 2.25 0 009.568 3z" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 6h.008v.008H6V6z" />
                </svg>
              }
            />
          </div>
        </div>
      </main>
    </div>
  );
}

export default function InsightsPage() {
  return (
    <ProtectedRoute requireRole="owner">
      <BusinessProvider>
        <InsightsContent />
      </BusinessProvider>
    </ProtectedRoute>
  );
}
