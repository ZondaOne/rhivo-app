/**
 * Test script for geocoding Italian addresses
 *
 * Run with: npx tsx scripts/test-geocoding.ts
 */

import { geocodeAddress, reverseGeocode, searchAddresses } from '../src/lib/geocoding/nominatim';

async function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function testGeocodingService() {
  console.log('🧪 Testing Nominatim Geocoding Service for Italian Addresses\n');
  console.log('=' .repeat(70));

  // Test 1: Geocode wellness-spa address
  console.log('\n📍 Test 1: Geocoding Wellness Spa (Firenze)');
  console.log('-'.repeat(70));
  const spaResult = await geocodeAddress({
    street: 'Via dei Servi 45',
    city: 'Firenze',
    state: 'Toscana',
    postalCode: '50122',
    country: 'IT'
  });

  if ('error' in spaResult) {
    console.error('❌ Error:', spaResult.message);
  } else {
    console.log('✅ Success!');
    console.log('   Address:', spaResult.displayName);
    console.log('   Coordinates:', spaResult.latitude.toFixed(6), spaResult.longitude.toFixed(6));
    console.log('   Expected:', '43.775100', '11.260000');
    console.log('   Match:', Math.abs(spaResult.latitude - 43.7751) < 0.01 ? '✅' : '⚠️');
  }

  await sleep(1200); // Respect rate limit

  // Test 2: Geocode bella-salon address
  console.log('\n📍 Test 2: Geocoding Bella Salon (Firenze)');
  console.log('-'.repeat(70));
  const salonResult = await geocodeAddress({
    street: 'Via della Spada 12',
    city: 'Firenze',
    state: 'Toscana',
    postalCode: '50123',
    country: 'IT'
  });

  if ('error' in salonResult) {
    console.error('❌ Error:', salonResult.message);
  } else {
    console.log('✅ Success!');
    console.log('   Address:', salonResult.displayName);
    console.log('   Coordinates:', salonResult.latitude.toFixed(6), salonResult.longitude.toFixed(6));
    console.log('   Expected:', '43.771000', '11.252600');
    console.log('   Match:', Math.abs(salonResult.latitude - 43.7710) < 0.01 ? '✅' : '⚠️');
  }

  await sleep(1200);

  // Test 3: Reverse geocode
  console.log('\n🔄 Test 3: Reverse Geocoding (Florence center)');
  console.log('-'.repeat(70));
  const reverseResult = await reverseGeocode(43.7696, 11.2558);

  if ('error' in reverseResult) {
    console.error('❌ Error:', reverseResult.message);
  } else {
    console.log('✅ Success!');
    console.log('   Address:', reverseResult.displayName);
    console.log('   City:', reverseResult.address?.city);
    console.log('   State:', reverseResult.address?.state);
  }

  await sleep(1200);

  // Test 4: Address search/autocomplete
  console.log('\n🔍 Test 4: Address Search (autocomplete for "Piazza Duomo Firenze")');
  console.log('-'.repeat(70));
  const searchResult = await searchAddresses('Piazza Duomo Firenze', 3);

  if ('error' in searchResult) {
    console.error('❌ Error:', searchResult.message);
  } else {
    console.log(`✅ Success! Found ${searchResult.length} results:`);
    searchResult.forEach((result, i) => {
      console.log(`   ${i + 1}. ${result.displayName}`);
      console.log(`      Coords: ${result.latitude.toFixed(6)}, ${result.longitude.toFixed(6)}`);
    });
  }

  await sleep(1200);

  // Test 5: Search for various Italian cities
  console.log('\n🇮🇹 Test 5: Searching Italian cities');
  console.log('-'.repeat(70));
  const cities = ['Roma, Italy', 'Milano, Italy', 'Venezia, Italy'];

  for (const city of cities) {
    const cityResult = await geocodeAddress(city);

    if ('error' in cityResult) {
      console.error(`❌ ${city}: Error -`, cityResult.message);
    } else {
      console.log(`✅ ${city}:`);
      console.log(`   Coords: ${cityResult.latitude.toFixed(6)}, ${cityResult.longitude.toFixed(6)}`);
    }

    await sleep(1200);
  }

  console.log('\n' + '='.repeat(70));
  console.log('✅ All tests completed!\n');
}

// Run tests
testGeocodingService().catch(console.error);
