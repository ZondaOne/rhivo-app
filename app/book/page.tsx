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
  profileImageUrl?: string;
  primaryColor?: string;
  latitude?: number;
  longitude?: number;
  priceRange: {
    min: number;
    max: number;
  };
}

type ViewMode = 'list' | 'map';

export default function DiscoveryPage() {
  const router = useRouter();
  const [businesses, setBusinesses] = useState<BusinessSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [searchQuery, setSearchQuery] = useState('');
  const [showFilters, setShowFilters] = useState(false);

  // Filter states
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [selectedCities, setSelectedCities] = useState<string[]>([]);
  const [minPrice, setMinPrice] = useState<number>(0);
  const [maxPrice, setMaxPrice] = useState<number>(500);

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

  // Extract unique categories and cities
  const allCategories = Array.from(
    new Set(businesses.flatMap(b => b.categories.map(c => c.name)))
  ).sort();

  const allCities = Array.from(
    new Set(businesses.map(b => b.address.city))
  ).sort();

  const filteredBusinesses = businesses.filter(business => {
    // Search query filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      const matchesSearch =
        business.name.toLowerCase().includes(query) ||
        business.description?.toLowerCase().includes(query) ||
        business.address.city.toLowerCase().includes(query);
      if (!matchesSearch) return false;
    }

    // Category filter
    if (selectedCategories.length > 0) {
      const hasMatchingCategory = business.categories.some(cat =>
        selectedCategories.includes(cat.name)
      );
      if (!hasMatchingCategory) return false;
    }

    // City filter
    if (selectedCities.length > 0) {
      if (!selectedCities.includes(business.address.city)) return false;
    }

    // Price range filter
    if (minPrice > 0 || maxPrice < 500) {
      // Check if business has any services in the selected price range
      const businessMinPrice = business.priceRange.min;
      const businessMaxPrice = business.priceRange.max;

      // Filter out businesses whose entire price range is outside the selected range
      // Business is included if there's any overlap between ranges
      if (businessMaxPrice < minPrice || businessMinPrice > maxPrice) {
        return false;
      }
    }

    return true;
  });

  const toggleCategory = (category: string) => {
    setSelectedCategories(prev =>
      prev.includes(category)
        ? prev.filter(c => c !== category)
        : [...prev, category]
    );
  };

  const toggleCity = (city: string) => {
    setSelectedCities(prev =>
      prev.includes(city)
        ? prev.filter(c => c !== city)
        : [...prev, city]
    );
  };

  const clearAllFilters = () => {
    setSelectedCategories([]);
    setSelectedCities([]);
    setMinPrice(0);
    setMaxPrice(500);
    setSearchQuery('');
  };

  const activeFiltersCount =
    selectedCategories.length +
    selectedCities.length +
    (minPrice > 0 || maxPrice < 500 ? 1 : 0);

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
        <div className="px-4 sm:px-6 lg:px-12 py-4 lg:py-5">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3 lg:gap-4">
              <Link href="/" className="w-10 h-10 lg:w-12 lg:h-12 bg-gradient-to-br from-teal-500 to-green-500 rounded-xl lg:rounded-2xl flex items-center justify-center shadow-sm">
                <span className="text-white font-bold text-lg lg:text-xl">R</span>
              </Link>
              <div>
                <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-900 tracking-tight">Find a Business</h1>
                <p className="text-xs sm:text-sm text-gray-500 mt-0.5 lg:mt-1">Discover and book appointments instantly</p>
              </div>
            </div>

            {/* View Toggle */}
            <div className="flex gap-1 bg-gray-100 p-1 rounded-xl lg:rounded-2xl w-full sm:w-auto">
              <button
                onClick={() => setViewMode('list')}
                className={`flex-1 sm:flex-none px-4 sm:px-6 py-2 rounded-lg lg:rounded-xl text-xs sm:text-sm font-semibold transition-all ${
                  viewMode === 'list'
                    ? 'bg-white text-gray-900 shadow-sm'
                    : 'text-gray-500 hover:text-gray-900'
                }`}
              >
                <div className="flex items-center justify-center gap-2">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                  </svg>
                  <span className="hidden sm:inline">List</span>
                </div>
              </button>
              <button
                onClick={() => setViewMode('map')}
                className={`flex-1 sm:flex-none px-4 sm:px-6 py-2 rounded-lg lg:rounded-xl text-xs sm:text-sm font-semibold transition-all ${
                  viewMode === 'map'
                    ? 'bg-white text-gray-900 shadow-sm'
                    : 'text-gray-500 hover:text-gray-900'
                }`}
              >
                <div className="flex items-center justify-center gap-2">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
                  </svg>
                  <span className="hidden sm:inline">Map</span>
                </div>
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Search Bar & Filters */}
      <div className="border-b border-gray-200/60 bg-gray-50">
        <div className="px-4 sm:px-6 lg:px-12 py-4 lg:py-6">
          <div className="flex gap-3 items-start">
            {/* Search Input */}
            <div className="relative flex-1 max-w-2xl">
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
                className="w-full pl-12 pr-4 py-2.5 lg:py-3 bg-white border border-gray-200 rounded-xl lg:rounded-2xl focus:outline-none focus:border-teal-600 focus:ring-2 focus:ring-teal-100 transition-all text-sm lg:text-base text-gray-900 placeholder:text-gray-400"
              />
            </div>

            {/* Filter Button */}
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`relative px-4 lg:px-6 py-2.5 lg:py-3 rounded-xl lg:rounded-2xl font-semibold text-sm lg:text-base transition-all flex items-center gap-2 ${
                showFilters || activeFiltersCount > 0
                  ? 'bg-teal-600 text-white shadow-lg'
                  : 'bg-white text-gray-700 border border-gray-200 hover:border-teal-600'
              }`}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
              </svg>
              <span className="hidden sm:inline">Filters</span>
              {activeFiltersCount > 0 && (
                <span className="absolute -top-1 -right-1 w-5 h-5 bg-orange-500 text-white text-xs font-bold rounded-full flex items-center justify-center">
                  {activeFiltersCount}
                </span>
              )}
            </button>
          </div>

          {/* Filter Panel */}
          {showFilters && (
            <div className="mt-4 bg-white rounded-xl lg:rounded-2xl border border-gray-200 p-4 lg:p-6 shadow-lg">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold text-gray-900">Filters</h3>
                {activeFiltersCount > 0 && (
                  <button
                    onClick={clearAllFilters}
                    className="text-sm font-semibold text-teal-600 hover:text-teal-700"
                  >
                    Clear all
                  </button>
                )}
              </div>

              <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                {/* Categories Filter */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-3">
                    Categories
                  </label>
                  <div className="space-y-2 max-h-48 overflow-y-auto">
                    {allCategories.map(category => (
                      <label
                        key={category}
                        className="flex items-center gap-2 cursor-pointer hover:bg-gray-50 p-2 rounded-lg transition-colors"
                      >
                        <input
                          type="checkbox"
                          checked={selectedCategories.includes(category)}
                          onChange={() => toggleCategory(category)}
                          className="w-4 h-4 text-teal-600 border-gray-300 rounded focus:ring-2 focus:ring-teal-500"
                        />
                        <span className="text-sm text-gray-700">{category}</span>
                      </label>
                    ))}
                    {allCategories.length === 0 && (
                      <p className="text-sm text-gray-400">No categories available</p>
                    )}
                  </div>
                </div>

                {/* Cities Filter */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-3">
                    Location
                  </label>
                  <div className="space-y-2 max-h-48 overflow-y-auto">
                    {allCities.map(city => (
                      <label
                        key={city}
                        className="flex items-center gap-2 cursor-pointer hover:bg-gray-50 p-2 rounded-lg transition-colors"
                      >
                        <input
                          type="checkbox"
                          checked={selectedCities.includes(city)}
                          onChange={() => toggleCity(city)}
                          className="w-4 h-4 text-teal-600 border-gray-300 rounded focus:ring-2 focus:ring-teal-500"
                        />
                        <span className="text-sm text-gray-700">{city}</span>
                      </label>
                    ))}
                    {allCities.length === 0 && (
                      <p className="text-sm text-gray-400">No cities available</p>
                    )}
                  </div>
                </div>

                {/* Price Range Filter */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-3">
                    Price Range
                  </label>
                  <div className="space-y-4">
                    {/* Price display */}
                    <div className="flex items-center justify-between text-sm font-semibold text-gray-900">
                      <span>${minPrice}</span>
                      <span className="text-gray-500">-</span>
                      <span>${maxPrice}</span>
                    </div>

                    {/* Min Price Slider */}
                    <div className="space-y-2">
                      <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                        Minimum
                      </label>
                      <input
                        type="range"
                        min="0"
                        max="500"
                        step="10"
                        value={minPrice}
                        onChange={(e) => {
                          const value = parseInt(e.target.value);
                          if (value <= maxPrice) {
                            setMinPrice(value);
                          }
                        }}
                        className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer slider-thumb"
                      />
                    </div>

                    {/* Max Price Slider */}
                    <div className="space-y-2">
                      <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                        Maximum
                      </label>
                      <input
                        type="range"
                        min="0"
                        max="500"
                        step="10"
                        value={maxPrice}
                        onChange={(e) => {
                          const value = parseInt(e.target.value);
                          if (value >= minPrice) {
                            setMaxPrice(value);
                          }
                        }}
                        className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer slider-thumb"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Active Filters Summary */}
              {activeFiltersCount > 0 && (
                <div className="mt-4 pt-4 border-t border-gray-200">
                  <div className="flex flex-wrap gap-2">
                    {selectedCategories.map(cat => (
                      <span
                        key={cat}
                        className="inline-flex items-center gap-1 px-3 py-1 bg-teal-50 text-teal-700 text-sm font-medium rounded-lg"
                      >
                        {cat}
                        <button
                          onClick={() => toggleCategory(cat)}
                          className="hover:bg-teal-100 rounded-full p-0.5"
                        >
                          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      </span>
                    ))}
                    {selectedCities.map(city => (
                      <span
                        key={city}
                        className="inline-flex items-center gap-1 px-3 py-1 bg-blue-50 text-blue-700 text-sm font-medium rounded-lg"
                      >
                        {city}
                        <button
                          onClick={() => toggleCity(city)}
                          className="hover:bg-blue-100 rounded-full p-0.5"
                        >
                          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      </span>
                    ))}
                    {(minPrice > 0 || maxPrice < 500) && (
                      <span
                        className="inline-flex items-center gap-1 px-3 py-1 bg-purple-50 text-purple-700 text-sm font-medium rounded-lg"
                      >
                        ${minPrice} - ${maxPrice}
                        <button
                          onClick={() => {
                            setMinPrice(0);
                            setMaxPrice(500);
                          }}
                          className="hover:bg-purple-100 rounded-full p-0.5"
                        >
                          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      </span>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Main Content */}
      <div className="px-4 sm:px-6 lg:px-12 py-6 lg:py-8">
        {viewMode === 'map' ? (
          // Map View
          <div className="h-[calc(100vh-280px)] sm:h-[calc(100vh-260px)] lg:h-[calc(100vh-240px)] min-h-[400px] sm:min-h-[500px]">
            <BusinessMap
              businesses={filteredBusinesses}
              onBusinessClick={(subdomain) => router.push(`/book/${subdomain}`)}
            />
          </div>
        ) : (
          // List View
          <div>
            <div className="mb-4 lg:mb-6">
              <h2 className="text-base lg:text-lg font-semibold text-gray-900">
                {filteredBusinesses.length} {filteredBusinesses.length === 1 ? 'Business' : 'Businesses'} Available
              </h2>
            </div>

            {filteredBusinesses.length === 0 ? (
              <div className="text-center py-12 lg:py-16">
                <svg className="w-12 h-12 lg:w-16 lg:h-16 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                <h3 className="text-lg lg:text-xl font-bold text-gray-900 mb-2">No businesses found</h3>
                <p className="text-sm lg:text-base text-gray-500">Try adjusting your search or filters</p>
              </div>
            ) : (
              <div className="grid gap-4 sm:gap-5 lg:gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
                {filteredBusinesses.map((business) => (
                  <Link
                    key={business.subdomain}
                    href={`/book/${business.subdomain}`}
                    className="group bg-white border-2 border-gray-200 rounded-xl lg:rounded-2xl overflow-hidden hover:border-teal-600 hover:shadow-xl transition-all"
                  >
                    {/* Cover Image with Profile Picture Overlay */}
                    <div className="relative">
                      {business.coverImageUrl ? (
                        <div className="h-40 sm:h-44 lg:h-48 overflow-hidden bg-gray-100">
                          <img
                            src={business.coverImageUrl}
                            alt={business.name}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                          />
                        </div>
                      ) : (
                        <div
                          className="h-40 sm:h-44 lg:h-48 flex items-center justify-center"
                          style={{
                            background: business.primaryColor
                              ? `linear-gradient(135deg, ${business.primaryColor}, ${business.primaryColor}dd)`
                              : 'linear-gradient(135deg, #0d9488, #14b8a6)'
                          }}
                        >
                          <span className="text-white text-4xl lg:text-5xl font-bold">
                            {business.name.charAt(0).toUpperCase()}
                          </span>
                        </div>
                      )}

                      {/* Profile Picture Avatar */}
                      {business.profileImageUrl && (
                        <div className="absolute -bottom-8 left-4 sm:left-5 lg:left-6">
                          <div className="relative">
                            <img
                              src={business.profileImageUrl}
                              alt={`${business.name} profile`}
                              className="w-16 h-16 sm:w-18 sm:h-18 lg:w-20 lg:h-20 rounded-full object-cover border-4 border-white shadow-lg group-hover:shadow-xl transition-shadow"
                            />
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Content */}
                    <div className={`p-4 sm:p-5 lg:p-6 ${business.profileImageUrl ? 'pt-10 sm:pt-11 lg:pt-12' : ''}`}>
                      <h3 className="text-lg lg:text-xl font-bold text-gray-900 mb-2 tracking-tight group-hover:text-teal-600 transition-colors">
                        {business.name}
                      </h3>

                      {business.description && (
                        <p className="text-sm text-gray-500 mb-3 lg:mb-4 line-clamp-2">
                          {business.description}
                        </p>
                      )}

                      {/* Location */}
                      <div className="flex items-start gap-2 text-sm text-gray-600 mb-3 lg:mb-4">
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
                        <div className="flex flex-wrap gap-1.5 lg:gap-2 mb-3 lg:mb-4">
                          {business.categories.slice(0, 3).map((category) => (
                            <span
                              key={category.id}
                              className="px-2.5 lg:px-3 py-1 bg-gray-100 text-gray-700 text-xs font-semibold rounded-lg"
                            >
                              {category.name}
                            </span>
                          ))}
                          {business.categories.length > 3 && (
                            <span className="px-2.5 lg:px-3 py-1 bg-gray-100 text-gray-500 text-xs font-semibold rounded-lg">
                              +{business.categories.length - 3} more
                            </span>
                          )}
                        </div>
                      )}

                      {/* CTA */}
                      <div className="flex items-center justify-between pt-3 lg:pt-4 border-t border-gray-100">
                        <span className="text-xs sm:text-sm font-semibold text-teal-600 group-hover:text-teal-700">
                          View & Book
                        </span>
                        <svg className="w-4 h-4 lg:w-5 lg:h-5 text-teal-600 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
