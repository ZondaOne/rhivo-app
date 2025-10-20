'use client';

import { useState, useEffect } from 'react';

interface BookingsChartProps {
  businessId: string | null;
  timeRange: '7d' | '30d' | '90d';
}

interface BookingData {
  date: string;
  count: number;
}

export function BookingsChart({ businessId, timeRange }: BookingsChartProps) {
  const [data, setData] = useState<BookingData[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    total: 0,
    completed: 0,
    cancelled: 0,
    upcoming: 0
  });

  useEffect(() => {
    async function fetchData() {
      if (!businessId) {
        setLoading(false);
        return;
      }

      setLoading(true);
      try {
        const response = await fetch(`/api/insights/bookings?businessId=${businessId}&timeRange=${timeRange}`);
        if (response.ok) {
          const result = await response.json();
          setData(result.chartData || []);
          setStats(result.stats || { total: 0, completed: 0, cancelled: 0, upcoming: 0 });
        }
      } catch (error) {
        console.error('Failed to fetch bookings data:', error);
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, [businessId, timeRange]);

  const maxValue = Math.max(...data.map(d => d.count), 1);

  return (
    <div className="bg-white border border-gray-200 rounded-2xl p-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-xl font-bold text-gray-900">Bookings</h3>
          <p className="text-sm text-gray-500 mt-1">Appointment trends over time</p>
        </div>
        <div className="w-12 h-12 bg-gray-50 rounded-xl flex items-center justify-center">
          <svg className="w-6 h-6 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" />
          </svg>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-4 gap-4 mb-8">
        <div className="bg-gray-50 rounded-xl p-4">
          <p className="text-sm text-gray-500">Total</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">{stats.total}</p>
        </div>
        <div className="bg-green-50 rounded-xl p-4">
          <p className="text-sm text-green-600">Completed</p>
          <p className="text-2xl font-bold text-green-600 mt-1">{stats.completed}</p>
        </div>
        <div className="bg-teal-50 rounded-xl p-4">
          <p className="text-sm text-teal-600">Upcoming</p>
          <p className="text-2xl font-bold text-teal-600 mt-1">{stats.upcoming}</p>
        </div>
        <div className="bg-gray-100 rounded-xl p-4">
          <p className="text-sm text-gray-600">Cancelled</p>
          <p className="text-2xl font-bold text-gray-600 mt-1">{stats.cancelled}</p>
        </div>
      </div>

      {/* Chart */}
      {loading ? (
        <div className="h-64 flex items-center justify-center">
          <div className="flex items-center gap-3">
            <div className="w-5 h-5 border-2 border-teal-500 border-t-transparent rounded-full animate-spin" />
            <span className="text-sm text-gray-500">Loading data...</span>
          </div>
        </div>
      ) : data.length === 0 ? (
        <div className="h-64 flex flex-col items-center justify-center">
          <svg className="w-16 h-16 text-gray-300 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" />
          </svg>
          <p className="text-gray-500 text-sm">No booking data available</p>
          <p className="text-gray-400 text-xs mt-1">Data will appear once you have appointments</p>
        </div>
      ) : (
        <div className="relative h-64">
          {/* Y-axis labels */}
          <div className="absolute left-0 top-0 bottom-8 w-8 flex flex-col justify-between text-xs text-gray-500">
            <span>{maxValue}</span>
            <span>{Math.round(maxValue * 0.75)}</span>
            <span>{Math.round(maxValue * 0.5)}</span>
            <span>{Math.round(maxValue * 0.25)}</span>
            <span>0</span>
          </div>

          {/* Chart area */}
          <div className="absolute left-12 right-0 top-0 bottom-8 flex items-end justify-between gap-1">
            {data.map((item, index) => {
              const height = maxValue > 0 ? (item.count / maxValue) * 100 : 0;
              return (
                <div key={index} className="flex-1 flex flex-col items-center group">
                  {/* Bar */}
                  <div className="relative w-full flex items-end justify-center">
                    <div
                      className="w-full bg-gradient-to-t from-teal-600 to-green-500 rounded-t-lg transition-all duration-300 hover:from-teal-700 hover:to-green-600 cursor-pointer"
                      style={{ height: `${Math.max(height, 2)}%` }}
                    >
                      {/* Tooltip */}
                      <div className="absolute -top-12 left-1/2 -translate-x-1/2 px-3 py-1.5 bg-gray-900 text-white text-xs rounded-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all whitespace-nowrap pointer-events-none">
                        {item.count} {item.count === 1 ? 'booking' : 'bookings'}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* X-axis labels */}
          <div className="absolute left-12 right-0 bottom-0 h-8 flex items-end justify-between text-xs text-gray-500">
            {data.map((item, index) => {
              // Show every nth label based on data length
              const showLabel = data.length <= 14 || index % Math.ceil(data.length / 7) === 0;
              return (
                <div key={index} className="flex-1 text-center">
                  {showLabel && (
                    <span className="inline-block transform -rotate-45 origin-top-left whitespace-nowrap">
                      {new Date(item.date).toLocaleDateString(undefined, { 
                        month: 'short', 
                        day: 'numeric' 
                      })}
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
