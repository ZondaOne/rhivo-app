"use client";

import { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Minimal custom marker icon (teal dot)
const createCustomIcon = (color: string = '#14b8a6') => {
  return L.divIcon({
    className: 'custom-marker',
    html: `
      <div style="
        width: 16px;
        height: 16px;
        background: ${color};
        border: 3px solid white;
        border-radius: 50%;
        box-shadow: 0 2px 8px rgba(0,0,0,0.25);
        transform: translate(-50%, -50%);
      "></div>
    `,
    iconSize: [16, 16],
    iconAnchor: [8, 8],
    popupAnchor: [0, -8],
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
  latitude?: number;
  longitude?: number;
}

interface BusinessMapProps {
  businesses: Business[];
  onBusinessClick: (subdomain: string) => void;
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

// Component to fit bounds when markers change
function MapBounds({ businesses }: { businesses: Array<{ latitude?: number; longitude?: number }> }) {
  const map = useMap();

  useEffect(() => {
    const validCoords = businesses
      .filter(b => b.latitude && b.longitude)
      .map(b => [b.latitude!, b.longitude!] as [number, number]);

    if (validCoords.length > 0) {
      const bounds = L.latLngBounds(validCoords);
      map.fitBounds(bounds, { padding: [50, 50], maxZoom: 13 });
    }
  }, [businesses, map]);

  return null;
}

export default function BusinessMap({ businesses, onBusinessClick }: BusinessMapProps) {
  const [mounted, setMounted] = useState(false);

  // Add coordinates: prioritize YAML lat/long, fallback to city coordinates
  const businessesWithCoords = businesses.map(business => {
    // If YAML already has coordinates, use them
    if (business.latitude && business.longitude) {
      return business;
    }

    // Fallback: lookup by city name (temporary)
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

  // Only render map on client side
  useEffect(() => {
    setMounted(true);
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

  // Default center: Italy center (Florence area)
  const defaultCenter: [number, number] = [43.0, 12.0];
  const defaultZoom = 6;

  return (
    <div className="w-full h-full rounded-2xl overflow-hidden border-2 border-gray-200">
      <MapContainer
        center={defaultCenter}
        zoom={defaultZoom}
        style={{ height: '100%', width: '100%' }}
        scrollWheelZoom={true}
      >
        {/* Minimal grayscale map style using CartoDB Positron tiles */}
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
          url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
        />

        {validBusinesses.map((business) => (
          <Marker
            key={business.subdomain}
            position={[business.latitude!, business.longitude!]}
            icon={createCustomIcon('#14b8a6')}
            eventHandlers={{
              click: () => onBusinessClick(business.subdomain),
            }}
          >
            <Popup>
              <div className="p-2 min-w-[200px]">
                <h3 className="font-bold text-gray-900 mb-1">{business.name}</h3>
                {business.description && (
                  <p className="text-sm text-gray-600 mb-2 line-clamp-2">{business.description}</p>
                )}
                <p className="text-xs text-gray-500 mb-2">
                  📍 {business.address.city}, {business.address.state}
                </p>
                {business.categories.length > 0 && (
                  <div className="flex flex-wrap gap-1 mb-3">
                    {business.categories.slice(0, 2).map((cat) => (
                      <span
                        key={cat.id}
                        className="px-2 py-1 bg-teal-50 text-teal-700 text-xs font-semibold rounded"
                      >
                        {cat.name}
                      </span>
                    ))}
                  </div>
                )}
                <button
                  onClick={() => onBusinessClick(business.subdomain)}
                  className="w-full px-3 py-2 bg-gradient-to-r from-teal-600 to-green-600 text-white text-sm font-semibold rounded-lg hover:shadow-lg transition-all"
                >
                  View & Book
                </button>
              </div>
            </Popup>
          </Marker>
        ))}

        <MapBounds businesses={validBusinesses} />
      </MapContainer>
    </div>
  );
}
