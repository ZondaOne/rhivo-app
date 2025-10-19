"use client";

import { useEffect, useState, useRef, useCallback } from 'react';
import { MapContainer, TileLayer, Marker, useMap, useMapEvents } from 'react-leaflet';
import MarkerClusterGroup from 'react-leaflet-cluster';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Minimal custom marker icon with larger hit area
const createCustomIcon = (color: string = '#14b8a6', isHovered: boolean = false) => {
  const dotSize = isHovered ? 24 : 20;
  const borderWidth = isHovered ? 4 : 3;
  const hitAreaSize = 40; // Larger invisible hit area for easier hovering

  return L.divIcon({
    className: 'custom-marker',
    html: `
      <div style="
        width: ${hitAreaSize}px;
        height: ${hitAreaSize}px;
        display: flex;
        align-items: center;
        justify-content: center;
        transform: translate(-50%, -50%);
        cursor: pointer;
      ">
        <div style="
          width: ${dotSize}px;
          height: ${dotSize}px;
          background: ${color};
          border: ${borderWidth}px solid white;
          border-radius: 50%;
          box-shadow: 0 ${isHovered ? 4 : 2}px ${isHovered ? 12 : 8}px rgba(0,0,0,${isHovered ? 0.4 : 0.3});
          transition: all 0.15s ease;
        "></div>
      </div>
    `,
    iconSize: [hitAreaSize, hitAreaSize],
    iconAnchor: [hitAreaSize / 2, hitAreaSize / 2],
    popupAnchor: [0, -hitAreaSize / 2],
  });
};

// Custom cluster icon
const createClusterIcon = (cluster: any) => {
  const count = cluster.getChildCount();
  const size = count < 10 ? 40 : count < 50 ? 50 : 60;

  return L.divIcon({
    html: `
      <div style="
        width: ${size}px;
        height: ${size}px;
        background: linear-gradient(135deg, #0d9488, #14b8a6);
        border: 4px solid white;
        border-radius: 50%;
        box-shadow: 0 4px 12px rgba(0,0,0,0.3);
        display: flex;
        align-items: center;
        justify-content: center;
        color: white;
        font-weight: bold;
        font-size: ${count < 10 ? '14px' : '16px'};
        cursor: pointer;
      ">${count}</div>
    `,
    className: 'custom-cluster-icon',
    iconSize: [size, size],
  });
};

interface Business {
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
}

interface BusinessMapProps {
  businesses: Business[];
  onBusinessClick: (subdomain: string) => void;
}

// Desktop Modal for business details
interface BusinessModalProps {
  business: Business;
  onClose: () => void;
  onClick: () => void;
}

function BusinessModal({ business, onClose, onClick }: BusinessModalProps) {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // Trigger animation after mount
    requestAnimationFrame(() => {
      setIsVisible(true);
    });

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [onClose]);

  return (
    <>
      {/* Backdrop */}
      <div
        className={`fixed inset-0 bg-black/40 backdrop-blur-sm z-[999] transition-opacity duration-300 ease-out ${
          isVisible ? 'opacity-100' : 'opacity-0'
        }`}
        onClick={onClose}
      />

      {/* Modal */}
      <div
        className={`fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-[1000] w-[90vw] max-w-md transition-all duration-300 ease-out ${
          isVisible ? 'opacity-100 scale-100' : 'opacity-0 scale-95'
        }`}
      >
        <div className="bg-white rounded-2xl shadow-2xl overflow-hidden">
          {/* Header with gradient or image and profile picture overlay */}
          <div className="relative">
            {business.coverImageUrl ? (
              <div className="h-40 overflow-hidden">
                <img
                  src={business.coverImageUrl}
                  alt={business.name}
                  className="w-full h-full object-cover"
                />
              </div>
            ) : (
              <div
                className="h-40 flex items-center justify-center"
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

            {/* Profile Picture Avatar */}
            {business.profileImageUrl && (
              <div className="absolute -bottom-10 left-6">
                <img
                  src={business.profileImageUrl}
                  alt={`${business.name} profile`}
                  className="w-20 h-20 rounded-full object-cover border-4 border-white shadow-lg"
                />
              </div>
            )}
          </div>

          {/* Content */}
          <div className={`p-6 ${business.profileImageUrl ? 'pt-12' : ''}`}>
            <div className="flex items-start justify-between mb-3">
              <div className="flex-1">
                <h2 className="text-2xl font-bold text-gray-900 mb-2">{business.name}</h2>
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  <span>{business.address.city}, {business.address.state}</span>
                </div>
              </div>
              <button
                onClick={onClose}
                className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                aria-label="Close"
              >
                <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {business.description && (
              <p className="text-sm text-gray-700 mb-4 leading-relaxed">{business.description}</p>
            )}

            {business.categories.length > 0 && (
              <div className="mb-6">
                <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Services</h3>
                <div className="flex flex-wrap gap-2">
                  {business.categories.map((cat) => (
                    <span
                      key={cat.id}
                      className="px-3 py-1.5 bg-teal-50 text-teal-700 text-sm font-medium rounded-lg"
                    >
                      {cat.name}
                    </span>
                  ))}
                </div>
              </div>
            )}

            <button
              onClick={onClick}
              className="w-full px-6 py-3 bg-gradient-to-r from-teal-600 to-green-600 text-white font-semibold rounded-xl hover:shadow-lg transition-all hover:scale-[1.02] active:scale-[0.98]"
            >
              View & Book
            </button>
          </div>
        </div>
      </div>
    </>
  );
}

// Mobile bottom sheet
function MobileBottomSheet({ business, onClose, onClick }: { business: Business; onClose: () => void; onClick: () => void }) {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // Trigger animation after mount
    requestAnimationFrame(() => {
      setIsVisible(true);
    });

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [onClose]);

  return (
    <>
      {/* Backdrop for mobile */}
      <div
        className={`fixed inset-0 bg-black/30 z-[999] transition-opacity duration-300 ease-out ${
          isVisible ? 'opacity-100' : 'opacity-0'
        }`}
        onClick={onClose}
      />

      <div
        className={`fixed inset-x-0 bottom-0 z-[1000] transition-transform duration-400 ease-out ${
          isVisible ? 'translate-y-0' : 'translate-y-full'
        }`}
      >
        <div className="bg-white rounded-t-3xl shadow-2xl overflow-hidden">
          {/* Profile Picture at top (mobile) */}
          {business.profileImageUrl && (
            <div className="flex justify-center pt-4">
              <img
                src={business.profileImageUrl}
                alt={`${business.name} profile`}
                className="w-16 h-16 rounded-full object-cover border-4 border-white shadow-lg"
              />
            </div>
          )}

          <div className={`p-6 ${business.profileImageUrl ? 'pt-3' : ''}`}>
            <div className="flex items-start justify-between mb-4">
              <div className="flex-1">
                <h3 className="text-xl font-bold text-gray-900 mb-1">{business.name}</h3>
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  <span>{business.address.city}, {business.address.state}</span>
                </div>
              </div>
              <button
                onClick={onClose}
                className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                aria-label="Close"
              >
                <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {business.description && (
              <p className="text-sm text-gray-700 mb-4 leading-relaxed">{business.description}</p>
            )}

            {business.categories.length > 0 && (
              <div className="mb-4">
                <div className="flex flex-wrap gap-2">
                  {business.categories.map((cat) => (
                    <span
                      key={cat.id}
                      className="px-3 py-1.5 bg-teal-50 text-teal-700 text-sm font-medium rounded-lg"
                    >
                      {cat.name}
                    </span>
                  ))}
                </div>
              </div>
            )}

            <button
              onClick={onClick}
              className="w-full px-6 py-3 bg-gradient-to-r from-teal-600 to-green-600 text-white font-semibold rounded-xl hover:shadow-lg transition-all active:scale-[0.98]"
            >
              View & Book
            </button>
          </div>
        </div>
      </div>
    </>
  );
}

// Italy city coordinates for demo purposes
const italyCityCoordinates: Record<string, [number, number]> = {
  'Firenze': [43.7696, 11.2558],
  'Florence': [43.7696, 11.2558],
  'Roma': [41.9028, 12.4964],
  'Rome': [41.9028, 12.4964],
  'Milano': [45.4642, 9.1900],
  'Milan': [45.4642, 9.1900],
  'Venezia': [45.4408, 12.3155],
  'Venice': [45.4408, 12.3155],
  'Napoli': [40.8518, 14.2681],
  'Naples': [40.8518, 14.2681],
  'Torino': [45.0703, 7.6869],
  'Turin': [45.0703, 7.6869],
  'Bologna': [44.4949, 11.3426],
  'Genova': [44.4056, 8.9463],
  'Genoa': [44.4056, 8.9463],
  'Palermo': [38.1157, 13.3615],
  'Bari': [41.1171, 16.8719],
};

// Component to fit bounds when markers change (only on initial load)
function MapBounds({ businesses }: { businesses: Array<{ latitude?: number; longitude?: number }> }) {
  const map = useMap();
  const initializedRef = useRef(false);

  useEffect(() => {
    // Only run once on initial load
    if (initializedRef.current) return;

    const validCoords = businesses
      .filter(b => b.latitude && b.longitude)
      .map(b => [b.latitude!, b.longitude!] as [number, number]);

    if (validCoords.length > 0) {
      const bounds = L.latLngBounds(validCoords);
      map.fitBounds(bounds, { padding: [50, 50], maxZoom: 13 });
      initializedRef.current = true;
    }
  }, [businesses, map]);

  return null;
}

// Interactive marker - simple and clean
interface InteractiveMarkerProps {
  business: Business;
  onClick: () => void;
}

function InteractiveMarker({ business, onClick }: InteractiveMarkerProps) {
  return (
    <Marker
      position={[business.latitude!, business.longitude!]}
      icon={createCustomIcon('#14b8a6', false)}
      eventHandlers={{
        click: onClick,
      }}
    />
  );
}

// Keyboard navigation handler
function KeyboardNavigationHandler({
  businesses,
  onSelect
}: {
  businesses: Business[];
  onSelect: (subdomain: string) => void;
}) {
  const [focusedIndex, setFocusedIndex] = useState(-1);
  const map = useMap();

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (businesses.length === 0) return;

      switch (e.key) {
        case 'Tab':
          e.preventDefault();
          setFocusedIndex(prev => {
            const next = e.shiftKey
              ? (prev - 1 + businesses.length) % businesses.length
              : (prev + 1) % businesses.length;

            const business = businesses[next];
            if (business.latitude && business.longitude) {
              map.setView([business.latitude, business.longitude], map.getZoom(), { animate: false });
            }
            return next;
          });
          break;

        case 'Enter':
        case ' ':
          if (focusedIndex >= 0) {
            e.preventDefault();
            onSelect(businesses[focusedIndex].subdomain);
          }
          break;

        case 'Escape':
          setFocusedIndex(-1);
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [businesses, focusedIndex, map, onSelect]);

  return null;
}


export default function BusinessMap({ businesses, onBusinessClick }: BusinessMapProps) {
  const [mounted, setMounted] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [selectedBusiness, setSelectedBusiness] = useState<Business | null>(null);

  // Add coordinates: prioritize YAML lat/long, fallback to city coordinates
  const businessesWithCoords = businesses.map(business => {
    if (business.latitude && business.longitude) {
      return business;
    }

    const cityName = business.address.city;
    const coords = italyCityCoordinates[cityName];

    if (coords) {
      return {
        ...business,
        latitude: coords[0],
        longitude: coords[1]
      };
    }
    return business;
  });

  const handleMarkerClick = useCallback((business: Business) => {
    setSelectedBusiness(business);
  }, []);

  const handleViewAndBook = useCallback(() => {
    if (selectedBusiness) {
      onBusinessClick(selectedBusiness.subdomain);
      setSelectedBusiness(null);
    }
  }, [selectedBusiness, onBusinessClick]);

  useEffect(() => {
    setMounted(true);
    setIsMobile(window.innerWidth < 768);

    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  if (!mounted) {
    return (
      <div className="w-full h-full bg-gray-100 rounded-2xl flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-teal-600 border-t-transparent mx-auto mb-4"></div>
          <p className="text-gray-500">Loading map...</p>
        </div>
      </div>
    );
  }

  const validBusinesses = businessesWithCoords.filter(b => b.latitude && b.longitude);
  const defaultCenter: [number, number] = [43.0, 12.0];
  const defaultZoom = 6;

  return (
    <>
      <div className="w-full h-full rounded-2xl overflow-hidden border-2 border-gray-200 relative">
        <MapContainer
          center={defaultCenter}
          zoom={defaultZoom}
          style={{ height: '100%', width: '100%' }}
          scrollWheelZoom={true}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
            url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
          />

          <MarkerClusterGroup
            chunkedLoading
            iconCreateFunction={createClusterIcon}
            showCoverageOnHover={false}
            spiderfyOnMaxZoom={true}
            maxClusterRadius={60}
          >
            {validBusinesses.map((business) => (
              <InteractiveMarker
                key={business.subdomain}
                business={business}
                onClick={() => handleMarkerClick(business)}
              />
            ))}
          </MarkerClusterGroup>

          <MapBounds businesses={validBusinesses} />
          <KeyboardNavigationHandler businesses={validBusinesses} onSelect={onBusinessClick} />
        </MapContainer>
      </div>

      {/* Desktop Modal */}
      {!isMobile && selectedBusiness && (
        <BusinessModal
          business={selectedBusiness}
          onClose={() => setSelectedBusiness(null)}
          onClick={handleViewAndBook}
        />
      )}

      {/* Mobile Bottom Sheet */}
      {isMobile && selectedBusiness && (
        <MobileBottomSheet
          business={selectedBusiness}
          onClose={() => setSelectedBusiness(null)}
          onClick={handleViewAndBook}
        />
      )}
    </>
  );
}
