'use client';

import { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { Line, XAxis, YAxis, CartesianGrid, ResponsiveContainer, Area, AreaChart } from 'recharts';

interface BookingsChartProps {
  businessId: string | null;
  timeRange: '7d' | '30d' | '90d';
}

interface BookingData {
  date: string;
  count: number;
}

interface ChartData {
  date: string;
  count: number;
  formattedDate: string;
}

export function BookingsChart({ businessId, timeRange }: BookingsChartProps) {
  const t = useTranslations('dashboard.insights.bookings');
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

  // Transform data for chart with formatted dates
  const chartData: ChartData[] = data.map((item) => ({
    ...item,
    formattedDate: new Date(item.date).toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
      year: data.length > 60 ? 'numeric' : undefined
    })
  }));

  // Debug: log data
  if (chartData.length > 0) {
    console.log('Chart data:', chartData.slice(0, 3), 'Total points:', chartData.length);
  }

  return (
    <div className="bg-white border border-gray-200/60 rounded-2xl p-4 md:p-5 lg:p-8 shadow-sm transition-all hover:shadow-md">
      {/* Header */}
      <div className="mb-4 md:mb-5 lg:mb-8">
        <h3 className="text-lg md:text-xl lg:text-2xl font-bold text-gray-900 tracking-tight">{t('title')}</h3>
        <p className="text-xs md:text-sm text-gray-500 mt-1">{t('subtitle')}</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 md:gap-2.5 lg:gap-3 mb-4 md:mb-5 lg:mb-8">
        <div className="bg-gray-50/80 rounded-lg md:rounded-xl p-3 md:p-3.5 lg:p-4 border border-gray-100">
          <p className="text-[10px] sm:text-xs text-gray-500 font-semibold uppercase tracking-wide mb-0.5 md:mb-1">{t('stats.total')}</p>
          <p className="text-xl md:text-2xl lg:text-3xl font-bold text-gray-900 tracking-tight">{stats.total}</p>
        </div>
        <div className="bg-gradient-to-br from-green-50 to-green-100/50 rounded-lg md:rounded-xl p-3 md:p-3.5 lg:p-4 border border-green-200/50">
          <p className="text-[10px] sm:text-xs text-green-700 font-semibold uppercase tracking-wide mb-0.5 md:mb-1">{t('stats.completed')}</p>
          <p className="text-xl md:text-2xl lg:text-3xl font-bold text-green-600 tracking-tight">{stats.completed}</p>
        </div>
        <div className="bg-gradient-to-br from-teal-50 to-teal-100/50 rounded-lg md:rounded-xl p-3 md:p-3.5 lg:p-4 border border-teal-200/50">
          <p className="text-[10px] sm:text-xs text-teal-700 font-semibold uppercase tracking-wide mb-0.5 md:mb-1">{t('stats.upcoming')}</p>
          <p className="text-xl md:text-2xl lg:text-3xl font-bold text-teal-600 tracking-tight">{stats.upcoming}</p>
        </div>
        <div className="bg-gray-100/80 rounded-lg md:rounded-xl p-3 md:p-3.5 lg:p-4 border border-gray-200">
          <p className="text-[10px] sm:text-xs text-gray-600 font-semibold uppercase tracking-wide mb-0.5 md:mb-1">{t('stats.cancelled')}</p>
          <p className="text-xl md:text-2xl lg:text-3xl font-bold text-gray-700 tracking-tight">{stats.cancelled}</p>
        </div>
      </div>

      {/* Chart */}
      {loading ? (
        <div className="h-48 md:h-56 lg:h-80 flex items-center justify-center bg-gray-50/50 rounded-xl md:rounded-2xl border border-gray-100">
          <div className="flex items-center gap-2 md:gap-3">
            <div className="w-4 h-4 md:w-5 md:h-5 border-2 border-teal-500 border-t-transparent rounded-full animate-spin" />
            <span className="text-xs md:text-sm text-gray-500 font-medium">{t('loading')}</span>
          </div>
        </div>
      ) : data.length === 0 ? (
        <div className="h-48 md:h-56 lg:h-80 flex flex-col items-center justify-center bg-gray-50/50 rounded-xl md:rounded-2xl border border-gray-100">
          <div className="w-16 h-16 md:w-18 md:h-18 lg:w-20 lg:h-20 bg-gray-200/50 rounded-xl md:rounded-2xl flex items-center justify-center mb-3 md:mb-4">
            <svg className="w-8 h-8 md:w-9 md:h-9 lg:w-10 lg:h-10 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" />
            </svg>
          </div>
          <p className="text-gray-700 text-xs md:text-sm font-semibold">{t('noData')}</p>
          <p className="text-gray-400 text-[10px] md:text-xs mt-1">{t('noDataSubtext')}</p>
        </div>
      ) : (
        <div className="w-full mt-2 md:mt-3 lg:mt-4 h-48 md:h-56 lg:h-80">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart
              data={chartData}
              margin={{ top: 10, right: 5, left: -10, bottom: 5 }}
            >
              <defs>
                <linearGradient id="bookingsLineGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#14b8a6" />
                  <stop offset="100%" stopColor="#10b981" />
                </linearGradient>
                <linearGradient id="bookingsAreaGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#14b8a6" stopOpacity={0.2} />
                  <stop offset="100%" stopColor="#10b981" stopOpacity={0.05} />
                </linearGradient>
              </defs>

              <CartesianGrid
                strokeDasharray="0"
                stroke="#f3f4f6"
                strokeOpacity={1}
                vertical={false}
              />

              <XAxis
                dataKey="formattedDate"
                stroke="transparent"
                tick={{ fill: '#9ca3af', fontSize: 10, fontWeight: 500 }}
                tickLine={false}
                axisLine={{ stroke: '#f3f4f6', strokeWidth: 1 }}
                height={40}
                angle={-45}
                textAnchor="end"
                interval="preserveStartEnd"
              />

              <YAxis
                stroke="transparent"
                tick={{ fill: '#9ca3af', fontSize: 10, fontWeight: 500 }}
                tickLine={false}
                axisLine={{ stroke: '#f3f4f6', strokeWidth: 1 }}
                allowDecimals={false}
                width={30}
              />


              <Area
                type="monotone"
                dataKey="count"
                stroke="none"
                fill="url(#bookingsAreaGradient)"
                fillOpacity={1}
                isAnimationActive={true}
              />

              <Line
                type="monotone"
                dataKey="count"
                stroke="url(#bookingsLineGradient)"
                strokeWidth={2.5}
                dot={false}
                activeDot={false}
                isAnimationActive={true}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}
