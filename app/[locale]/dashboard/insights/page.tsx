'use client';

import { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { useAuth } from '@/contexts/AuthContext';
import { BusinessProvider, useBusiness } from '@/contexts/BusinessContext';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { BusinessSelector } from '@/components/dashboard/BusinessSelector';
import { DashboardSidebar } from '@/components/dashboard/DashboardSidebar';
import { Logo } from '@/components/Logo';
import { BookingsChart } from '@/components/dashboard/insights/BookingsChart';
import { RevenueChart } from '@/components/dashboard/insights/RevenueChart';
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
      <DashboardSidebar
        currentPage="insights"
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
                      {isAuthenticated ? t('header.connected') : t('header.disconnected')}
                    </span>
                  </div>
                </div>
              )}
            </div>

            {/* Centered Logo - Hidden on mobile */}
            <div className="hidden lg:block absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
              <Logo size="sm" />
            </div>

            {/* Time Range Selector */}
            <div className="flex gap-1 bg-gray-100 p-1 rounded-xl sm:rounded-2xl flex-shrink-0 w-full sm:w-auto">
              <button
                onClick={() => setTimeRange('7d')}
                className={`flex-1 sm:flex-none px-3 sm:px-5 py-2 rounded-lg sm:rounded-xl text-xs sm:text-sm font-semibold transition-all ${
                  timeRange === '7d'
                    ? 'bg-white text-gray-900 shadow-sm'
                    : 'text-gray-500 hover:text-gray-900'
                }`}
              >
                <span className="hidden sm:inline">7 Days</span>
                <span className="sm:hidden">7d</span>
              </button>
              <button
                onClick={() => setTimeRange('30d')}
                className={`flex-1 sm:flex-none px-3 sm:px-5 py-2 rounded-lg sm:rounded-xl text-xs sm:text-sm font-semibold transition-all ${
                  timeRange === '30d'
                    ? 'bg-white text-gray-900 shadow-sm'
                    : 'text-gray-500 hover:text-gray-900'
                }`}
              >
                <span className="hidden sm:inline">30 Days</span>
                <span className="sm:hidden">30d</span>
              </button>
              <button
                onClick={() => setTimeRange('90d')}
                className={`flex-1 sm:flex-none px-3 sm:px-5 py-2 rounded-lg sm:rounded-xl text-xs sm:text-sm font-semibold transition-all ${
                  timeRange === '90d'
                    ? 'bg-white text-gray-900 shadow-sm'
                    : 'text-gray-500 hover:text-gray-900'
                }`}
              >
                <span className="hidden sm:inline">90 Days</span>
                <span className="sm:hidden">90d</span>
              </button>
            </div>
          </div>
        </header>

        {/* Insights Content */}
        <div className="px-4 sm:px-8 lg:px-12 py-6 sm:py-8">
          <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mb-6 sm:mb-8">{t('insights.title')}</h2>

          {/* Widgets Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 sm:gap-8">
            {/* Bookings Chart */}
            <BookingsChart
              businessId={selectedBusinessId}
              timeRange={timeRange}
            />

            {/* Revenue Chart */}
            <RevenueChart
              businessId={selectedBusinessId}
              timeRange={timeRange}
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
