import { NextRequest, NextResponse } from 'next/server';
import { geocodeAddress, reverseGeocode, searchAddresses, rateLimitedGeocode } from '@/lib/geocoding/nominatim';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const action = searchParams.get('action') || 'geocode';

    switch (action) {
      case 'geocode': {
        // Forward geocoding: address → coordinates
        const address = searchParams.get('address');

        if (!address) {
          return NextResponse.json(
            { error: 'INVALID_INPUT', message: 'Missing required parameter: address' },
            { status: 400 }
          );
        }

        const result = await rateLimitedGeocode(address);

        if ('error' in result) {
          return NextResponse.json(result, { status: 400 });
        }

        return NextResponse.json({
          success: true,
          result
        });
      }

      case 'reverse': {
        // Reverse geocoding: coordinates → address
        const lat = searchParams.get('lat');
        const lon = searchParams.get('lon');

        if (!lat || !lon) {
          return NextResponse.json(
            { error: 'INVALID_INPUT', message: 'Missing required parameters: lat, lon' },
            { status: 400 }
          );
        }

        const latitude = parseFloat(lat);
        const longitude = parseFloat(lon);

        if (isNaN(latitude) || isNaN(longitude)) {
          return NextResponse.json(
            { error: 'INVALID_INPUT', message: 'Invalid coordinates' },
            { status: 400 }
          );
        }

        const result = await reverseGeocode(latitude, longitude);

        if ('error' in result) {
          return NextResponse.json(result, { status: 400 });
        }

        return NextResponse.json({
          success: true,
          result
        });
      }

      case 'search': {
        // Address autocomplete search
        const query = searchParams.get('query');
        const limitParam = searchParams.get('limit');
        const limit = limitParam ? parseInt(limitParam, 10) : 5;

        if (!query) {
          return NextResponse.json(
            { error: 'INVALID_INPUT', message: 'Missing required parameter: query' },
            { status: 400 }
          );
        }

        const result = await searchAddresses(query, limit);

        if ('error' in result) {
          return NextResponse.json(result, { status: 400 });
        }

        return NextResponse.json({
          success: true,
          results: result,
          count: result.length
        });
      }

      default:
        return NextResponse.json(
          { error: 'INVALID_ACTION', message: `Unknown action: ${action}. Valid actions: geocode, reverse, search` },
          { status: 400 }
        );
    }

  } catch (error) {
    console.error('Geocoding API error:', error);
    return NextResponse.json(
      {
        error: 'INTERNAL_ERROR',
        message: error instanceof Error ? error.message : 'Internal server error'
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, address, latitude, longitude, query, limit } = body;

    switch (action) {
      case 'geocode': {
        if (!address) {
          return NextResponse.json(
            { error: 'INVALID_INPUT', message: 'Missing required field: address' },
            { status: 400 }
          );
        }

        const result = await rateLimitedGeocode(address);

        if ('error' in result) {
          return NextResponse.json(result, { status: 400 });
        }

        return NextResponse.json({
          success: true,
          result
        });
      }

      case 'reverse': {
        if (latitude === undefined || longitude === undefined) {
          return NextResponse.json(
            { error: 'INVALID_INPUT', message: 'Missing required fields: latitude, longitude' },
            { status: 400 }
          );
        }

        const result = await reverseGeocode(latitude, longitude);

        if ('error' in result) {
          return NextResponse.json(result, { status: 400 });
        }

        return NextResponse.json({
          success: true,
          result
        });
      }

      case 'search': {
        if (!query) {
          return NextResponse.json(
            { error: 'INVALID_INPUT', message: 'Missing required field: query' },
            { status: 400 }
          );
        }

        const result = await searchAddresses(query, limit || 5);

        if ('error' in result) {
          return NextResponse.json(result, { status: 400 });
        }

        return NextResponse.json({
          success: true,
          results: result,
          count: result.length
        });
      }

      default:
        return NextResponse.json(
          { error: 'INVALID_ACTION', message: `Unknown action: ${action}. Valid actions: geocode, reverse, search` },
          { status: 400 }
        );
    }

  } catch (error) {
    console.error('Geocoding API error:', error);
    return NextResponse.json(
      {
        error: 'INTERNAL_ERROR',
        message: error instanceof Error ? error.message : 'Internal server error'
      },
      { status: 500 }
    );
  }
}
