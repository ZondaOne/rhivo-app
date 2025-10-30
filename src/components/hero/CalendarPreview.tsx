'use client';

import { useState, useEffect } from 'react';
import { useTranslations, useLocale } from 'next-intl';

export function CalendarPreview() {
  const [mounted, setMounted] = useState(false);
  const [selectedDate, setSelectedDate] = useState(15);

  useEffect(() => {
    setMounted(true);
  }, []);

  // i18n: month and day labels (use dashboard calendar translations)
  const t = useTranslations('dashboard.calendar.dayLabels');
  const locale = useLocale() as string;

  // Small mapping from next-intl locale (e.g. 'en', 'it') to JS locale for toLocaleDateString
  const localeMap: Record<string, string> = {
    en: 'en-US',
    it: 'it-IT',
    es: 'es-ES',
    fr: 'fr-FR',
    de: 'de-DE',
  };
  const jsLocale = localeMap[locale] || locale || 'en-US';

  // Mock calendar data for current month (localized)
  const currentMonth = new Date().toLocaleDateString(jsLocale, { month: 'long', year: 'numeric' });

  const daysOfWeek = [
    'monday',
    'tuesday',
    'wednesday',
    'thursday',
    'friday',
    'saturday',
    'sunday',
  ].map((d) => t(d));

  // Generate mock calendar days (5 weeks)
  const calendarDays = Array.from({ length: 35 }, (_, i) => {
    const day = i - 0; // Adjust starting position
    if (day < 1 || day > 31) return null;
    return day;
  });

  // Mock appointments on specific days with counts
  const appointmentCounts: Record<number, number> = {
    8: 2,
    12: 3,
    15: 5,
    18: 1,
    22: 4,
    25: 2,
    28: 3,
  };

  return (
    <div className={`bg-white rounded-2xl shadow-lg shadow-gray-200/50 border border-gray-200/60 overflow-hidden transition-all duration-700 ${
      mounted ? 'opacity-100 scale-100' : 'opacity-0 scale-95'
    }`}>
      {/* Calendar Header - Matches Dashboard Calendar */}
      <div className="px-4 sm:px-6 py-4 border-b border-gray-200/60">
        <div className="flex items-center justify-between">
          <h3 className="text-base sm:text-lg font-semibold text-gray-900">{currentMonth}</h3>
          <div className="flex gap-1">
            <button className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors">
              <svg className="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <button className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors">
              <svg className="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </div>
        </div>
      </div>

      {/* Days of week - Matches Dashboard Calendar */}
      <div className="grid grid-cols-7 border-b border-gray-200/60">
        {daysOfWeek.map((day) => (
          <div key={day} className="py-2 sm:py-3 text-center border-r border-gray-200/60 last:border-r-0">
            <span className="text-[9px] sm:text-[10px] font-semibold uppercase tracking-wider text-gray-500">
              {day}
            </span>
          </div>
        ))}
      </div>

      {/* Calendar Grid - Matches Dashboard Calendar */}
      <div className="grid grid-cols-7" style={{ gridTemplateRows: 'repeat(5, 1fr)' }}>
        {calendarDays.map((day, index) => {
          if (!day) {
            return (
              <div
                key={index}
                className="border-r border-b border-gray-200/60 last:border-r-0 bg-gray-50/30 min-h-[60px] sm:min-h-[80px]"
              />
            );
          }

          const appointmentCount = appointmentCounts[day] || 0;
          const isToday = day === new Date().getDate();
          const isWeekend = index % 7 >= 5;

          return (
            <div
              key={index}
              onClick={() => setSelectedDate(day)}
              className={`
                relative border-r border-b border-gray-200/60 last:border-r-0
                min-h-[60px] sm:min-h-[80px] p-1 sm:p-2
                transition-all duration-200 cursor-pointer
                ${isWeekend ? 'bg-gray-50/50' : 'bg-white'}
                ${isToday ? 'bg-teal-50/30' : ''}
                hover:bg-teal-50/50
              `}
            >
              {/* Day number */}
              <div className={`
                text-xs sm:text-sm font-semibold
                ${isToday
                  ? 'text-teal-700'
                  : 'text-gray-700'
                }
              `}>
                {day}
              </div>

              {/* Appointment count indicator */}
              {appointmentCount > 0 && (
                <div className="mt-1 space-y-0.5">
                  {Array.from({ length: Math.min(appointmentCount, 3) }).map((_, i) => (
                    <div
                      key={i}
                      className="h-1 rounded-full bg-gradient-to-r from-teal-600 to-teal-500"
                      style={{ width: `${60 + i * 15}%` }}
                    />
                  ))}
                  {appointmentCount > 3 && (
                    <div className="text-[8px] sm:text-[9px] text-teal-600 font-semibold">
                      +{appointmentCount - 3}
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
