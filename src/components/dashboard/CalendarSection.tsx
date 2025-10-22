'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Calendar } from '@/components/dashboard/Calendar';
import { CalendarView } from '@/lib/calendar-utils';

interface CalendarSectionProps {
  view: CalendarView;
  currentDate: Date;
  onViewChange: (view: CalendarView) => void;
  onDateChange: (date: Date) => void;
  businessId: string | null;
  refreshKey: number;
  isSwitchingBusiness: boolean;
  selectedBusinessName?: string;
}

export function CalendarSection({
  view,
  currentDate,
  onViewChange,
  onDateChange,
  businessId,
  refreshKey,
  isSwitchingBusiness,
  selectedBusinessName
}: CalendarSectionProps) {
  const t = useTranslations('dashboard');

  return (
    <div className="px-4 py-4 md:px-8 md:py-6 lg:px-12 lg:py-8">
      {/* Controls */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between mb-6 md:mb-8">
        {/* Date Navigation - Hidden below lg (1024px), shows when Rivo logo appears */}
        <div className="hidden lg:flex items-center justify-start gap-4">
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
              onDateChange(newDate);
            }}
            className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-gray-100 transition-all flex-shrink-0"
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
              onDateChange(newDate);
            }}
            className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-gray-100 transition-all flex-shrink-0"
          >
            <svg className="w-5 h-5 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
            </svg>
          </button>

          <button
            onClick={() => onDateChange(new Date())}
            className="ml-4 px-5 py-2 text-sm font-semibold text-teal-600 hover:bg-teal-50 rounded-xl transition-all"
          >
            {t('dateNavigation.today')}
          </button>
        </div>

        {/* View Selector - Only Day and List on mobile/tablet, all views on desktop */}
        <div className="flex gap-1 bg-gray-100 p-1 rounded-2xl w-full md:w-auto">
          {/* Month view - Desktop only (hidden below md: 768px) */}
          <button
            onClick={() => onViewChange('month')}
            className={`hidden md:flex px-6 py-2 rounded-xl text-sm font-semibold transition-all ${
              view === 'month'
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-500 hover:text-gray-900'
            }`}
          >
            {t('viewMode.month')}
          </button>
          {/* Week view - Desktop only (hidden below md: 768px) */}
          <button
            onClick={() => onViewChange('week')}
            className={`hidden md:flex px-6 py-2 rounded-xl text-sm font-semibold transition-all ${
              view === 'week'
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-500 hover:text-gray-900'
            }`}
          >
            {t('viewMode.week')}
          </button>
          {/* Day view - All screens */}
          <button
            onClick={() => onViewChange('day')}
            className={`flex-1 md:flex-none px-6 py-2.5 md:py-2 rounded-xl text-sm font-semibold transition-all ${
              view === 'day'
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-500 hover:text-gray-900'
            }`}
          >
            {t('viewMode.day')}
          </button>
          {/* List view - All screens */}
          <button
            onClick={() => onViewChange('list')}
            className={`flex-1 md:flex-none px-6 py-2.5 md:py-2 rounded-xl text-sm font-semibold transition-all ${
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
                {t('loading.loadingBusiness', { businessName: selectedBusinessName || '' })}
              </span>
            </div>
          </div>
        )}

        <div className={`transition-opacity duration-200 ${isSwitchingBusiness ? 'opacity-50' : 'opacity-100'}`}>
          <Calendar
            key={refreshKey}
            view={view}
            currentDate={currentDate}
            onViewChange={onViewChange}
            onDateChange={onDateChange}
            businessId={businessId}
          />
        </div>
      </div>
    </div>
  );
}
