# Onboarding Flow - Geocoding & Validation Implementation

**Date:** 2025-10-04
**Status:** ✅ Complete

## Summary

Successfully integrated geocoding and comprehensive frontend validation into the self-service business onboarding flow. Business owners can now:

1. Use address autocomplete with real-time geocoding
2. Automatically populate location details from selected addresses
3. See clear validation errors for all form fields
4. Have their business location accurately geocoded and stored in YAML configs

## What Was Implemented

### 1. Address Autocomplete Integration

**Component Used:** `AddressAutocomplete` from `/src/components/geocoding/AddressAutocomplete.tsx`

**Features:**
- Real-time address search using Nominatim API
- Dropdown suggestions with coordinates preview
- Auto-population of address fields (street, city, state, postal code, country)
- Automatic geocoding to latitude/longitude
- Visual confirmation with coordinates card

**Location:** `/app/onboard/page.tsx` - Contact step (lines 507-720)

**Handler:**
```typescript
const handleAddressSelect = (result: GeocodingResult) => {
  setLatitude(result.latitude);
  setLongitude(result.longitude);
  setAddressSelected(true);

  // Auto-populate address fields
  if (result.address) {
    if (result.address.street) setStreet(result.address.street);
    if (result.address.city) setCity(result.address.city);
    if (result.address.state) setState(result.address.state);
    if (result.address.postalCode) setPostalCode(result.address.postalCode);
  }
};
```

### 2. Frontend Validation

**Validation Functions Added:**
- `validateEmail()` - Email format validation
- `validatePassword()` - Minimum 8 characters
- `validateBusinessName()` - 2-100 characters
- `validateSubdomain()` - Lowercase alphanumeric + hyphens, 3-63 chars
- `validatePhone()` - International format
- `validateUrl()` - Valid URL format
- `validateHexColor()` - Valid hex color code

**Step-by-Step Validation:**

```typescript
const validateCurrentStep = (): boolean => {
  const errors: Record<string, string> = {};

  switch (currentStep) {
    case 'auth':
      // Email, password, owner name validation
      break;
    case 'business':
      // Business name, subdomain validation
      break;
    case 'contact':
      // Address fields, phone, website validation
      // REQUIRED: Must have geocoded lat/long
      if (!latitude || !longitude) {
        errors.address = 'Please select an address from autocomplete';
      }
      break;
    case 'branding':
      // Color validation
      break;
    case 'availability':
      // At least one day enabled
      break;
    case 'rules':
      // Time slot, booking limits validation
      break;
  }

  setValidationErrors(errors);
  return Object.keys(errors).length === 0;
};
```

**Validation Triggers:**
- On "Continue" button click (blocks navigation if invalid)
- Clears errors when moving to next step successfully

**Error Display:**
1. **Summary Banner** - Top of form showing all errors
2. **Inline Errors** - Red text next to field labels
3. **Field Highlighting** - Red border + red background on invalid fields

### 3. Geocoding State Management

**New State Variables:**
```typescript
const [latitude, setLatitude] = useState<number | null>(null);
const [longitude, setLongitude] = useState<number | null>(null);
const [addressSelected, setAddressSelected] = useState(false);
const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});
```

**Coordinate Flow:**
1. User searches for address in autocomplete
2. Selects suggestion from dropdown
3. Nominatim geocodes address → lat/long
4. Coordinates stored in state
5. Submitted with form data
6. Saved to YAML config

### 4. YAML Generator Updates

**File:** `/src/lib/onboarding/yaml-generator.ts`

**Interface Changes:**
```typescript
export interface OnboardingFormData {
  // ... existing fields
  latitude?: number | null;
  longitude?: number | null;
}
```

**Config Generation:**
```typescript
contact: {
  address: {
    street: formData.street || 'Not provided',
    city: formData.city || 'Not provided',
    state: formData.state || 'Not provided',
    postalCode: formData.postalCode || '00000',
    country: formData.country,
  },
  email: formData.email,
  phone: formData.phone || '+10000000000',
  website: formData.website,
  // ✅ NEW: Include coordinates if available
  ...(formData.latitude && formData.longitude ? {
    latitude: formData.latitude,
    longitude: formData.longitude,
  } : {}),
}
```

### 5. API Integration

**Endpoint:** `POST /api/onboard/self-service`

**Updated Payload:**
```json
{
  "email": "owner@example.com",
  "password": "password123",
  "ownerName": "John Doe",
  "businessName": "My Business",
  "businessId": "my-business",
  "street": "Via dei Servi 45",
  "city": "Firenze",
  "state": "Toscana",
  "postalCode": "50122",
  "country": "IT",
  "latitude": 43.77584,     // ✅ NEW
  "longitude": 11.2598,     // ✅ NEW
  // ... rest of fields
}
```

The API already handles these fields and passes them to the YAML generator.

## User Experience Flow

### Step 1: Auth (with validation)
- Enter name, email, password
- **Validation:** Email format, password min 8 chars, name required
- **Error Display:** Red fields + summary banner

### Step 2: Business (with validation)
- Enter business name → auto-generates subdomain
- Modify subdomain if desired
- Add description (optional)
- **Validation:** Business name 2-100 chars, subdomain format
- **Error Display:** Inline errors on invalid fields

### Step 3: Contact **with Geocoding** ✅
- **Address Autocomplete:**
  - Type "Via dei Servi 45, Firenze"
  - See dropdown suggestions
  - Click suggestion
  - Address fields auto-populate
  - Coordinates preview shows: `43.775840, 11.259800`

- Manual fields editable (street, city, state, postal code, country)
- Phone and website (optional)

- **Validation:**
  - Street, city, state, postal code REQUIRED
  - **Coordinates REQUIRED** (must use autocomplete)
  - Phone format validation (international)
  - Website URL validation

- **Error Display:** "Please select an address from autocomplete" if no coords

### Step 4-8: Continue onboarding...
- Branding, Services, Availability, Rules, Details, Review
- All with inline validation

### Step 9: Submit
- Creates business in database
- Generates YAML with coordinates
- Saves YAML file to `config/tenants/{subdomain}.yaml`

## Validation Error Examples

### Auth Step
```
Please fix the following errors:
• Email is required
• Password must be at least 8 characters
```

### Contact Step
```
Please fix the following errors:
• Street address is required
• City is required
• State/Province is required
• Postal code is required
• Please select an address from the autocomplete suggestions to geocode your location
```

### Business Step
```
Please fix the following errors:
• Business name is required
• Subdomain must contain only lowercase letters, numbers, and hyphens
```

## Technical Details

### Geocoding Validation Logic

The contact step requires geocoded coordinates:

```typescript
case 'contact':
  if (!street.trim()) errors.street = 'Street address is required';
  if (!city.trim()) errors.city = 'City is required';
  if (!state.trim()) errors.state = 'State/Province is required';
  if (!postalCode.trim()) errors.postalCode = 'Postal code is required';

  // ✅ CRITICAL: Require geocoded coordinates
  if (!latitude || !longitude) {
    errors.address = 'Please select an address from the autocomplete suggestions to geocode your location';
  }
  break;
```

This ensures that:
1. Users cannot skip geocoding
2. All new businesses have accurate map coordinates
3. Discovery map displays correct locations

### CSS Validation Styling

**Invalid Field:**
```tsx
className={`w-full px-4 py-3 border-2 rounded-xl transition-colors ${
  validationErrors.fieldName
    ? 'border-red-300 bg-red-50'  // Red border + light red background
    : 'border-gray-300'             // Normal gray border
}`}
```

**Error Label:**
```tsx
<label>
  Field Name
  {validationErrors.fieldName && (
    <span className="text-red-600 text-xs ml-2">
      {validationErrors.fieldName}
    </span>
  )}
</label>
```

## Files Modified

1. **`/app/onboard/page.tsx`**
   - Added validation functions
   - Added geocoding state
   - Integrated AddressAutocomplete
   - Added validation error display
   - Updated submit handler

2. **`/src/lib/onboarding/yaml-generator.ts`**
   - Added lat/long to interface
   - Included coordinates in config generation

3. **`/app/api/onboard/self-service/route.ts`**
   - No changes needed (already handles dynamic fields)

## Testing Checklist

### Validation Testing
- [x] Auth step blocks with empty email
- [x] Auth step blocks with invalid email format
- [x] Auth step blocks with password < 8 chars
- [x] Business step blocks with empty business name
- [x] Business step blocks with invalid subdomain format
- [x] Contact step blocks without geocoded coordinates
- [x] Contact step blocks with empty address fields
- [x] Validation errors display in summary banner
- [x] Invalid fields show red borders
- [x] Error messages appear inline

### Geocoding Testing
- [x] Address autocomplete appears after 3 characters
- [x] Suggestions load from Nominatim
- [x] Clicking suggestion populates address fields
- [x] Coordinates preview displays
- [x] Latitude/longitude stored in state
- [x] Coordinates included in form submission
- [x] YAML config contains lat/long

### Integration Testing
- [x] Complete onboarding flow works end-to-end
- [x] YAML file created with coordinates
- [x] Business appears on discovery map at correct location

## Success Criteria

✅ **All criteria met:**

1. ✅ Users cannot proceed past contact step without geocoding
2. ✅ Address autocomplete provides real-time suggestions
3. ✅ Coordinates automatically extracted and stored
4. ✅ All form fields have validation
5. ✅ Validation errors clearly displayed
6. ✅ Red highlighting on invalid fields
7. ✅ Summary banner shows all errors
8. ✅ Inline error messages next to labels
9. ✅ YAML configs include latitude/longitude
10. ✅ New businesses appear on discovery map

## Benefits

### For Business Owners
- ✅ Easy address entry with autocomplete
- ✅ No manual coordinate entry needed
- ✅ Clear error messages guide them through form
- ✅ Prevents submission of incomplete data

### For Platform
- ✅ All new businesses have geocoded locations
- ✅ Discovery map accuracy improved
- ✅ Data quality enforced at entry point
- ✅ Reduced support requests for address issues

### For Customers
- ✅ Accurate business locations on discovery map
- ✅ Reliable distance calculations (future feature)
- ✅ Better search results

## Next Steps (Optional Enhancements)

- [ ] Real-time subdomain availability check
- [ ] Save draft progress to localStorage
- [ ] Email verification flow
- [ ] Phone number verification (SMS)
- [ ] Image upload for logo/cover
- [ ] Multi-language support for autocomplete
- [ ] Map preview in onboarding wizard

---

**Implementation Complete:** All geocoding and validation features working correctly in the onboarding flow!
