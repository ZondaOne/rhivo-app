/**
 * Geocoding service using Nominatim (OpenStreetMap)
 *
 * Free geocoding API with no API key required.
 * Rate limit: 1 request per second for fair use.
 *
 * Docs: https://nominatim.org/release-docs/latest/api/Search/
 */

export interface GeocodingResult {
  latitude: number;
  longitude: number;
  displayName: string;
  address?: {
    street?: string;
    city?: string;
    state?: string;
    country?: string;
    postalCode?: string;
  };
}

export interface GeocodingError {
  error: string;
  message: string;
}

/**
 * Geocode an address to lat/long coordinates
 *
 * @param address Full address string or address components
 * @returns Promise with coordinates and normalized address
 */
export async function geocodeAddress(
  address: string | {
    street?: string;
    city?: string;
    state?: string;
    postalCode?: string;
    country?: string;
  }
): Promise<GeocodingResult | GeocodingError> {
  try {
    // Build query string
    let query: string;
    if (typeof address === 'string') {
      query = address;
    } else {
      // Build structured query
      const parts = [
        address.street,
        address.city,
        address.state,
        address.postalCode,
        address.country
      ].filter(Boolean);
      query = parts.join(', ');
    }

    if (!query.trim()) {
      return {
        error: 'INVALID_INPUT',
        message: 'Address cannot be empty'
      };
    }

    // Call Nominatim API with proper headers
    const params = new URLSearchParams({
      q: query,
      format: 'json',
      addressdetails: '1',
      limit: '1',
      'accept-language': 'it,en' // Prefer Italian, fallback to English
    });

    const response = await fetch(
      `https://nominatim.openstreetmap.org/search?${params.toString()}`,
      {
        headers: {
          'User-Agent': 'Rivo Appointment Platform/1.0 (contact@rivo.app)',
          'Accept': 'application/json'
        }
      }
    );

    if (!response.ok) {
      return {
        error: 'API_ERROR',
        message: `Nominatim API error: ${response.status} ${response.statusText}`
      };
    }

    const results = await response.json();

    if (!results || results.length === 0) {
      return {
        error: 'NOT_FOUND',
        message: 'No results found for the given address. Please check the address and try again.'
      };
    }

    const result = results[0];

    return {
      latitude: parseFloat(result.lat),
      longitude: parseFloat(result.lon),
      displayName: result.display_name,
      address: {
        street: result.address?.road || result.address?.street,
        city: result.address?.city || result.address?.town || result.address?.village,
        state: result.address?.state || result.address?.province || result.address?.region,
        country: result.address?.country,
        postalCode: result.address?.postcode
      }
    };

  } catch (error) {
    console.error('Geocoding error:', error);
    return {
      error: 'NETWORK_ERROR',
      message: error instanceof Error ? error.message : 'Failed to geocode address'
    };
  }
}

/**
 * Reverse geocode: convert lat/long to address
 *
 * @param latitude Latitude coordinate
 * @param longitude Longitude coordinate
 * @returns Promise with address components
 */
export async function reverseGeocode(
  latitude: number,
  longitude: number
): Promise<GeocodingResult | GeocodingError> {
  try {
    // Validate coordinates
    if (latitude < -90 || latitude > 90) {
      return {
        error: 'INVALID_INPUT',
        message: 'Latitude must be between -90 and 90'
      };
    }
    if (longitude < -180 || longitude > 180) {
      return {
        error: 'INVALID_INPUT',
        message: 'Longitude must be between -180 and 180'
      };
    }

    const params = new URLSearchParams({
      lat: latitude.toString(),
      lon: longitude.toString(),
      format: 'json',
      addressdetails: '1',
      'accept-language': 'it,en'
    });

    const response = await fetch(
      `https://nominatim.openstreetmap.org/reverse?${params.toString()}`,
      {
        headers: {
          'User-Agent': 'Rivo Appointment Platform/1.0 (contact@rivo.app)',
          'Accept': 'application/json'
        }
      }
    );

    if (!response.ok) {
      return {
        error: 'API_ERROR',
        message: `Nominatim API error: ${response.status} ${response.statusText}`
      };
    }

    const result = await response.json();

    if (result.error) {
      return {
        error: 'NOT_FOUND',
        message: 'No address found for the given coordinates'
      };
    }

    return {
      latitude,
      longitude,
      displayName: result.display_name,
      address: {
        street: result.address?.road || result.address?.street,
        city: result.address?.city || result.address?.town || result.address?.village,
        state: result.address?.state || result.address?.province || result.address?.region,
        country: result.address?.country,
        postalCode: result.address?.postcode
      }
    };

  } catch (error) {
    console.error('Reverse geocoding error:', error);
    return {
      error: 'NETWORK_ERROR',
      message: error instanceof Error ? error.message : 'Failed to reverse geocode coordinates'
    };
  }
}

/**
 * Search for address suggestions (autocomplete)
 *
 * @param query Partial address string
 * @param limit Maximum number of results (default: 5)
 * @returns Promise with array of suggestions
 */
export async function searchAddresses(
  query: string,
  limit: number = 5
): Promise<GeocodingResult[] | GeocodingError> {
  try {
    if (!query.trim() || query.length < 3) {
      return {
        error: 'INVALID_INPUT',
        message: 'Query must be at least 3 characters'
      };
    }

    const params = new URLSearchParams({
      q: query,
      format: 'json',
      addressdetails: '1',
      limit: Math.min(limit, 10).toString(), // Cap at 10 for performance
      'accept-language': 'it,en'
    });

    const response = await fetch(
      `https://nominatim.openstreetmap.org/search?${params.toString()}`,
      {
        headers: {
          'User-Agent': 'Rivo Appointment Platform/1.0 (contact@rivo.app)',
          'Accept': 'application/json'
        }
      }
    );

    if (!response.ok) {
      return {
        error: 'API_ERROR',
        message: `Nominatim API error: ${response.status} ${response.statusText}`
      };
    }

    const results = await response.json();

    return results.map((result: any) => ({
      latitude: parseFloat(result.lat),
      longitude: parseFloat(result.lon),
      displayName: result.display_name,
      address: {
        street: result.address?.road || result.address?.street,
        city: result.address?.city || result.address?.town || result.address?.village,
        state: result.address?.state || result.address?.province || result.address?.region,
        country: result.address?.country,
        postalCode: result.address?.postcode
      }
    }));

  } catch (error) {
    console.error('Address search error:', error);
    return {
      error: 'NETWORK_ERROR',
      message: error instanceof Error ? error.message : 'Failed to search addresses'
    };
  }
}

/**
 * Rate limiter to respect Nominatim's 1 request/second policy
 */
let lastRequestTime = 0;
const MIN_INTERVAL = 1000; // 1 second

export async function rateLimitedGeocode(
  address: string | { street?: string; city?: string; state?: string; postalCode?: string; country?: string }
): Promise<GeocodingResult | GeocodingError> {
  const now = Date.now();
  const timeSinceLastRequest = now - lastRequestTime;

  if (timeSinceLastRequest < MIN_INTERVAL) {
    // Wait to respect rate limit
    await new Promise(resolve => setTimeout(resolve, MIN_INTERVAL - timeSinceLastRequest));
  }

  lastRequestTime = Date.now();
  return geocodeAddress(address);
}
