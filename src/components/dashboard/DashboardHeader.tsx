'use client';

import { useTranslations } from 'next-intl';
import { BusinessSelector } from '@/components/dashboard/BusinessSelector';
import { Logo } from '@/components/Logo';

interface Business {
  id: string;
  name: string;
  // Add other business properties as needed
}

interface DashboardHeaderProps {
  businesses: Business[];
  selectedBusinessId: string | null;
  onBusinessChange: (businessId: string) => void;
  businessLoading: boolean;
  businessName: string;
  isAuthenticated: boolean;
  onNewAppointmentClick: () => void;
}

export function DashboardHeader({
  businesses,
  selectedBusinessId,
  onBusinessChange,
  businessLoading,
  businessName,
  isAuthenticated,
  onNewAppointmentClick
}: DashboardHeaderProps) {
  const t = useTranslations('dashboard');

  return (
    <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-sm border-b border-gray-200/60">
      <div className="px-4 py-2 sm:px-8 sm:py-4 md:px-10 md:py-5 lg:px-12 lg:py-5 relative flex items-center justify-between gap-2 sm:gap-4 md:gap-6 lg:gap-8">
        <div className="flex items-center gap-2 sm:gap-4 md:gap-6 min-w-0 flex-1">
          {/* Business Selector */}
          {businesses.length > 0 ? (
            <div className="max-w-full sm:max-w-[200px] md:max-w-[240px] lg:max-w-[280px] xl:max-w-[320px] min-w-0 sm:min-w-[180px] md:min-w-[200px] lg:min-w-[240px] relative z-10">
              <BusinessSelector
                businesses={businesses}
                selectedBusinessId={selectedBusinessId}
                onBusinessChange={onBusinessChange}
                isLoading={businessLoading}
              />
            </div>
          ) : (
            <div className="flex flex-col relative z-10">
              <h1 className="text-lg sm:text-2xl md:text-3xl font-bold text-gray-900 tracking-tight truncate">{businessName}</h1>
              <div className="flex items-center gap-1.5 mt-0.5">
                <div className={`w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full ${isAuthenticated ? 'bg-green-500' : 'bg-gray-400'}`} />
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

        <div className="flex items-center gap-2 sm:gap-4">
          {/* Logo - Visible only on mobile (max-sm), on the right */}
          <div className="max-sm:flex hidden items-center justify-center flex-shrink-0">
            <Logo size="xs" />
          </div>

          {/* New Appointment Button - Hidden on mobile (max-sm), visible on sm and up */}
          <button
            onClick={onNewAppointmentClick}
            disabled={!isAuthenticated}
            className="max-sm:hidden flex px-4 py-2.5 md:px-5 md:py-3 lg:px-6 lg:py-3 bg-gradient-to-r from-teal-600 to-green-600 text-white rounded-xl sm:rounded-2xl font-semibold hover:shadow-lg hover:scale-[1.02] transition-all disabled:opacity-50 disabled:cursor-not-allowed items-center gap-2 flex-shrink-0 relative z-10 text-sm sm:text-base"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
            </svg>
            <span>{t('header.newAppointment')}</span>
          </button>
        </div>
      </div>
    </header>
  );
}
