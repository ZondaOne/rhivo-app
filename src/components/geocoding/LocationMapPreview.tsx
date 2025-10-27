"use client";

import { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';

// Dynamically import Leaflet and CSS only on client-side
let L: typeof import('leaflet') | null = null;

// Dynamically import map components to avoid SSR issues
const MapContainer = dynamic(
  () => import('react-leaflet').then((mod) => mod.MapContainer),
  { ssr: false }
);
const TileLayer = dynamic(
  () => import('react-leaflet').then((mod) => mod.TileLayer),
  { ssr: false }
);
const Marker = dynamic(
  () => import('react-leaflet').then((mod) => mod.Marker),
  { ssr: false }
);

// Simple marker icon (only runs on client)
const createSimpleIcon = () => {
  if (!L) return null;

  return L.divIcon({
    className: 'custom-marker',
    html: `
      <div style="
        width: 32px;
        height: 32px;
        display: flex;
        align-items: center;
        justify-content: center;
        transform: translate(-50%, -50%);
      ">
        <div style="
          width: 24px;
          height: 24px;
          background: #0d9488;
          border: 3px solid white;
          border-radius: 50%;
          box-shadow: 0 2px 8px rgba(0,0,0,0.3);
        "></div>
      </div>
    `,
    iconSize: [32, 32],
    iconAnchor: [16, 16],
  });
};

interface LocationMapPreviewProps {
  latitude: number;
  longitude: number;
  businessName?: string;
  address?: string;
  onClose: () => void;
}

export default function LocationMapPreview({
  latitude,
  longitude,
  businessName,
  address,
  onClose
}: LocationMapPreviewProps) {
  const [mounted, setMounted] = useState(false);
  const [isVisible, setIsVisible] = useState(false);
  const [markerIcon, setMarkerIcon] = useState<L.DivIcon | null>(null);

  useEffect(() => {
    // Dynamically import Leaflet on client-side only
    const loadLeaflet = async () => {
      if (typeof window !== 'undefined') {
        // Import Leaflet
        const leaflet = await import('leaflet');
        L = leaflet.default || leaflet;

        // Import Leaflet CSS
        await import('leaflet/dist/leaflet.css');

        // Create marker icon after leaflet is loaded
        setMarkerIcon(createSimpleIcon());
        setMounted(true);

        // Trigger animation after mount
        requestAnimationFrame(() => {
          setIsVisible(true);
        });
      }
    };

    loadLeaflet();

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [onClose]);

  if (!mounted || !markerIcon) {
    return null;
  }

  return (
    <>
      {/* Backdrop */}
      <div
        className={`fixed inset-0 bg-black/50 backdrop-blur-sm z-[9998] transition-opacity duration-300 ease-out ${
          isVisible ? 'opacity-100' : 'opacity-0'
        }`}
        onClick={onClose}
      />

      {/* Modal */}
      <div
        className={`fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-[9999] w-[90vw] max-w-2xl transition-all duration-300 ease-out ${
          isVisible ? 'opacity-100 scale-100' : 'opacity-0 scale-95'
        }`}
      >
        <div className="bg-white rounded-2xl shadow-2xl overflow-hidden">
          {/* Header */}
          <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
            <div>
              <h3 className="text-xl font-bold text-gray-900">Location Preview</h3>
              {businessName && (
                <p className="text-sm text-gray-600 mt-1">{businessName}</p>
              )}
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

          {/* Map */}
          <div className="h-96 w-full relative bg-gray-100">
            {/* Loading overlay */}
            <div className="absolute inset-0 flex items-center justify-center bg-gray-100 z-10">
              <div className="text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-4 border-teal-600 border-t-transparent mx-auto mb-3"></div>
                <p className="text-sm text-gray-600">Loading map...</p>
              </div>
            </div>

            <MapContainer
              center={[latitude, longitude]}
              zoom={15}
              style={{ height: '100%', width: '100%', position: 'relative', zIndex: 20 }}
              scrollWheelZoom={true}
              zoomControl={true}
              attributionControl={true}
              whenReady={() => {
                // Hide loading overlay when map is ready
                const loadingEl = document.querySelector('.absolute.inset-0.flex.items-center') as HTMLElement;
                if (loadingEl) loadingEl.style.display = 'none';
              }}
            >
              <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                maxZoom={19}
              />
              <Marker
                position={[latitude, longitude]}
                icon={markerIcon}
              />
            </MapContainer>
          </div>

          {/* Footer */}
          <div className="px-6 py-4 bg-gray-50 border-t border-gray-200">
            <div className="flex items-start gap-3">
              <svg className="w-5 h-5 text-teal-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              <div className="flex-1">
                {address && (
                  <p className="text-sm font-medium text-gray-900 mb-1">{address}</p>
                )}
                <p className="text-xs text-gray-500">
                  Coordinates: {latitude.toFixed(6)}, {longitude.toFixed(6)}
                </p>
              </div>
            </div>
            <p className="text-xs text-gray-500 mt-3">
              This location will be displayed to customers on your booking page
            </p>
          </div>
        </div>
      </div>
    </>
  );
}
