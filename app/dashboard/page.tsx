'use client';

import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Calendar } from '@/components/dashboard/Calendar';
import { AppointmentList } from '@/components/dashboard/AppointmentList';
import { CalendarView } from '@/lib/calendar-utils';

export default function DashboardPage() {
  const [view, setView] = useState<CalendarView>('month');
  const [currentDate, setCurrentDate] = useState(new Date());
  const { isAuthenticated, user, logout } = useAuth();

  return (
    <div className="min-h-screen bg-gradient-to-br from-teal-50 to-green-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h1 className="text-4xl font-semibold text-gray-900 mb-2">
                Dashboard
              </h1>
              <p className="text-lg text-gray-600">
                Manage your appointments and availability
              </p>
            </div>
            <div className="bg-white rounded-xl shadow-sm px-4 py-3">
              {isAuthenticated ? (
                <div className="flex items-center gap-3">
                  <div className="text-sm text-gray-700">
                    Signed in as <span className="font-medium">{user?.email}</span>
                    {user?.role && <span className="ml-1">({user.role})</span>}
                  </div>
                  <a href="/debug/api" className="text-sm text-teal-700 underline">API Debug</a>
                  <button onClick={logout} className="px-3 py-1.5 text-sm bg-gray-100 rounded-lg hover:bg-gray-200">Sign out</button>
                </div>
              ) : (
                <div className="flex items-center gap-3 text-sm">
                  <span className="text-gray-700">Not signed in</span>
                  <a className="text-teal-700 underline" href="/auth/login">Sign in</a>
                  <a className="text-teal-700 underline" href="/auth/signup">Create account</a>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* View Selector */}
        <div className="bg-white rounded-2xl shadow-sm p-4 mb-6">
          <div className="flex items-center justify-between">
            <div className="flex gap-2">
              <button
                onClick={() => setView('month')}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                  view === 'month'
                    ? 'bg-teal-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                Month
              </button>
              <button
                onClick={() => setView('week')}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                  view === 'week'
                    ? 'bg-teal-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                Week
              </button>
              <button
                onClick={() => setView('day')}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                  view === 'day'
                    ? 'bg-teal-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                Day
              </button>
              <button
                onClick={() => setView('list')}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                  view === 'list'
                    ? 'bg-teal-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                List
              </button>
            </div>

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
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>

              <button
                onClick={() => setCurrentDate(new Date())}
                className="px-4 py-2 text-sm font-medium text-teal-600 hover:bg-teal-50 rounded-lg transition-colors"
              >
                Today
              </button>

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
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>
            </div>
          </div>
        </div>

        {/* Main Content */}
        {view === 'list' ? (
          <AppointmentList currentDate={currentDate} />
        ) : (
          <Calendar view={view} currentDate={currentDate} />
        )}
      </div>
    </div>
  );
}