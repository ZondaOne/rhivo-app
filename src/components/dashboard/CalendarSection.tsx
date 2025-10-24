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
        {/* Date Navigation - Only show for month and week views. Hidden below lg (1024px) */}
        {(view === 'month' || view === 'week') && (
          <div className="hidden lg:flex items-center justify-start gap-4">
            <button
              onClick={() => {
                const newDate = new Date(currentDate);
                if (view === 'month') {
                  newDate.setMonth(newDate.getMonth() - 1);
                } else if (view === 'week') {
                  newDate.setDate(newDate.getDate() - 7);
                }
                onDateChange(newDate);
              }}
              className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-gray-100 hover:scale-105 active:scale-95 transition-all duration-200 ease-out flex-shrink-0"
            >
              <svg className="w-5 h-5 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
              </svg>
            </button>

            {view === 'month' && (
              <h2 className="text-2xl font-bold text-gray-900 min-w-[180px] text-center">
                {currentDate.toLocaleDateString(undefined, { month: 'long', year: 'numeric' })}
              </h2>
            )}

            {view === 'week' && (
              <h2 className="text-2xl font-bold text-gray-900 min-w-[240px] text-center">
                {(() => {
                  const weekStart = new Date(currentDate);
                  const dayOfWeek = weekStart.getDay();
                  const daysFromMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
                  weekStart.setDate(weekStart.getDate() - daysFromMonday);
                  
                  const weekEnd = new Date(weekStart);
                  weekEnd.setDate(weekEnd.getDate() + 6);

                  const isSameMonth = weekStart.getMonth() === weekEnd.getMonth();
                  const isSameYear = weekStart.getFullYear() === weekEnd.getFullYear();
                  
                  if (isSameMonth) {
                    return `${weekStart.toLocaleDateString(undefined, { month: 'long', day: 'numeric' })} - ${weekEnd.getDate()}, ${weekEnd.getFullYear()}`;
                  } else if (isSameYear) {
                    return `${weekStart.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })} - ${weekEnd.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}, ${weekEnd.getFullYear()}`;
                  } else {
                    return `${weekStart.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })} - ${weekEnd.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}`;
                  }
                })()}
              </h2>
            )}

            <button
              onClick={() => {
                const newDate = new Date(currentDate);
                if (view === 'month') {
                  newDate.setMonth(newDate.getMonth() + 1);
                } else if (view === 'week') {
                  newDate.setDate(newDate.getDate() + 7);
                }
                onDateChange(newDate);
              }}
              className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-gray-100 hover:scale-105 active:scale-95 transition-all duration-200 ease-out flex-shrink-0"
            >
              <svg className="w-5 h-5 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
              </svg>
            </button>

            <button
              onClick={() => onDateChange(new Date())}
              className="ml-4 px-5 py-2 text-sm font-semibold text-teal-600 hover:bg-teal-50 hover:scale-105 active:scale-95 rounded-xl transition-all duration-200 ease-out"
            >
              {t('dateNavigation.today')}
            </button>
          </div>
        )}

        {/* Spacer for day/list views to push selector to the right */}
        {(view === 'day' || view === 'list') && <div className="hidden md:flex flex-1" />}

        {/* View Selector - Only Day and List on mobile/tablet, all views on desktop */}
        <div className="flex gap-1 bg-gray-100 p-1 rounded-2xl w-full md:w-auto">
          {/* Month view - Desktop only (hidden below md: 768px) */}
          <button
            onClick={() => onViewChange('month')}
            className={`hidden md:flex px-6 py-2 rounded-xl text-sm font-semibold transition-all duration-200 ease-out ${
              view === 'month'
                ? 'bg-white text-gray-900 shadow-sm scale-[1.02]'
                : 'text-gray-500 hover:text-gray-900 hover:scale-105 active:scale-95'
            }`}
          >
            {t('viewMode.month')}
          </button>
          {/* Week view - Desktop only (hidden below md: 768px) */}
          <button
            onClick={() => onViewChange('week')}
            className={`hidden md:flex px-6 py-2 rounded-xl text-sm font-semibold transition-all duration-200 ease-out ${
              view === 'week'
                ? 'bg-white text-gray-900 shadow-sm scale-[1.02]'
                : 'text-gray-500 hover:text-gray-900 hover:scale-105 active:scale-95'
            }`}
          >
            {t('viewMode.week')}
          </button>
          {/* Day view - All screens */}
          <button
            onClick={() => onViewChange('day')}
            className={`flex-1 md:flex-none px-6 py-2.5 md:py-2 rounded-xl text-sm font-semibold transition-all duration-200 ease-out ${
              view === 'day'
                ? 'bg-white text-gray-900 shadow-sm scale-[1.02]'
                : 'text-gray-500 hover:text-gray-900 hover:scale-105 active:scale-95'
            }`}
          >
            {t('viewMode.day')}
          </button>
          {/* List view - All screens */}
          <button
            onClick={() => onViewChange('list')}
            className={`flex-1 md:flex-none px-6 py-2.5 md:py-2 rounded-xl text-sm font-semibold transition-all duration-200 ease-out ${
              view === 'list'
                ? 'bg-white text-gray-900 shadow-sm scale-[1.02]'
                : 'text-gray-500 hover:text-gray-900 hover:scale-105 active:scale-95'
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
          <div className="absolute inset-0 bg-white/60 backdrop-blur-[2px] z-10 flex items-center justify-center rounded-2xl animate-in fade-in duration-200">
            <div className="flex items-center gap-3 px-6 py-3 bg-white rounded-xl shadow-lg border border-gray-200 animate-in zoom-in-95 fade-in duration-300">
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
