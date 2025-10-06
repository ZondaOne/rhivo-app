'use client';

import { Fragment } from 'react';

export interface Business {
  id: string;
  subdomain: string;
  name: string;
  isPrimary: boolean;
  joinedAt: string;
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
  const selectedBusiness = businesses.find(b => b.id === selectedBusinessId);

  if (isLoading) {
    return (
      <div className="flex items-center gap-3 px-4 py-2 bg-gray-50 rounded-xl animate-pulse">
        <div className="w-8 h-8 bg-gray-200 rounded-lg" />
        <div className="flex-1">
          <div className="h-4 bg-gray-200 rounded w-32 mb-1" />
          <div className="h-3 bg-gray-200 rounded w-24" />
        </div>
      </div>
    );
  }

  if (businesses.length === 0) {
    return (
      <div className="flex items-center gap-3 px-4 py-2 bg-gray-50 rounded-xl">
        <div className="w-8 h-8 bg-gradient-to-br from-teal-500 to-green-500 rounded-lg flex items-center justify-center">
          <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
          </svg>
        </div>
        <div className="flex-1">
          <p className="text-sm font-medium text-gray-900">No Business</p>
          <p className="text-xs text-gray-500">Set up your business first</p>
        </div>
      </div>
    );
  }

  if (businesses.length === 1) {
    const business = businesses[0];
    return (
      <div className="flex items-center gap-3 px-4 py-2 bg-gray-50 rounded-xl">
        <div className="w-8 h-8 bg-gradient-to-br from-teal-500 to-green-500 rounded-lg flex items-center justify-center">
          <span className="text-white text-sm font-semibold">
            {business.name.charAt(0).toUpperCase()}
          </span>
        </div>
        <div className="flex-1">
          <p className="text-sm font-semibold text-gray-900">{business.name}</p>
          <p className="text-xs text-gray-500">{business.subdomain}.rivo.app</p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative group">
      <button className="flex items-center gap-3 px-4 py-2 bg-gray-50 hover:bg-gray-100 rounded-xl transition-all w-full">
        <div className="w-8 h-8 bg-gradient-to-br from-teal-500 to-green-500 rounded-lg flex items-center justify-center">
          <span className="text-white text-sm font-semibold">
            {selectedBusiness?.name.charAt(0).toUpperCase() || 'B'}
          </span>
        </div>
        <div className="flex-1 text-left">
          <p className="text-sm font-semibold text-gray-900 flex items-center gap-2">
            {selectedBusiness?.name || 'Select Business'}
            {selectedBusiness?.isPrimary && (
              <span className="text-[10px] px-1.5 py-0.5 bg-teal-100 text-teal-700 rounded font-medium">
                PRIMARY
              </span>
            )}
          </p>
          <p className="text-xs text-gray-500">
            {selectedBusiness ? `${selectedBusiness.subdomain}.rivo.app` : 'Choose a business'}
          </p>
        </div>
        <svg className="w-5 h-5 text-gray-400 group-hover:text-gray-600 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 9l4-4 4 4m0 6l-4 4-4-4" />
        </svg>
      </button>

      {/* Dropdown Menu */}
      <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-xl shadow-2xl border border-gray-200 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-50 max-h-80 overflow-y-auto">
        <div className="p-2">
          {businesses.map((business) => (
            <button
              key={business.id}
              onClick={() => onBusinessChange(business.id)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-all ${
                business.id === selectedBusinessId
                  ? 'bg-teal-50 text-teal-900'
                  : 'hover:bg-gray-50 text-gray-900'
              }`}
            >
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                business.id === selectedBusinessId
                  ? 'bg-gradient-to-br from-teal-500 to-green-500'
                  : 'bg-gray-200'
              }`}>
                <span className={`text-sm font-semibold ${
                  business.id === selectedBusinessId ? 'text-white' : 'text-gray-700'
                }`}>
                  {business.name.charAt(0).toUpperCase()}
                </span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold flex items-center gap-2">
                  {business.name}
                  {business.isPrimary && (
                    <span className="text-[10px] px-1.5 py-0.5 bg-teal-100 text-teal-700 rounded font-medium">
                      PRIMARY
                    </span>
                  )}
                </p>
                <p className="text-xs text-gray-500 truncate">{business.subdomain}.rivo.app</p>
              </div>
              {business.id === selectedBusinessId && (
                <svg className="w-5 h-5 text-teal-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                </svg>
              )}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
