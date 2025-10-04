"use client";

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';

// Dynamically import map component (client-side only, no SSR)
const BusinessMap = dynamic(
  () => import('./components/BusinessMap'),
  {
    ssr: false,
    loading: () => (
      <div className="w-full h-full bg-gray-100 rounded-2xl flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-teal-600 border-t-transparent mx-auto mb-4"></div>
          <p className="text-gray-500">Loading map...</p>
        </div>
      </div>
    )
  }
);

interface BusinessSummary {
  subdomain: string;
  name: string;
  description?: string;
  address: {
    street: string;
    city: string;
    state: string;
    country: string;
  };
  categories: Array<{
    id: string;
    name: string;
    serviceCount: number;
  }>;
  coverImageUrl?: string;
  primaryColor?: string;
  latitude?: number;
  longitude?: number;
}

type ViewMode = 'list' | 'map';

export default function DiscoveryPage() {
  const router = useRouter();
  const [businesses, setBusinesses] = useState<BusinessSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    // Fetch all active businesses
    fetch('/api/businesses/discover')
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          setBusinesses(data.businesses);
        }
      })
      .catch(err => console.error('Failed to load businesses:', err))
      .finally(() => setLoading(false));
  }, []);

  const filteredBusinesses = businesses.filter(business => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      business.name.toLowerCase().includes(query) ||
      business.description?.toLowerCase().includes(query) ||
      business.address.city.toLowerCase().includes(query)
    );
  });

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-teal-600 border-t-transparent mx-auto mb-4"></div>
          <p className="text-gray-500">Loading businesses...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-sm border-b border-gray-200/60">
        <div className="px-12 py-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link href="/" className="w-12 h-12 bg-gradient-to-br from-teal-500 to-green-500 rounded-2xl flex items-center justify-center shadow-sm">
                <span className="text-white font-bold text-xl">R</span>
              </Link>
              <div>
                <h1 className="text-3xl font-bold text-gray-900 tracking-tight">Find a Business</h1>
                <p className="text-sm text-gray-500 mt-1">Discover and book appointments instantly</p>
              </div>
            </div>

            {/* View Toggle */}
            <div className="flex gap-1 bg-gray-100 p-1 rounded-2xl">
              <button
                onClick={() => setViewMode('list')}
                className={`px-6 py-2 rounded-xl text-sm font-semibold transition-all ${
                  viewMode === 'list'
                    ? 'bg-white text-gray-900 shadow-sm'
                    : 'text-gray-500 hover:text-gray-900'
                }`}
              >
                <div className="flex items-center gap-2">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                  </svg>
                  List
                </div>
              </button>
              <button
                onClick={() => setViewMode('map')}
                className={`px-6 py-2 rounded-xl text-sm font-semibold transition-all ${
                  viewMode === 'map'
                    ? 'bg-white text-gray-900 shadow-sm'
                    : 'text-gray-500 hover:text-gray-900'
                }`}
              >
                <div className="flex items-center gap-2">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
                  </svg>
                  Map
                </div>
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Search Bar */}
      <div className="border-b border-gray-200/60 bg-gray-50">
        <div className="px-12 py-6">
          <div className="relative max-w-2xl">
            <div className="absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none">
              <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by business name, service, or location..."
              className="w-full pl-12 pr-4 py-3 bg-white border border-gray-200 rounded-2xl focus:outline-none focus:border-teal-600 focus:ring-2 focus:ring-teal-100 transition-all text-gray-900 placeholder:text-gray-400"
            />
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="px-12 py-8">
        {viewMode === 'map' ? (
          // Map View
          <div className="h-[calc(100vh-240px)] min-h-[500px]">
            <BusinessMap
              businesses={filteredBusinesses}
              onBusinessClick={(subdomain) => router.push(`/book/${subdomain}`)}
            />
          </div>
        ) : (
          // List View
          <div>
            <div className="mb-6">
              <h2 className="text-lg font-semibold text-gray-900">
                {filteredBusinesses.length} {filteredBusinesses.length === 1 ? 'Business' : 'Businesses'} Available
              </h2>
            </div>

            {filteredBusinesses.length === 0 ? (
              <div className="text-center py-12">
                <svg className="w-16 h-16 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                <h3 className="text-xl font-bold text-gray-900 mb-2">No businesses found</h3>
                <p className="text-gray-500">Try adjusting your search or filters</p>
              </div>
            ) : (
              <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {filteredBusinesses.map((business) => (
                  <Link
                    key={business.subdomain}
                    href={`/book/${business.subdomain}`}
                    className="group bg-white border-2 border-gray-200 rounded-2xl overflow-hidden hover:border-teal-600 hover:shadow-xl transition-all"
                  >
                    {/* Cover Image */}
                    {business.coverImageUrl ? (
                      <div className="h-48 overflow-hidden bg-gray-100">
                        <img
                          src={business.coverImageUrl}
                          alt={business.name}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                      </div>
                    ) : (
                      <div
                        className="h-48 flex items-center justify-center"
                        style={{
                          background: business.primaryColor
                            ? `linear-gradient(135deg, ${business.primaryColor}, ${business.primaryColor}dd)`
                            : 'linear-gradient(135deg, #0d9488, #14b8a6)'
                        }}
                      >
                        <span className="text-white text-5xl font-bold">
                          {business.name.charAt(0).toUpperCase()}
                        </span>
                      </div>
                    )}

                    {/* Content */}
                    <div className="p-6">
                      <h3 className="text-xl font-bold text-gray-900 mb-2 tracking-tight group-hover:text-teal-600 transition-colors">
                        {business.name}
                      </h3>

                      {business.description && (
                        <p className="text-sm text-gray-500 mb-4 line-clamp-2">
                          {business.description}
                        </p>
                      )}

                      {/* Location */}
                      <div className="flex items-start gap-2 text-sm text-gray-600 mb-4">
                        <svg className="w-4 h-4 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                        <span className="line-clamp-1">
                          {business.address.city}, {business.address.state}
                        </span>
                      </div>

                      {/* Categories */}
                      {business.categories.length > 0 && (
                        <div className="flex flex-wrap gap-2 mb-4">
                          {business.categories.slice(0, 3).map((category) => (
                            <span
                              key={category.id}
                              className="px-3 py-1 bg-gray-100 text-gray-700 text-xs font-semibold rounded-lg"
                            >
                              {category.name}
                            </span>
                          ))}
                          {business.categories.length > 3 && (
                            <span className="px-3 py-1 bg-gray-100 text-gray-500 text-xs font-semibold rounded-lg">
                              +{business.categories.length - 3} more
                            </span>
                          )}
                        </div>
                      )}

                      {/* CTA */}
                      <div className="flex items-center justify-between pt-4 border-t border-gray-100">
                        <span className="text-sm font-semibold text-teal-600 group-hover:text-teal-700">
                          View & Book
                        </span>
                        <svg className="w-5 h-5 text-teal-600 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                        </svg>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
