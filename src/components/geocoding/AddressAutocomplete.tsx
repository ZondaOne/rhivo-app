"use client";

import { useState, useEffect, useRef } from 'react';
import { searchAddresses, type GeocodingResult, type GeocodingError } from '@/lib/geocoding/nominatim';

interface AddressAutocompleteProps {
  onAddressSelect: (result: GeocodingResult) => void;
  initialValue?: string;
  placeholder?: string;
  className?: string;
  showCoordinatesPreview?: boolean;
}

export default function AddressAutocomplete({
  onAddressSelect,
  initialValue = '',
  placeholder = 'Enter address...',
  className = '',
  showCoordinatesPreview = true
}: AddressAutocompleteProps) {
  const [query, setQuery] = useState(initialValue);
  const [suggestions, setSuggestions] = useState<GeocodingResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selectedAddress, setSelectedAddress] = useState<GeocodingResult | null>(null);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);

  const inputRef = useRef<HTMLInputElement>(null);
  const suggestionsRef = useRef<HTMLDivElement>(null);
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Debounced search
  useEffect(() => {
    if (query.length < 3) {
      setSuggestions([]);
      setShowSuggestions(false);
      return;
    }

    // Clear previous timer
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    // Set new timer
    debounceTimerRef.current = setTimeout(async () => {
      setIsLoading(true);
      setError(null);

      const result = await searchAddresses(query, 5);

      if (Array.isArray(result)) {
        setSuggestions(result);
        setShowSuggestions(result.length > 0);
      } else {
        setError(result.message);
        setSuggestions([]);
        setShowSuggestions(false);
      }

      setIsLoading(false);
    }, 500); // 500ms debounce

    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, [query]);

  // Click outside to close
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        suggestionsRef.current &&
        !suggestionsRef.current.contains(e.target as Node) &&
        inputRef.current &&
        !inputRef.current.contains(e.target as Node)
      ) {
        setShowSuggestions(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!showSuggestions || suggestions.length === 0) return;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setHighlightedIndex(prev =>
          prev < suggestions.length - 1 ? prev + 1 : 0
        );
        break;

      case 'ArrowUp':
        e.preventDefault();
        setHighlightedIndex(prev =>
          prev > 0 ? prev - 1 : suggestions.length - 1
        );
        break;

      case 'Enter':
        e.preventDefault();
        if (highlightedIndex >= 0 && highlightedIndex < suggestions.length) {
          handleSelectAddress(suggestions[highlightedIndex]);
        }
        break;

      case 'Escape':
        setShowSuggestions(false);
        setHighlightedIndex(-1);
        break;
    }
  };

  const handleSelectAddress = (result: GeocodingResult) => {
    setSelectedAddress(result);
    setQuery(result.displayName);
    setShowSuggestions(false);
    setHighlightedIndex(-1);
    onAddressSelect(result);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setQuery(e.target.value);
    setSelectedAddress(null);
    setHighlightedIndex(-1);
  };

  return (
    <div className={`relative ${className}`}>
      {/* Input field */}
      <div className="relative">
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          onFocus={() => {
            if (suggestions.length > 0) {
              setShowSuggestions(true);
            }
          }}
          placeholder={placeholder}
          className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:border-teal-500 focus:outline-none transition-colors text-gray-900 placeholder-gray-400"
        />

        {/* Loading indicator */}
        {isLoading && (
          <div className="absolute right-4 top-1/2 -translate-y-1/2">
            <div className="animate-spin rounded-full h-5 w-5 border-2 border-teal-600 border-t-transparent"></div>
          </div>
        )}

        {/* Selected checkmark */}
        {selectedAddress && !isLoading && (
          <div className="absolute right-4 top-1/2 -translate-y-1/2">
            <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
        )}
      </div>

      {/* Error message */}
      {error && (
        <div className="mt-2 px-3 py-2 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      {/* Suggestions dropdown */}
      {showSuggestions && suggestions.length > 0 && (
        <div
          ref={suggestionsRef}
          className="absolute z-50 w-full mt-2 bg-white border-2 border-gray-200 rounded-xl shadow-lg max-h-80 overflow-y-auto"
        >
          {suggestions.map((suggestion, index) => (
            <button
              key={`${suggestion.latitude}-${suggestion.longitude}-${index}`}
              type="button"
              onClick={() => handleSelectAddress(suggestion)}
              className={`w-full px-4 py-3 text-left hover:bg-teal-50 transition-colors border-b border-gray-100 last:border-b-0 ${
                highlightedIndex === index ? 'bg-teal-50' : ''
              }`}
            >
              <div className="flex items-start gap-3">
                <svg className="w-5 h-5 text-gray-400 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-900">{suggestion.displayName}</p>
                  {showCoordinatesPreview && (
                    <p className="text-xs text-gray-500 mt-1">
                      {suggestion.latitude.toFixed(6)}, {suggestion.longitude.toFixed(6)}
                    </p>
                  )}
                </div>
              </div>
            </button>
          ))}
        </div>
      )}

      {/* Coordinates preview card (shown when address is selected) */}
      {selectedAddress && showCoordinatesPreview && (
        <div className="mt-3 p-4 bg-gradient-to-br from-teal-50 to-green-50 border-2 border-teal-200 rounded-xl">
          <div className="flex items-start gap-3">
            <div className="p-2 bg-teal-100 rounded-lg">
              <svg className="w-5 h-5 text-teal-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
              </svg>
            </div>
            <div className="flex-1">
              <h4 className="text-sm font-semibold text-gray-900 mb-1">Location Coordinates</h4>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div>
                  <span className="text-gray-600">Latitude:</span>
                  <span className="ml-1 font-mono font-medium text-gray-900">
                    {selectedAddress.latitude.toFixed(6)}
                  </span>
                </div>
                <div>
                  <span className="text-gray-600">Longitude:</span>
                  <span className="ml-1 font-mono font-medium text-gray-900">
                    {selectedAddress.longitude.toFixed(6)}
                  </span>
                </div>
              </div>
              {selectedAddress.address && (
                <div className="mt-2 pt-2 border-t border-teal-200">
                  <div className="text-xs text-gray-700">
                    {[
                      selectedAddress.address.street,
                      selectedAddress.address.city,
                      selectedAddress.address.state,
                      selectedAddress.address.postalCode,
                      selectedAddress.address.country
                    ].filter(Boolean).join(', ')}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Help text */}
      {!selectedAddress && query.length < 3 && query.length > 0 && (
        <p className="mt-2 text-xs text-gray-500">
          Type at least 3 characters to search for addresses
        </p>
      )}
    </div>
  );
}
