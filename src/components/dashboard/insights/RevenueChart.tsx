'use client';

import { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { Line, XAxis, YAxis, CartesianGrid, ResponsiveContainer, Area, AreaChart } from 'recharts';
import { getAccessToken } from '@/lib/auth/api-client';

interface RevenueChartProps {
  businessId: string | null;
  timeRange: '7d' | '30d' | '90d';
}

interface RevenueData {
  date: string;
  revenue: number;
  count: number;
}

interface ChartData {
  date: string;
  revenue: number;
  count: number;
  formattedDate: string;
}

export function RevenueChart({ businessId, timeRange }: RevenueChartProps) {
  const t = useTranslations('dashboard.insights.revenue');
  const [data, setData] = useState<RevenueData[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalRevenue: 0,
    totalBookings: 0,
    averageBookingValue: 0
  });

  useEffect(() => {
    async function fetchData() {
      if (!businessId) {
        setLoading(false);
        return;
      }

      setLoading(true);
      try {
        const token = getAccessToken();
        const headers: HeadersInit = {};
        if (token) {
          headers['Authorization'] = `Bearer ${token}`;
        }

        const response = await fetch(`/api/insights/revenue?businessId=${businessId}&timeRange=${timeRange}`, {
          headers
        });
        if (response.ok) {
          const result = await response.json();
          setData(result.chartData || []);
          setStats(result.stats || { totalRevenue: 0, totalBookings: 0, averageBookingValue: 0 });
        } else {
          console.error('Failed to fetch revenue data:', response.status, response.statusText);
        }
      } catch (error) {
        console.error('Failed to fetch revenue data:', error);
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

  // Format currency
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat(undefined, {
      style: 'currency',
      currency: 'EUR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(value);
  };

  return (
    <div className="bg-white border border-gray-200/60 rounded-2xl p-4 md:p-5 lg:p-8 shadow-sm transition-all hover:shadow-md">
      {/* Header */}
      <div className="mb-4 md:mb-5 lg:mb-8">
        <h3 className="text-lg md:text-xl lg:text-2xl font-bold text-gray-900 tracking-tight">{t('title')}</h3>
        <p className="text-xs md:text-sm text-gray-500 mt-1">{t('subtitle')}</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 md:gap-2.5 lg:gap-3 mb-4 md:mb-5 lg:mb-8">
        <div className="bg-gradient-to-br from-teal-50 to-teal-100/50 rounded-lg md:rounded-xl p-3 md:p-3.5 lg:p-4 border border-teal-200/50">
          <p className="text-[10px] sm:text-xs text-teal-700 font-semibold uppercase tracking-wide mb-0.5 md:mb-1">{t('stats.total')}</p>
          <p className="text-xl md:text-2xl lg:text-3xl font-bold text-teal-600 tracking-tight">{formatCurrency(stats.totalRevenue)}</p>
        </div>
        <div className="bg-gradient-to-br from-green-50 to-green-100/50 rounded-lg md:rounded-xl p-3 md:p-3.5 lg:p-4 border border-green-200/50">
          <p className="text-[10px] sm:text-xs text-green-700 font-semibold uppercase tracking-wide mb-0.5 md:mb-1">{t('stats.bookings')}</p>
          <p className="text-xl md:text-2xl lg:text-3xl font-bold text-green-600 tracking-tight">{stats.totalBookings}</p>
        </div>
        <div className="bg-gray-50/80 rounded-lg md:rounded-xl p-3 md:p-3.5 lg:p-4 border border-gray-100">
          <p className="text-[10px] sm:text-xs text-gray-500 font-semibold uppercase tracking-wide mb-0.5 md:mb-1">{t('stats.average')}</p>
          <p className="text-xl md:text-2xl lg:text-3xl font-bold text-gray-900 tracking-tight">{formatCurrency(stats.averageBookingValue)}</p>
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
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v12m-3-2.818l.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
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
              margin={{ top: 10, right: 5, left: -5, bottom: 5 }}
            >
              <defs>
                <linearGradient id="revenueLineGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#14b8a6" />
                  <stop offset="100%" stopColor="#10b981" />
                </linearGradient>
                <linearGradient id="revenueAreaGradient" x1="0" y1="0" x2="0" y2="1">
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
                tick={{ fill: '#9ca3af', fontSize: 9, fontWeight: 500 }}
                tickLine={false}
                axisLine={{ stroke: '#f3f4f6', strokeWidth: 1 }}
                allowDecimals={false}
                width={45}
                tickFormatter={(value) => `€${value}`}
              />

              <Area
                type="monotone"
                dataKey="revenue"
                stroke="none"
                fill="url(#revenueAreaGradient)"
                fillOpacity={1}
                isAnimationActive={true}
              />

              <Line
                type="monotone"
                dataKey="revenue"
                stroke="url(#revenueLineGradient)"
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
