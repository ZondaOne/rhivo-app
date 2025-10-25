'use client';

import { Fragment, useState } from 'react';
import { useTranslations } from 'next-intl';

export interface Business {
  id: string;
  subdomain: string;
  name: string;
  isPrimary: boolean;
  joinedAt: string;
  profileImageUrl?: string;
  logoUrl?: string;
}

interface BusinessSelectorProps {
  businesses: Business[];
  selectedBusinessId: string | null;
  onBusinessChange: (businessId: string) => void;
  isLoading?: boolean;
}

export function BusinessSelector({
  businesses,
  selectedBusinessId,
  onBusinessChange,
  isLoading = false,
}: BusinessSelectorProps) {
  const t = useTranslations('dashboard.businessSelector');
  const selectedBusiness = businesses.find(b => b.id === selectedBusinessId);
  const [isOpen, setIsOpen] = useState(false);

  if (isLoading) {
    return (
      <div className="flex items-start gap-2 sm:gap-3 md:gap-4 animate-pulse">
        <div className="w-10 h-10 sm:w-12 sm:h-12 md:w-14 md:h-14 bg-gray-200 rounded-lg sm:rounded-xl md:rounded-2xl flex-shrink-0" />
        <div className="flex-1 min-w-0 pt-0.5">
          <div className="h-5 sm:h-7 bg-gray-200 rounded w-32 sm:w-48 mb-1.5 sm:mb-2" />
          <div className="h-3 sm:h-4 bg-gray-200 rounded w-24 sm:w-32" />
        </div>
      </div>
    );
  }

  if (businesses.length === 0) {
    return (
      <div className="flex items-start gap-2 sm:gap-3 md:gap-4">
        <div className="w-10 h-10 sm:w-12 sm:h-12 md:w-14 md:h-14 bg-gradient-to-br from-teal-500 to-green-500 rounded-lg sm:rounded-xl md:rounded-2xl flex items-center justify-center flex-shrink-0">
          <svg className="w-5 h-5 sm:w-6 sm:h-6 md:w-7 md:h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
          </svg>
        </div>
        <div className="flex-1 min-w-0 pt-0.5">
          <h1 className="text-lg sm:text-xl md:text-2xl font-bold text-gray-900 tracking-tight">{t('noBusiness')}</h1>
          <p className="text-xs sm:text-sm text-gray-500 mt-0.5 sm:mt-1">{t('setupBusiness')}</p>
        </div>
      </div>
    );
  }

  if (businesses.length === 1) {
    const business = businesses[0];
    return (
      <div className="flex items-start gap-2 sm:gap-3 md:gap-4">
        {business.profileImageUrl ? (
          <img
            src={business.profileImageUrl}
            alt={business.name}
            className="w-10 h-10 sm:w-12 sm:h-12 md:w-14 md:h-14 rounded-lg sm:rounded-xl md:rounded-2xl object-cover flex-shrink-0"
          />
        ) : (
          <div className="w-10 h-10 sm:w-12 sm:h-12 md:w-14 md:h-14 bg-gradient-to-br from-teal-500 to-green-500 rounded-lg sm:rounded-xl md:rounded-2xl flex items-center justify-center flex-shrink-0">
            <span className="text-white text-base sm:text-lg md:text-xl font-semibold">
              {business.name.charAt(0).toUpperCase()}
            </span>
          </div>
        )}
        <div className="flex-1 min-w-0 pt-0.5 sm:pt-1">
          <div className="flex items-center gap-2">
            <h1 className="text-lg sm:text-xl md:text-2xl font-bold text-gray-900 tracking-tight truncate">
              {business.name}
            </h1>
            {business.isPrimary && (
              <span className="text-[9px] sm:text-[10px] px-1.5 sm:px-2 py-0.5 sm:py-1 bg-teal-100 text-teal-700 rounded-md font-semibold uppercase tracking-wide flex-shrink-0">
                {t('primary')}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2 mt-0.5 sm:mt-1">
            <p className="text-xs sm:text-sm text-gray-500 truncate">{business.subdomain}.rivo.app</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-start gap-2 sm:gap-3 md:gap-4 hover:opacity-80 transition-opacity w-full text-left"
      >
        {selectedBusiness?.profileImageUrl ? (
          <img
            src={selectedBusiness.profileImageUrl}
            alt={selectedBusiness.name}
            className="w-10 h-10 sm:w-12 sm:h-12 md:w-14 md:h-14 rounded-lg sm:rounded-xl md:rounded-2xl object-cover flex-shrink-0"
          />
        ) : (
          <div className="w-10 h-10 sm:w-12 sm:h-12 md:w-14 md:h-14 bg-gradient-to-br from-teal-500 to-green-500 rounded-lg sm:rounded-xl md:rounded-2xl flex items-center justify-center flex-shrink-0">
            <span className="text-white text-base sm:text-lg md:text-xl font-semibold">
              {selectedBusiness?.name.charAt(0).toUpperCase() || 'B'}
            </span>
          </div>
        )}
        <div className="flex-1 min-w-0 pt-0.5 sm:pt-1">
          <div className="flex items-center gap-1.5 sm:gap-2">
            <h1 className="text-lg sm:text-xl md:text-2xl font-bold text-gray-900 tracking-tight truncate">
              {selectedBusiness?.name || t('selectBusiness')}
            </h1>
            {selectedBusiness?.isPrimary && (
              <span className="text-[9px] sm:text-[10px] px-1.5 sm:px-2 py-0.5 sm:py-1 bg-teal-100 text-teal-700 rounded-md font-semibold uppercase tracking-wide flex-shrink-0">
                {t('primary')}
              </span>
            )}
            <svg
              className={`w-4 h-4 sm:w-5 sm:h-5 text-gray-400 hover:text-gray-600 transition-all flex-shrink-0 ml-auto ${isOpen ? 'rotate-180' : ''}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </div>
          <div className="flex items-center gap-2 mt-0.5 sm:mt-1">
            <p className="text-xs sm:text-sm text-gray-500 truncate">
              {selectedBusiness ? `${selectedBusiness.subdomain}.rivo.app` : 'Choose a business'}
            </p>
          </div>
        </div>
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-40"
            onClick={() => setIsOpen(false)}
          />

          <div className="absolute top-full left-0 mt-3 w-full min-w-[280px] sm:min-w-[320px] bg-white rounded-2xl shadow-2xl border border-gray-200 z-50 max-h-[400px] overflow-y-auto">
            <div className="p-2">
              {businesses.map((business) => (
                <button
                  key={business.id}
                  onClick={() => {
                    onBusinessChange(business.id);
                    setIsOpen(false);
                  }}
                  className={`w-full flex items-start gap-2 sm:gap-3 px-3 sm:px-4 py-2.5 sm:py-3 rounded-xl text-left transition-all ${
                    business.id === selectedBusinessId
                      ? 'bg-teal-50'
                      : 'hover:bg-gray-50'
                  }`}
                >
                  {business.profileImageUrl ? (
                    <img
                      src={business.profileImageUrl}
                      alt={business.name}
                      className={`w-10 h-10 sm:w-11 sm:h-11 rounded-lg sm:rounded-xl object-cover flex-shrink-0 ${
                        business.id === selectedBusinessId ? 'ring-2 ring-teal-500' : ''
                      }`}
                    />
                  ) : (
                    <div className={`w-10 h-10 sm:w-11 sm:h-11 rounded-lg sm:rounded-xl flex items-center justify-center flex-shrink-0 ${
                      business.id === selectedBusinessId
                        ? 'bg-gradient-to-br from-teal-500 to-green-500'
                        : 'bg-gray-200'
                    }`}>
                      <span className={`text-sm sm:text-base font-semibold ${
                        business.id === selectedBusinessId ? 'text-white' : 'text-gray-700'
                      }`}>
                        {business.name.charAt(0).toUpperCase()}
                      </span>
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 sm:gap-2">
                      <p className={`text-xs sm:text-sm font-semibold truncate ${
                        business.id === selectedBusinessId ? 'text-teal-900' : 'text-gray-900'
                      }`}>
                        {business.name}
                      </p>
                      {business.isPrimary && (
                        <span className="text-[9px] sm:text-[10px] px-1 sm:px-1.5 py-0.5 bg-teal-100 text-teal-700 rounded font-semibold uppercase tracking-wide flex-shrink-0">
                          {t('primary')}
                        </span>
                      )}
                    </div>
                    <p className="text-[10px] sm:text-xs text-gray-500 truncate mt-0.5">{business.subdomain}.rivo.app</p>
                  </div>
                  {business.id === selectedBusinessId && (
                    <svg className="w-4 h-4 sm:w-5 sm:h-5 text-teal-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                    </svg>
                  )}
                </button>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
