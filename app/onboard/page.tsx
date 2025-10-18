"use client";

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import AddressAutocomplete from '@/components/geocoding/AddressAutocomplete';
import LocationMapPreview from '@/components/geocoding/LocationMapPreview';
import type { GeocodingResult } from '@/lib/geocoding/nominatim';
import { Logo } from '@/components/Logo';
import ServiceBuilder, { type Category } from '@/components/onboarding/ServiceBuilder';

type OnboardingStep = 'auth' | 'business' | 'contact' | 'branding' | 'services' | 'availability' | 'rules' | 'details' | 'review';

// Validation helpers with detailed, helpful messages
const validateEmail = (email: string): string | null => {
  if (!email) return 'Email address is required';
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return 'Please enter a valid email address (e.g., you@business.com)';
  }
  return null;
};

const validatePassword = (password: string): string | null => {
  if (!password) return 'Password is required to secure your account';
  if (password.length < 8) {
    return 'Password must be at least 8 characters for security';
  }
  // Check for basic strength
  if (!/[A-Za-z]/.test(password) || !/[0-9]/.test(password)) {
    return 'Password should contain both letters and numbers';
  }
  return null;
};

const validateBusinessName = (name: string): string | null => {
  if (!name || name.trim().length === 0) {
    return 'Business name is required - this is how customers will find you';
  }
  if (name.length < 2) {
    return 'Business name must be at least 2 characters';
  }
  if (name.length > 100) {
    return 'Business name is too long (maximum 100 characters)';
  }
  return null;
};

const validateSubdomain = (subdomain: string): string | null => {
  if (!subdomain) {
    return 'Subdomain is required for your booking page URL';
  }
  if (!/^[a-z0-9-]+$/.test(subdomain)) {
    return 'Only lowercase letters, numbers, and hyphens allowed (e.g., bella-salon)';
  }
  if (subdomain.length < 3) {
    return 'Subdomain must be at least 3 characters';
  }
  if (subdomain.length > 63) {
    return 'Subdomain is too long (maximum 63 characters)';
  }
  if (subdomain.startsWith('-') || subdomain.endsWith('-')) {
    return 'Subdomain cannot start or end with a hyphen';
  }
  // Check for reserved words
  const reserved = ['admin', 'api', 'www', 'app', 'dashboard', 'login', 'signup'];
  if (reserved.includes(subdomain)) {
    return 'This subdomain is reserved. Please choose another';
  }
  return null;
};

const validatePhone = (phone: string): string | null => {
  if (!phone) return null; // Optional
  const cleaned = phone.replace(/[\s-]/g, '');
  if (!/^\+?[1-9]\d{1,14}$/.test(cleaned)) {
    return 'Use international format (e.g., +39 055 1234567)';
  }
  return null;
};

const validateUrl = (url: string): string | null => {
  if (!url) return null; // Optional
  try {
    const parsed = new URL(url.startsWith('http') ? url : `https://${url}`);
    if (!parsed.protocol.startsWith('http')) {
      return 'URL must start with http:// or https://';
    }
    return null;
  } catch {
    return 'Please enter a valid URL (e.g., https://example.com)';
  }
};

const validateHexColor = (color: string): string | null => {
  if (!color) return 'Color is required';
  if (!/^#[0-9A-Fa-f]{6}$/.test(color)) {
    return 'Invalid color format. Use hex format (e.g., #10b981)';
  }
  return null;
};

export default function OnboardBusinessPage() {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState<OnboardingStep>('auth');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Auth step: Login or register
  const [authMode, setAuthMode] = useState<'login' | 'signup'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [ownerName, setOwnerName] = useState('');

  // Business info
  const [businessName, setBusinessName] = useState('');
  const [businessId, setBusinessId] = useState('');
  const [description, setDescription] = useState('');
  const [timezone, setTimezone] = useState('Europe/Rome');
  const [currency, setCurrency] = useState('EUR');

  // Contact info
  const [phone, setPhone] = useState('');
  const [street, setStreet] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('');
  const [postalCode, setPostalCode] = useState('');
  const [country, setCountry] = useState('IT');
  const [website, setWebsite] = useState('');

  // Geocoding
  const [latitude, setLatitude] = useState<number | null>(null);
  const [longitude, setLongitude] = useState<number | null>(null);
  const [addressSelected, setAddressSelected] = useState(false);
  const [showMapPreview, setShowMapPreview] = useState(false);

  // Validation errors
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});

  // Branding
  const [primaryColor, setPrimaryColor] = useState('#10b981');
  const [secondaryColor, setSecondaryColor] = useState('#14b8a6');

  // Dropdown states
  const [timezoneOpen, setTimezoneOpen] = useState(false);
  const [currencyOpen, setCurrencyOpen] = useState(false);
  const [countryOpen, setCountryOpen] = useState(false);

  // Services
  const [categories, setCategories] = useState<Category[]>([]);

  // Availability - support for multiple time slots per day (for breaks)
  const [availabilityMode, setAvailabilityMode] = useState<'simple' | 'advanced'>('simple');
  const [simpleAvailability, setSimpleAvailability] = useState({
    weekdaysEnabled: true,
    weekdayStart: '09:00',
    weekdayEnd: '17:00',
    saturdayEnabled: false,
    saturdayStart: '10:00',
    saturdayEnd: '14:00',
    sundayEnabled: false,
    sundayStart: '10:00',
    sundayEnd: '14:00',
  });
  const [availability, setAvailability] = useState([
    { day: 'monday', slots: [{ open: '09:00', close: '17:00' }], enabled: true },
    { day: 'tuesday', slots: [{ open: '09:00', close: '17:00' }], enabled: true },
    { day: 'wednesday', slots: [{ open: '09:00', close: '17:00' }], enabled: true },
    { day: 'thursday', slots: [{ open: '09:00', close: '17:00' }], enabled: true },
    { day: 'friday', slots: [{ open: '09:00', close: '17:00' }], enabled: true },
    { day: 'saturday', slots: [{ open: '10:00', close: '14:00' }], enabled: false },
    { day: 'sunday', slots: [{ open: '10:00', close: '14:00' }], enabled: false },
  ]);

  // Booking rules
  const [timeSlotDuration, setTimeSlotDuration] = useState(30);
  const [maxSimultaneousBookings, setMaxSimultaneousBookings] = useState(1);
  const [advanceBookingDays, setAdvanceBookingDays] = useState(30);
  const [requireEmail, setRequireEmail] = useState(true);
  const [requirePhone, setRequirePhone] = useState(false);
  const [allowGuestBooking, setAllowGuestBooking] = useState(true);

  // Additional details (from manual YAMLs like bella-salon/wellness-spa)
  const [minAdvanceBookingMinutes, setMinAdvanceBookingMinutes] = useState(60);
  const [maxBookingsPerCustomerPerDay, setMaxBookingsPerCustomerPerDay] = useState(3);
  const [cancellationDeadlineHours, setCancellationDeadlineHours] = useState(24);
  const [rescheduleDeadlineHours, setRescheduleDeadlineHours] = useState(12);
  const [refundPolicy, setRefundPolicy] = useState<'full' | 'partial' | 'none'>('full');
  const [partialRefundPercentage, setPartialRefundPercentage] = useState(50);
  const [reminderHoursBefore, setReminderHoursBefore] = useState(24);

  // Metadata
  const [parkingAvailable, setParkingAvailable] = useState(false);
  const [wheelchairAccessible, setWheelchairAccessible] = useState(false);
  const [acceptsWalkIns, setAcceptsWalkIns] = useState(false);

  const steps: OnboardingStep[] = ['auth', 'business', 'contact', 'branding', 'services', 'availability', 'rules', 'details', 'review'];

  const validateCurrentStep = (): boolean => {
    const errors: Record<string, string> = {};

    switch (currentStep) {
      case 'auth':
        const emailError = validateEmail(email);
        if (emailError) errors.email = emailError;

        if (authMode === 'signup') {
          const passwordError = validatePassword(password);
          if (passwordError) errors.password = passwordError;
          if (!ownerName.trim()) errors.ownerName = 'Name is required';
        }
        break;

      case 'business':
        const nameError = validateBusinessName(businessName);
        if (nameError) errors.businessName = nameError;

        const subdomainError = validateSubdomain(businessId);
        if (subdomainError) errors.businessId = subdomainError;
        break;

      case 'contact':
        if (!street.trim()) {
          errors.street = 'Street address is required for customer directions';
        }
        if (!city.trim()) {
          errors.city = 'City is required for location display';
        }
        if (!state.trim()) {
          errors.state = 'State/Province is required';
        }
        if (!postalCode.trim()) {
          errors.postalCode = 'Postal code is required for accurate geocoding';
        }

        const phoneError = validatePhone(phone);
        if (phoneError) errors.phone = phoneError;

        const websiteError = validateUrl(website);
        if (websiteError) errors.website = websiteError;

        if (!latitude || !longitude) {
          errors.address = 'Please select an address from the autocomplete dropdown to set your map location. This is required for business discovery.';
        }
        break;

      case 'branding':
        const primaryColorError = validateHexColor(primaryColor);
        if (primaryColorError) errors.primaryColor = primaryColorError;

        const secondaryColorError = validateHexColor(secondaryColor);
        if (secondaryColorError) errors.secondaryColor = secondaryColorError;
        break;

      case 'services':
        // Services are optional but validate if provided
        if (categories.length > 0) {
          for (const category of categories) {
            if (!category.name.trim()) {
              errors.services = 'All categories must have a name';
              break;
            }
            if (category.services.length === 0) {
              errors.services = `Category "${category.name}" must have at least one service`;
              break;
            }
            for (const service of category.services) {
              if (!service.name.trim()) {
                errors.services = `All services in "${category.name}" must have a name`;
                break;
              }
              if (service.duration < 5) {
                errors.services = `Service "${service.name}" duration must be at least 5 minutes`;
                break;
              }
              if (service.duration % 5 !== 0) {
                errors.services = `Service "${service.name}" duration must be a multiple of 5 minutes`;
                break;
              }
              if (service.price < 0) {
                errors.services = `Service "${service.name}" price cannot be negative`;
                break;
              }
            }
          }
        }
        break;

      case 'availability':
        const finalAvailability = getAvailabilityForSubmit();
        const enabledDays = finalAvailability.filter(d => d.enabled);
        if (enabledDays.length === 0) {
          errors.availability = 'You must be open at least one day per week to accept bookings';
        }
        // Check for valid time ranges
        for (const day of finalAvailability) {
          if (day.enabled) {
            for (const slot of day.slots) {
              const [openHour, openMin] = slot.open.split(':').map(Number);
              const [closeHour, closeMin] = slot.close.split(':').map(Number);
              const openMinutes = openHour * 60 + openMin;
              const closeMinutes = closeHour * 60 + closeMin;
              if (closeMinutes <= openMinutes) {
                errors.availability = `${day.day}: Closing time must be after opening time`;
                break;
              }
            }
          }
        }
        break;

      case 'rules':
        if (timeSlotDuration < 5 || timeSlotDuration > 480) {
          errors.timeSlotDuration = 'Time slot must be between 5 minutes and 8 hours (480 minutes)';
        }
        if (timeSlotDuration % 5 !== 0) {
          errors.timeSlotDuration = 'Time slot duration must be a multiple of 5 minutes';
        }
        if (maxSimultaneousBookings < 1) {
          errors.maxSimultaneousBookings = 'Must allow at least 1 booking per time slot';
        }
        if (maxSimultaneousBookings > 100) {
          errors.maxSimultaneousBookings = 'Maximum 100 simultaneous bookings allowed';
        }
        if (advanceBookingDays < 1 || advanceBookingDays > 365) {
          errors.advanceBookingDays = 'Advance booking must be between 1 and 365 days';
        }
        break;
    }

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleNext = () => {
    if (!validateCurrentStep()) {
      return;
    }

    setValidationErrors({});
    const currentIndex = steps.indexOf(currentStep);
    if (currentIndex < steps.length - 1) {
      setCurrentStep(steps[currentIndex + 1]);
    }
  };

  const handleBack = () => {
    const currentIndex = steps.indexOf(currentStep);
    if (currentIndex > 0) {
      setCurrentStep(steps[currentIndex - 1]);
    }
  };

  const generateBusinessId = (name: string) => {
    return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
  };

  const handleBusinessNameChange = (name: string) => {
    setBusinessName(name);
    if (!businessId || businessId === generateBusinessId(businessName)) {
      setBusinessId(generateBusinessId(name));
    }
  };

  const renderAuthStep = () => (
    <div className="space-y-6">
      <div className="text-center mb-8">
        <h2 className="text-3xl font-bold text-gray-900 mb-3">Register Your Business</h2>
        <p className="text-gray-600">Do you already have an owner account?</p>
      </div>

      <div className="flex gap-2 bg-gray-100 p-1 rounded-2xl mb-6">
        <button
          onClick={() => setAuthMode('signup')}
          className={`flex-1 px-6 py-2 rounded-xl text-sm font-semibold transition-all ${
            authMode === 'signup' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-900'
          }`}
        >
          Create new account
        </button>
        <button
          onClick={() => setAuthMode('login')}
          className={`flex-1 px-6 py-2 rounded-xl text-sm font-semibold transition-all ${
            authMode === 'login' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-900'
          }`}
        >
          I have an account
        </button>
      </div>

      {authMode === 'signup' ? (
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Your name
              {validationErrors.ownerName && <span className="text-red-600 text-xs ml-2">{validationErrors.ownerName}</span>}
            </label>
            <input
              type="text"
              value={ownerName}
              onChange={(e) => setOwnerName(e.target.value)}
              className={`w-full px-4 py-3 border-2 rounded-xl focus:ring-2 focus:ring-teal-500 focus:border-transparent transition-colors ${
                validationErrors.ownerName ? 'border-red-300 bg-red-50' : 'border-gray-300'
              }`}
              placeholder="John Doe"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Email address
              {validationErrors.email && <span className="text-red-600 text-xs ml-2">{validationErrors.email}</span>}
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className={`w-full px-4 py-3 border-2 rounded-xl focus:ring-2 focus:ring-teal-500 focus:border-transparent transition-colors ${
                validationErrors.email ? 'border-red-300 bg-red-50' : 'border-gray-300'
              }`}
              placeholder="you@example.com"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Password
              {validationErrors.password && <span className="text-red-600 text-xs ml-2">{validationErrors.password}</span>}
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className={`w-full px-4 py-3 border-2 rounded-xl focus:ring-2 focus:ring-teal-500 focus:border-transparent transition-colors ${
                validationErrors.password ? 'border-red-300 bg-red-50' : 'border-gray-300'
              }`}
              placeholder="Min. 8 characters"
              required
            />
            <p className="text-xs text-gray-500 mt-1">Must be at least 8 characters</p>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Email address
              {validationErrors.email && <span className="text-red-600 text-xs ml-2">{validationErrors.email}</span>}
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className={`w-full px-4 py-3 border-2 rounded-xl focus:ring-2 focus:ring-teal-500 focus:border-transparent transition-colors ${
                validationErrors.email ? 'border-red-300 bg-red-50' : 'border-gray-300'
              }`}
              placeholder="you@example.com"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-teal-500 focus:border-transparent"
              placeholder="Your password"
              required
            />
          </div>
        </div>
      )}
    </div>
  );

  const renderBusinessStep = () => (
    <div className="space-y-6">
      <div className="text-center mb-8">
        <h2 className="text-3xl font-bold text-gray-900 mb-3">Business Information</h2>
        <p className="text-gray-600">Tell us about your business</p>
      </div>

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Business name
            {validationErrors.businessName && <span className="text-red-600 text-xs ml-2">{validationErrors.businessName}</span>}
          </label>
          <input
            type="text"
            value={businessName}
            onChange={(e) => handleBusinessNameChange(e.target.value)}
            className={`w-full px-4 py-3 border-2 rounded-xl focus:ring-2 focus:ring-teal-500 focus:border-transparent transition-colors ${
              validationErrors.businessName ? 'border-red-300 bg-red-50' : 'border-gray-300'
            }`}
            placeholder="Bella Beauty Salon"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Subdomain
            <span className="text-gray-500 font-normal ml-2">(your booking page URL)</span>
            {validationErrors.businessId && <span className="text-red-600 text-xs ml-2">{validationErrors.businessId}</span>}
          </label>
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={businessId}
              onChange={(e) => setBusinessId(e.target.value)}
              className={`flex-1 px-4 py-3 border-2 rounded-xl focus:ring-2 focus:ring-teal-500 focus:border-transparent transition-colors ${
                validationErrors.businessId ? 'border-red-300 bg-red-50' : 'border-gray-300'
              }`}
              placeholder="bella-beauty"
              required
            />
            <span className="text-gray-500">.rivo.app</span>
          </div>
          <p className="text-sm text-gray-500 mt-1">Lowercase letters, numbers, and hyphens only</p>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
            className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-teal-500 focus:border-transparent"
            placeholder="Brief description of your business..."
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="relative">
            <label className="block text-sm font-medium text-gray-700 mb-2">Timezone</label>
            <button
              type="button"
              onClick={() => setTimezoneOpen(!timezoneOpen)}
              className="w-full px-4 py-3 border-2 border-gray-200 rounded-2xl bg-white text-gray-900 font-medium transition-all hover:border-gray-300 flex items-center justify-between"
            >
              <span>{timezone.replace('Europe/', '').replace('America/', '').replace('_', ' ')}</span>
              <svg className={`w-5 h-5 text-gray-500 transition-transform ${timezoneOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>
            {timezoneOpen && (
              <div className="absolute z-50 w-full mt-2 bg-white border-2 border-gray-200 rounded-2xl shadow-lg max-h-64 overflow-y-auto">
                <div className="p-2">
                  <div className="px-3 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wide">Europe</div>
                  {[
                    { value: 'Europe/Rome', label: 'Rome (Italy)' },
                    { value: 'Europe/Paris', label: 'Paris (France)' },
                    { value: 'Europe/Berlin', label: 'Berlin (Germany)' },
                    { value: 'Europe/Madrid', label: 'Madrid (Spain)' },
                    { value: 'Europe/London', label: 'London (UK)' },
                    { value: 'Europe/Amsterdam', label: 'Amsterdam (Netherlands)' },
                    { value: 'Europe/Brussels', label: 'Brussels (Belgium)' },
                    { value: 'Europe/Vienna', label: 'Vienna (Austria)' },
                    { value: 'Europe/Zurich', label: 'Zurich (Switzerland)' },
                    { value: 'Europe/Athens', label: 'Athens (Greece)' },
                    { value: 'Europe/Lisbon', label: 'Lisbon (Portugal)' },
                  ].map((tz) => (
                    <button
                      key={tz.value}
                      type="button"
                      onClick={() => {
                        setTimezone(tz.value);
                        setTimezoneOpen(false);
                      }}
                      className={`w-full text-left px-3 py-2 rounded-xl transition-all ${
                        timezone === tz.value
                          ? 'bg-teal-50 text-teal-900 font-semibold'
                          : 'hover:bg-gray-50 text-gray-700'
                      }`}
                    >
                      {tz.label}
                    </button>
                  ))}
                  <div className="px-3 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wide mt-2">Americas</div>
                  {[
                    { value: 'America/New_York', label: 'Eastern Time (US)' },
                    { value: 'America/Chicago', label: 'Central Time (US)' },
                    { value: 'America/Denver', label: 'Mountain Time (US)' },
                    { value: 'America/Los_Angeles', label: 'Pacific Time (US)' },
                  ].map((tz) => (
                    <button
                      key={tz.value}
                      type="button"
                      onClick={() => {
                        setTimezone(tz.value);
                        setTimezoneOpen(false);
                      }}
                      className={`w-full text-left px-3 py-2 rounded-xl transition-all ${
                        timezone === tz.value
                          ? 'bg-teal-50 text-teal-900 font-semibold'
                          : 'hover:bg-gray-50 text-gray-700'
                      }`}
                    >
                      {tz.label}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="relative">
            <label className="block text-sm font-medium text-gray-700 mb-2">Currency</label>
            <button
              type="button"
              onClick={() => setCurrencyOpen(!currencyOpen)}
              className="w-full px-4 py-3 border-2 border-gray-200 rounded-2xl bg-white text-gray-900 font-medium transition-all hover:border-gray-300 flex items-center justify-between"
            >
              <span>{currency}</span>
              <svg className={`w-5 h-5 text-gray-500 transition-transform ${currencyOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>
            {currencyOpen && (
              <div className="absolute z-50 w-full mt-2 bg-white border-2 border-gray-200 rounded-2xl shadow-lg">
                <div className="p-2">
                  {[
                    { value: 'EUR', label: 'EUR (€)' },
                    { value: 'USD', label: 'USD ($)' },
                    { value: 'GBP', label: 'GBP (£)' },
                    { value: 'CHF', label: 'CHF (₣)' },
                  ].map((curr) => (
                    <button
                      key={curr.value}
                      type="button"
                      onClick={() => {
                        setCurrency(curr.value);
                        setCurrencyOpen(false);
                      }}
                      className={`w-full text-left px-3 py-2 rounded-xl transition-all ${
                        currency === curr.value
                          ? 'bg-teal-50 text-teal-900 font-semibold'
                          : 'hover:bg-gray-50 text-gray-700'
                      }`}
                    >
                      {curr.label}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );

  const handleAddressSelect = (result: GeocodingResult) => {
    setLatitude(result.latitude);
    setLongitude(result.longitude);
    setAddressSelected(true);

    // Populate address fields from geocoding result
    if (result.address) {
      if (result.address.street) setStreet(result.address.street);
      if (result.address.city) setCity(result.address.city);
      if (result.address.state) setState(result.address.state);
      if (result.address.postalCode) setPostalCode(result.address.postalCode);
      // Convert full country name to code if possible
      const countryCode = result.address.country?.toUpperCase().substring(0, 2) || 'IT';
      setCountry(countryCode);
    }
  };

  const renderContactStep = () => (
    <div className="space-y-6">
      <div className="text-center mb-8">
        <h2 className="text-3xl font-bold text-gray-900 mb-3">Contact Information</h2>
        <p className="text-gray-600">How can customers reach you?</p>
      </div>

      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Phone number
              {validationErrors.phone && <span className="text-red-600 text-xs ml-2">{validationErrors.phone}</span>}
            </label>
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className={`w-full px-4 py-3 border-2 rounded-xl focus:ring-2 focus:ring-teal-500 focus:border-transparent transition-colors ${
                validationErrors.phone ? 'border-red-300 bg-red-50' : 'border-gray-300'
              }`}
              placeholder="+390552345678"
            />
            <p className="text-xs text-gray-500 mt-1">International format recommended</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Website (optional)
              {validationErrors.website && <span className="text-red-600 text-xs ml-2">{validationErrors.website}</span>}
            </label>
            <input
              type="url"
              value={website}
              onChange={(e) => setWebsite(e.target.value)}
              className={`w-full px-4 py-3 border-2 rounded-xl focus:ring-2 focus:ring-teal-500 focus:border-transparent transition-colors ${
                validationErrors.website ? 'border-red-300 bg-red-50' : 'border-gray-300'
              }`}
              placeholder="https://example.com"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Business Address
            {validationErrors.address && <span className="text-red-600 text-xs ml-2">{validationErrors.address}</span>}
          </label>

          {!addressSelected && (
            <div className="mb-3 p-3 bg-blue-50 border border-blue-200 rounded-xl">
              <div className="flex items-start gap-2">
                <svg className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <p className="text-sm text-blue-900">
                  Type your address below and select it from the dropdown. This will automatically fill in all fields and set your map location for customer discovery.
                </p>
              </div>
            </div>
          )}

          <AddressAutocomplete
            onAddressSelect={handleAddressSelect}
            placeholder="Start typing your business address in Italy..."
            showCoordinatesPreview={true}
            className="mb-2"
          />

          {addressSelected && latitude && longitude && (
            <div className="mt-2 p-3 bg-green-50 border border-green-200 rounded-lg">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <div>
                    <p className="text-sm font-medium text-green-900">Location set successfully</p>
                    <p className="text-xs text-green-700">{latitude.toFixed(6)}, {longitude.toFixed(6)}</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setShowMapPreview(true)}
                  className="px-3 py-1.5 bg-white border border-green-300 text-green-700 rounded-lg text-sm font-medium hover:bg-green-50 transition-colors flex items-center gap-1"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
                  </svg>
                  View Map
                </button>
              </div>
            </div>
          )}

          <p className="text-xs text-gray-500 mt-2">
            Currently optimized for Italian addresses. Worldwide support coming soon.
          </p>
        </div>

        {/* Manual address fields (auto-populated from geocoding) */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Street
              {validationErrors.street && <span className="text-red-600 text-xs ml-2">{validationErrors.street}</span>}
            </label>
            <input
              type="text"
              value={street}
              onChange={(e) => setStreet(e.target.value)}
              className={`w-full px-4 py-3 border-2 rounded-xl focus:ring-2 focus:ring-teal-500 focus:border-transparent transition-colors ${
                validationErrors.street ? 'border-red-300 bg-red-50' : 'border-gray-300'
              }`}
              placeholder="Via dei Servi 45"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              City
              {validationErrors.city && <span className="text-red-600 text-xs ml-2">{validationErrors.city}</span>}
            </label>
            <input
              type="text"
              value={city}
              onChange={(e) => setCity(e.target.value)}
              className={`w-full px-4 py-3 border-2 rounded-xl focus:ring-2 focus:ring-teal-500 focus:border-transparent transition-colors ${
                validationErrors.city ? 'border-red-300 bg-red-50' : 'border-gray-300'
              }`}
              placeholder="Firenze"
            />
          </div>
        </div>

        <div className="grid grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              State/Province
              {validationErrors.state && <span className="text-red-600 text-xs ml-2">{validationErrors.state}</span>}
            </label>
            <input
              type="text"
              value={state}
              onChange={(e) => setState(e.target.value)}
              className={`w-full px-4 py-3 border-2 rounded-xl focus:ring-2 focus:ring-teal-500 focus:border-transparent transition-colors ${
                validationErrors.state ? 'border-red-300 bg-red-50' : 'border-gray-300'
              }`}
              placeholder="Toscana"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Postal Code
              {validationErrors.postalCode && <span className="text-red-600 text-xs ml-2">{validationErrors.postalCode}</span>}
            </label>
            <input
              type="text"
              value={postalCode}
              onChange={(e) => setPostalCode(e.target.value)}
              className={`w-full px-4 py-3 border-2 rounded-xl focus:ring-2 focus:ring-teal-500 focus:border-transparent transition-colors ${
                validationErrors.postalCode ? 'border-red-300 bg-red-50' : 'border-gray-300'
              }`}
              placeholder="50122"
            />
          </div>

          <div className="relative">
            <label className="block text-sm font-medium text-gray-700 mb-2">Country</label>
            <button
              type="button"
              onClick={() => setCountryOpen(!countryOpen)}
              className="w-full px-4 py-3 border-2 border-gray-200 rounded-2xl bg-white text-gray-900 font-medium transition-all hover:border-gray-300 flex items-center justify-between"
            >
              <span className="text-sm">
                {{
                  IT: 'Italy',
                  FR: 'France',
                  DE: 'Germany',
                  ES: 'Spain',
                  GB: 'UK',
                  NL: 'Netherlands',
                  BE: 'Belgium',
                  AT: 'Austria',
                  CH: 'Switzerland',
                  GR: 'Greece',
                  PT: 'Portugal',
                  IE: 'Ireland',
                  PL: 'Poland',
                  SE: 'Sweden',
                  NO: 'Norway',
                  DK: 'Denmark',
                  FI: 'Finland',
                  US: 'USA',
                  CA: 'Canada',
                  MX: 'Mexico',
                }[country]}
              </span>
              <svg className={`w-4 h-4 text-gray-500 transition-transform ${countryOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>
            {countryOpen && (
              <div className="absolute z-50 w-full mt-2 bg-white border-2 border-gray-200 rounded-2xl shadow-lg max-h-48 overflow-y-auto">
                <div className="p-2">
                  {[
                    { value: 'IT', label: 'Italy' },
                    { value: 'FR', label: 'France' },
                    { value: 'DE', label: 'Germany' },
                    { value: 'ES', label: 'Spain' },
                    { value: 'GB', label: 'United Kingdom' },
                    { value: 'US', label: 'United States' },
                  ].map((c) => (
                    <button
                      key={c.value}
                      type="button"
                      onClick={() => {
                        setCountry(c.value);
                        setCountryOpen(false);
                      }}
                      className={`w-full text-left px-3 py-2 rounded-xl transition-all text-sm ${
                        country === c.value
                          ? 'bg-teal-50 text-teal-900 font-semibold'
                          : 'hover:bg-gray-50 text-gray-700'
                      }`}
                    >
                      {c.label}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );

  const renderBrandingStep = () => (
    <div className="space-y-6">
      <div className="text-center mb-8">
        <h2 className="text-3xl font-bold text-gray-900 mb-3">Branding</h2>
        <p className="text-gray-600">Customize your booking page appearance</p>
      </div>

      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Primary color</label>
            <div className="flex gap-3 items-center">
              <input
                type="color"
                value={primaryColor}
                onChange={(e) => setPrimaryColor(e.target.value)}
                className="h-12 w-20 rounded-xl border border-gray-300"
              />
              <input
                type="text"
                value={primaryColor}
                onChange={(e) => setPrimaryColor(e.target.value)}
                className="flex-1 px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                placeholder="#10b981"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Secondary color</label>
            <div className="flex gap-3 items-center">
              <input
                type="color"
                value={secondaryColor}
                onChange={(e) => setSecondaryColor(e.target.value)}
                className="h-12 w-20 rounded-xl border border-gray-300"
              />
              <input
                type="text"
                value={secondaryColor}
                onChange={(e) => setSecondaryColor(e.target.value)}
                className="flex-1 px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                placeholder="#14b8a6"
              />
            </div>
          </div>
        </div>

        <div className="p-6 border-2 border-gray-200 rounded-2xl bg-gray-50">
          <p className="text-sm font-medium text-gray-700 mb-4">Preview</p>
          <div className="bg-white rounded-xl p-6 space-y-3">
            <div
              className="h-12 rounded-xl flex items-center justify-center text-white font-semibold"
              style={{ background: `linear-gradient(to right, ${primaryColor}, ${secondaryColor})` }}
            >
              Book Appointment
            </div>
            <div className="flex gap-2">
              <div className="flex-1 h-8 rounded-lg" style={{ backgroundColor: primaryColor + '20' }} />
              <div className="flex-1 h-8 rounded-lg" style={{ backgroundColor: secondaryColor + '20' }} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  const renderServicesStep = () => (
    <div className="space-y-6">
      <div className="text-center mb-8">
        <h2 className="text-3xl font-bold text-gray-900 mb-3">Services</h2>
        <p className="text-gray-600">What services do you offer?</p>
      </div>

      {validationErrors.services && (
        <div className="p-4 bg-red-50 border-2 border-red-200 rounded-xl">
          <p className="text-sm font-semibold text-red-900">{validationErrors.services}</p>
        </div>
      )}

      <ServiceBuilder categories={categories} onChange={setCategories} />

      <div className="text-center text-sm text-gray-500 bg-gray-50 border border-gray-200 rounded-xl p-4">
        You can skip this step and add services later in your dashboard
      </div>
    </div>
  );

  const addTimeSlot = (dayIndex: number) => {
    const newAvailability = [...availability];
    newAvailability[dayIndex].slots.push({ open: '14:00', close: '18:00' });
    setAvailability(newAvailability);
  };

  const removeTimeSlot = (dayIndex: number, slotIndex: number) => {
    const newAvailability = [...availability];
    if (newAvailability[dayIndex].slots.length > 1) {
      newAvailability[dayIndex].slots.splice(slotIndex, 1);
      setAvailability(newAvailability);
    }
  };

  const switchToAdvanced = () => {
    // Convert simple mode to advanced mode
    const newAvailability = availability.map((day) => {
      if (['monday', 'tuesday', 'wednesday', 'thursday', 'friday'].includes(day.day)) {
        return {
          ...day,
          enabled: simpleAvailability.weekdaysEnabled,
          slots: [{ open: simpleAvailability.weekdayStart, close: simpleAvailability.weekdayEnd }],
        };
      } else if (day.day === 'saturday') {
        return {
          ...day,
          enabled: simpleAvailability.saturdayEnabled,
          slots: [{ open: simpleAvailability.saturdayStart, close: simpleAvailability.saturdayEnd }],
        };
      } else {
        return {
          ...day,
          enabled: simpleAvailability.sundayEnabled,
          slots: [{ open: simpleAvailability.sundayStart, close: simpleAvailability.sundayEnd }],
        };
      }
    });
    setAvailability(newAvailability);
    setAvailabilityMode('advanced');
  };

  const getAvailabilityForSubmit = () => {
    if (availabilityMode === 'simple') {
      return availability.map((day) => {
        if (['monday', 'tuesday', 'wednesday', 'thursday', 'friday'].includes(day.day)) {
          return {
            ...day,
            enabled: simpleAvailability.weekdaysEnabled,
            slots: [{ open: simpleAvailability.weekdayStart, close: simpleAvailability.weekdayEnd }],
          };
        } else if (day.day === 'saturday') {
          return {
            ...day,
            enabled: simpleAvailability.saturdayEnabled,
            slots: [{ open: simpleAvailability.saturdayStart, close: simpleAvailability.saturdayEnd }],
          };
        } else {
          return {
            ...day,
            enabled: simpleAvailability.sundayEnabled,
            slots: [{ open: simpleAvailability.sundayStart, close: simpleAvailability.sundayEnd }],
          };
        }
      });
    }
    return availability;
  };

  const renderAvailabilityStep = () => (
    <div className="space-y-6">
      <div className="text-center mb-8">
        <h2 className="text-3xl font-bold text-gray-900 mb-3">Availability</h2>
        <p className="text-gray-600">When are you open for bookings?</p>
      </div>

      {/* Mode Toggle */}
      <div className="flex gap-2 bg-gray-100 p-1 rounded-2xl mb-6">
        <button
          type="button"
          onClick={() => setAvailabilityMode('simple')}
          className={`flex-1 px-6 py-2 rounded-xl text-sm font-semibold transition-all ${
            availabilityMode === 'simple' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-900'
          }`}
        >
          Simple Setup
        </button>
        <button
          type="button"
          onClick={switchToAdvanced}
          className={`flex-1 px-6 py-2 rounded-xl text-sm font-semibold transition-all ${
            availabilityMode === 'advanced' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-900'
          }`}
        >
          Advanced (per day)
        </button>
      </div>

      {availabilityMode === 'simple' ? (
        /* Simple Mode */
        <div className="space-y-4">
          {/* Weekdays */}
          <div className="border-2 border-gray-200 rounded-2xl p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-base font-semibold text-gray-900">Monday - Friday</h3>
                <p className="text-sm text-gray-500">Set hours for all weekdays</p>
              </div>
              <label className="flex items-center gap-3">
                <input
                  type="checkbox"
                  checked={simpleAvailability.weekdaysEnabled}
                  onChange={(e) => setSimpleAvailability({ ...simpleAvailability, weekdaysEnabled: e.target.checked })}
                  className="w-5 h-5 rounded-md border-2 border-gray-300 text-teal-600 focus:ring-2 focus:ring-teal-500 focus:ring-offset-0 transition-all"
                />
                <span className="text-sm font-medium text-gray-700">Open</span>
              </label>
            </div>
            {simpleAvailability.weekdaysEnabled && (
              <div className="flex items-center gap-3">
                <input
                  type="time"
                  value={simpleAvailability.weekdayStart}
                  onChange={(e) => setSimpleAvailability({ ...simpleAvailability, weekdayStart: e.target.value })}
                  className="flex-1 px-4 py-3 border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-teal-500 focus:border-transparent text-sm font-medium"
                />
                <span className="text-gray-500 text-sm font-medium">to</span>
                <input
                  type="time"
                  value={simpleAvailability.weekdayEnd}
                  onChange={(e) => setSimpleAvailability({ ...simpleAvailability, weekdayEnd: e.target.value })}
                  className="flex-1 px-4 py-3 border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-teal-500 focus:border-transparent text-sm font-medium"
                />
              </div>
            )}
          </div>

          {/* Saturday */}
          <div className="border-2 border-gray-200 rounded-2xl p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-base font-semibold text-gray-900">Saturday</h3>
                <p className="text-sm text-gray-500">Weekend hours</p>
              </div>
              <label className="flex items-center gap-3">
                <input
                  type="checkbox"
                  checked={simpleAvailability.saturdayEnabled}
                  onChange={(e) => setSimpleAvailability({ ...simpleAvailability, saturdayEnabled: e.target.checked })}
                  className="w-5 h-5 rounded-md border-2 border-gray-300 text-teal-600 focus:ring-2 focus:ring-teal-500 focus:ring-offset-0 transition-all"
                />
                <span className="text-sm font-medium text-gray-700">Open</span>
              </label>
            </div>
            {simpleAvailability.saturdayEnabled && (
              <div className="flex items-center gap-3">
                <input
                  type="time"
                  value={simpleAvailability.saturdayStart}
                  onChange={(e) => setSimpleAvailability({ ...simpleAvailability, saturdayStart: e.target.value })}
                  className="flex-1 px-4 py-3 border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-teal-500 focus:border-transparent text-sm font-medium"
                />
                <span className="text-gray-500 text-sm font-medium">to</span>
                <input
                  type="time"
                  value={simpleAvailability.saturdayEnd}
                  onChange={(e) => setSimpleAvailability({ ...simpleAvailability, saturdayEnd: e.target.value })}
                  className="flex-1 px-4 py-3 border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-teal-500 focus:border-transparent text-sm font-medium"
                />
              </div>
            )}
          </div>

          {/* Sunday */}
          <div className="border-2 border-gray-200 rounded-2xl p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-base font-semibold text-gray-900">Sunday</h3>
                <p className="text-sm text-gray-500">Weekend hours</p>
              </div>
              <label className="flex items-center gap-3">
                <input
                  type="checkbox"
                  checked={simpleAvailability.sundayEnabled}
                  onChange={(e) => setSimpleAvailability({ ...simpleAvailability, sundayEnabled: e.target.checked })}
                  className="w-5 h-5 rounded-md border-2 border-gray-300 text-teal-600 focus:ring-2 focus:ring-teal-500 focus:ring-offset-0 transition-all"
                />
                <span className="text-sm font-medium text-gray-700">Open</span>
              </label>
            </div>
            {simpleAvailability.sundayEnabled && (
              <div className="flex items-center gap-3">
                <input
                  type="time"
                  value={simpleAvailability.sundayStart}
                  onChange={(e) => setSimpleAvailability({ ...simpleAvailability, sundayStart: e.target.value })}
                  className="flex-1 px-4 py-3 border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-teal-500 focus:border-transparent text-sm font-medium"
                />
                <span className="text-gray-500 text-sm font-medium">to</span>
                <input
                  type="time"
                  value={simpleAvailability.sundayEnd}
                  onChange={(e) => setSimpleAvailability({ ...simpleAvailability, sundayEnd: e.target.value })}
                  className="flex-1 px-4 py-3 border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-teal-500 focus:border-transparent text-sm font-medium"
                />
              </div>
            )}
          </div>

          <div className="text-center text-sm text-gray-500 bg-gray-50 border border-gray-200 rounded-xl p-4">
            Need different hours for each day or lunch breaks? Switch to <strong>Advanced mode</strong>.
          </div>
        </div>
      ) : (
        /* Advanced Mode */
        <div className="space-y-3">
          {availability?.map((day, dayIndex) => (
            <div key={day.day} className="border-2 border-gray-200 rounded-2xl overflow-hidden">
              {/* Day header */}
              <div className="flex items-center gap-4 p-4 bg-gray-50">
                <div className="w-28">
                  <span className="text-sm font-semibold text-gray-900 capitalize">{day.day}</span>
                </div>
                <label className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    checked={day.enabled}
                    onChange={(e) => {
                      const newAvailability = [...availability];
                      newAvailability[dayIndex].enabled = e.target.checked;
                      setAvailability(newAvailability);
                    }}
                    className="w-5 h-5 rounded-md border-2 border-gray-300 text-teal-600 focus:ring-2 focus:ring-teal-500 focus:ring-offset-0 transition-all"
                  />
                  <span className="text-sm font-medium text-gray-700">Open</span>
                </label>
              </div>

              {/* Time slots */}
              {day.enabled && (
                <div className="p-4 space-y-3">
                  {day.slots.map((slot, slotIndex) => (
                    <div key={slotIndex} className="flex items-center gap-3">
                      <div className="flex items-center gap-3 flex-1">
                        <div className="flex items-center gap-2">
                          <input
                            type="time"
                            value={slot.open}
                            onChange={(e) => {
                              const newAvailability = [...availability];
                              newAvailability[dayIndex].slots[slotIndex].open = e.target.value;
                              setAvailability(newAvailability);
                            }}
                            className="px-3 py-2 border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-teal-500 focus:border-transparent text-sm font-medium"
                          />
                          <span className="text-gray-500 text-sm">to</span>
                          <input
                            type="time"
                            value={slot.close}
                            onChange={(e) => {
                              const newAvailability = [...availability];
                              newAvailability[dayIndex].slots[slotIndex].close = e.target.value;
                              setAvailability(newAvailability);
                            }}
                            className="px-3 py-2 border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-teal-500 focus:border-transparent text-sm font-medium"
                          />
                        </div>
                        {slotIndex > 0 && (
                          <span className="text-xs text-gray-500 ml-2">
                            (Break shift)
                          </span>
                        )}
                      </div>
                      {day.slots.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removeTimeSlot(dayIndex, slotIndex)}
                          className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-600 transition-all"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      )}
                    </div>
                  ))}

                  {/* Add break button */}
                  <button
                    type="button"
                    onClick={() => addTimeSlot(dayIndex)}
                    className="w-full px-4 py-2 border-2 border-dashed border-gray-300 rounded-xl text-xs font-semibold text-gray-500 hover:border-teal-500 hover:text-teal-600 hover:bg-teal-50 transition-all flex items-center justify-center gap-2"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                    </svg>
                    Add break (split shift)
                  </button>
                </div>
              )}
            </div>
          ))}

          <div className="text-center text-sm text-gray-500 bg-blue-50 border border-blue-200 rounded-xl p-4">
            <p className="font-medium text-blue-900 mb-1">Tip: Add breaks for lunch or split shifts</p>
            <p className="text-blue-700">For example: 9:00-13:00 and 14:00-18:00 for a lunch break</p>
          </div>
        </div>
      )}
    </div>
  );

  const renderRulesStep = () => (
    <div className="space-y-6">
      <div className="text-center mb-8">
        <h2 className="text-3xl font-bold text-gray-900 mb-3">Booking Rules</h2>
        <p className="text-gray-600">Configure how bookings work for your business</p>
      </div>

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Time slot duration (minutes)
            {validationErrors.timeSlotDuration && (
              <span className="text-red-600 text-xs ml-2">{validationErrors.timeSlotDuration}</span>
            )}
          </label>
          <input
            type="number"
            value={timeSlotDuration}
            onChange={(e) => setTimeSlotDuration(Number(e.target.value))}
            min={5}
            max={480}
            step={5}
            className={`w-full px-4 py-3 border-2 rounded-xl focus:ring-2 focus:ring-teal-500 focus:border-transparent transition-colors ${
              validationErrors.timeSlotDuration ? 'border-red-300 bg-red-50' : 'border-gray-300'
            }`}
          />
          <p className="text-sm text-gray-500 mt-1">
            How often time slots appear in your calendar (e.g., 30 = slots every 30 minutes). Must be a multiple of 5.
          </p>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Max simultaneous bookings per slot
            {validationErrors.maxSimultaneousBookings && (
              <span className="text-red-600 text-xs ml-2">{validationErrors.maxSimultaneousBookings}</span>
            )}
          </label>
          <input
            type="number"
            value={maxSimultaneousBookings}
            onChange={(e) => setMaxSimultaneousBookings(Number(e.target.value))}
            min={1}
            max={100}
            className={`w-full px-4 py-3 border-2 rounded-xl focus:ring-2 focus:ring-teal-500 focus:border-transparent transition-colors ${
              validationErrors.maxSimultaneousBookings ? 'border-red-300 bg-red-50' : 'border-gray-300'
            }`}
          />
          <p className="text-sm text-gray-500 mt-1">
            How many customers can book the same time slot (useful for group classes or multiple staff members). Can be customized per service later.
          </p>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Advance booking window (days)
            {validationErrors.advanceBookingDays && (
              <span className="text-red-600 text-xs ml-2">{validationErrors.advanceBookingDays}</span>
            )}
          </label>
          <input
            type="number"
            value={advanceBookingDays}
            onChange={(e) => setAdvanceBookingDays(Number(e.target.value))}
            min={1}
            max={365}
            className={`w-full px-4 py-3 border-2 rounded-xl focus:ring-2 focus:ring-teal-500 focus:border-transparent transition-colors ${
              validationErrors.advanceBookingDays ? 'border-red-300 bg-red-50' : 'border-gray-300'
            }`}
          />
          <p className="text-sm text-gray-500 mt-1">
            Maximum days in the future customers can book (e.g., 30 = customers can book up to 30 days ahead)
          </p>
        </div>

        <div className="pt-4 border-t border-gray-200">
          <p className="text-sm font-medium text-gray-700 mb-3">Customer requirements</p>
          <div className="space-y-2">
            <label className="flex items-center gap-3">
              <input
                type="checkbox"
                checked={requireEmail}
                onChange={(e) => setRequireEmail(e.target.checked)}
                className="w-5 h-5 rounded-md border-2 border-gray-300 text-teal-600 focus:ring-2 focus:ring-teal-500 focus:ring-offset-0 transition-all"
              />
              <span className="text-sm font-medium text-gray-700">Require email address</span>
            </label>
            <label className="flex items-center gap-3">
              <input
                type="checkbox"
                checked={requirePhone}
                onChange={(e) => setRequirePhone(e.target.checked)}
                className="w-5 h-5 rounded-md border-2 border-gray-300 text-teal-600 focus:ring-2 focus:ring-teal-500 focus:ring-offset-0 transition-all"
              />
              <span className="text-sm font-medium text-gray-700">Require phone number</span>
            </label>
            <label className="flex items-center gap-3">
              <input
                type="checkbox"
                checked={allowGuestBooking}
                onChange={(e) => setAllowGuestBooking(e.target.checked)}
                className="w-5 h-5 rounded-md border-2 border-gray-300 text-teal-600 focus:ring-2 focus:ring-teal-500 focus:ring-offset-0 transition-all"
              />
              <span className="text-sm font-medium text-gray-700">Allow guest booking (no account required)</span>
            </label>
          </div>
        </div>
      </div>
    </div>
  );

  const renderDetailsStep = () => (
    <div className="space-y-6">
      <div className="text-center mb-8">
        <h2 className="text-3xl font-bold text-gray-900 mb-3">Additional Details</h2>
        <p className="text-gray-600">Optional settings you can modify later in the dashboard</p>
      </div>

      <div className="space-y-6">
        {/* Booking Policies */}
        <div className="border-2 border-gray-200 rounded-2xl p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Booking Policies</h3>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Minimum advance booking time (minutes)
              </label>
              <input
                type="number"
                value={minAdvanceBookingMinutes}
                onChange={(e) => setMinAdvanceBookingMinutes(Number(e.target.value))}
                min={0}
                step={15}
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-teal-500 focus:border-transparent"
              />
              <p className="text-sm text-gray-500 mt-1">How far in advance customers must book (e.g., 60 = 1 hour)</p>
            </div>
          </div>
        </div>

        {/* Notifications */}
        <div className="border-2 border-gray-200 rounded-2xl p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Notifications</h3>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Send reminder email (hours before appointment)
            </label>
            <input
              type="number"
              value={reminderHoursBefore}
              onChange={(e) => setReminderHoursBefore(Number(e.target.value))}
              min={0}
              step={1}
              className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-teal-500 focus:border-transparent"
            />
          </div>
        </div>

        <div className="text-center text-sm text-gray-500 bg-gray-50 border border-gray-200 rounded-xl p-4">
          You can skip this step and modify these settings later in your dashboard
        </div>
      </div>
    </div>
  );

  const renderReviewStep = () => (
    <div className="space-y-6">
      <div className="text-center mb-8">
        <h2 className="text-3xl font-bold text-gray-900 mb-3">Review & Submit</h2>
        <p className="text-gray-600">Check your information before creating your business</p>
      </div>

      <div className="space-y-4">
        <div className="bg-gray-50 border border-gray-200 rounded-xl p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Business Details</h3>
          <dl className="space-y-2 text-sm">
            <div className="flex justify-between">
              <dt className="text-gray-600">Business name:</dt>
              <dd className="font-medium text-gray-900">{businessName || '—'}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-gray-600">Subdomain:</dt>
              <dd className="font-medium text-gray-900">{businessId ? `${businessId}.rivo.app` : '—'}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-gray-600">Timezone:</dt>
              <dd className="font-medium text-gray-900">{timezone}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-gray-600">Currency:</dt>
              <dd className="font-medium text-gray-900">{currency}</dd>
            </div>
          </dl>
        </div>

        <div className="bg-gray-50 border border-gray-200 rounded-xl p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Contact</h3>
          <dl className="space-y-2 text-sm">
            <div className="flex justify-between">
              <dt className="text-gray-600">Phone:</dt>
              <dd className="font-medium text-gray-900">{phone || '—'}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-gray-600">Location:</dt>
              <dd className="font-medium text-gray-900">
                {city && state ? `${city}, ${state}` : '—'}
              </dd>
            </div>
          </dl>
        </div>

        {categories.length > 0 && (
          <div className="bg-gray-50 border border-gray-200 rounded-xl p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Services</h3>
            <div className="space-y-3">
              {categories.map((category) => (
                <div key={category.id}>
                  <p className="text-sm font-semibold text-gray-900">{category.name}</p>
                  <ul className="mt-1 space-y-1">
                    {category.services.map((service) => (
                      <li key={service.id} className="text-sm text-gray-600 flex items-center gap-2">
                        {service.color && (
                          <div className="w-2 h-2 rounded-full" style={{ backgroundColor: service.color }} />
                        )}
                        {service.name} — {service.duration}min — €{service.price.toFixed(2)}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="bg-gray-50 border border-gray-200 rounded-xl p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Booking Settings</h3>
          <dl className="space-y-2 text-sm">
            <div className="flex justify-between">
              <dt className="text-gray-600">Time slot duration:</dt>
              <dd className="font-medium text-gray-900">{timeSlotDuration} minutes</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-gray-600">Advance booking:</dt>
              <dd className="font-medium text-gray-900">{advanceBookingDays} days</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-gray-600">Open days:</dt>
              <dd className="font-medium text-gray-900">
                {getAvailabilityForSubmit().filter(d => d.enabled).length} days/week
              </dd>
            </div>
            {availabilityMode === 'advanced' && (
              <div className="flex justify-between">
                <dt className="text-gray-600">Split shifts:</dt>
                <dd className="font-medium text-gray-900">
                  {availability.filter(d => d.enabled && d.slots.length > 1).length} days
                </dd>
              </div>
            )}
          </dl>
        </div>
      </div>
    </div>
  );

  const renderStep = () => {
    switch (currentStep) {
      case 'auth': return renderAuthStep();
      case 'business': return renderBusinessStep();
      case 'contact': return renderContactStep();
      case 'branding': return renderBrandingStep();
      case 'services': return renderServicesStep();
      case 'availability': return renderAvailabilityStep();
      case 'rules': return renderRulesStep();
      case 'details': return renderDetailsStep();
      case 'review': return renderReviewStep();
    }
  };

  const handleSubmit = async () => {
    setLoading(true);
    setError(null);

    try {
      // Convert euros to cents for services
      const categoriesWithCents = categories.map(category => ({
        ...category,
        services: category.services.map(service => ({
          ...service,
          price: Math.round(service.price * 100), // Convert euros to cents
        })),
      }));

      const formData = {
        // Auth
        email,
        password: authMode === 'signup' ? password : password || undefined,
        ownerName,

        // Business
        businessName,
        businessId,
        description,
        timezone,
        currency,

        // Contact
        phone,
        street,
        city,
        state,
        postalCode,
        country,
        website,
        latitude,
        longitude,

        // Branding
        primaryColor,
        secondaryColor,

        // Services (with prices in cents)
        categories: categoriesWithCents,

        // Availability (get the correct data based on mode)
        availability: getAvailabilityForSubmit(),

        // Booking rules
        timeSlotDuration,
        maxSimultaneousBookings,
        advanceBookingDays,
        requireEmail,
        requirePhone,
        allowGuestBooking,

        // Additional details
        minAdvanceBookingMinutes,
        maxBookingsPerCustomerPerDay,
        cancellationDeadlineHours,
        rescheduleDeadlineHours,
        refundPolicy,
        partialRefundPercentage,
        reminderHoursBefore,
        parkingAvailable,
        wheelchairAccessible,
        acceptsWalkIns,
      };

      console.log('Submitting business registration...', formData);
      console.log('Availability:', availability);

      const response = await fetch('/api/onboard/self-service', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        // Handle errors
        if (result.requiresAuth) {
          setError('An account with this email already exists. Please enter your password to continue.');
          setCurrentStep('auth');
        } else if (result.errors) {
          // Display first error
          const firstError = typeof result.errors === 'object'
            ? Object.values(result.errors)[0]
            : result.errors;
          setError(String(firstError));
        } else {
          setError('Failed to register business. Please try again.');
        }
        return;
      }

      // Success! Redirect based on whether it's a new or existing owner
      if (result.isExistingOwner) {
        // Existing owner - go to dashboard
        router.push('/dashboard');
      } else {
        // New owner - show verification message
        alert(`Success! Please check your email (${email}) to verify your account. Verification link: ${result.verificationUrl}`);
        router.push('/auth/login');
      }
    } catch (err: any) {
      console.error('Submission error:', err);
      setError(err?.message || 'Failed to register business. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const currentStepIndex = steps.indexOf(currentStep);
  const progress = ((currentStepIndex + 1) / steps.length) * 100;

  return (
    <div className="min-h-screen bg-white">
      {/* Progress bar */}
      <div className="fixed top-0 left-0 right-0 h-1 bg-gray-200 z-50">
        <div
          className="h-full bg-gradient-to-r from-teal-600 to-green-600 transition-all duration-300"
          style={{ width: `${progress}%` }}
        />
      </div>

      <div className="max-w-3xl mx-auto px-6 py-12">
        {/* Logo */}
        <div className="text-center mb-12 pt-8">
          <div className="inline-flex items-center mb-8">
            <Logo size="sm" />
          </div>
        </div>

        {/* Step content */}
        <div className="bg-white border-2 border-gray-200 rounded-3xl p-8 md:p-12">
          {/* Validation errors summary */}
          {Object.keys(validationErrors).length > 0 && (
            <div className="mb-6 p-4 bg-red-50 border-2 border-red-200 rounded-xl">
              <div className="flex items-start gap-3">
                <svg className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <div className="flex-1">
                  <h3 className="text-sm font-semibold text-red-900 mb-1">Please fix the following errors:</h3>
                  <ul className="text-sm text-red-700 space-y-1">
                    {Object.entries(validationErrors).map(([field, error]) => (
                      <li key={field}>• {error}</li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          )}

          {renderStep()}

          {error && (
            <div className="mt-6 p-4 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">
              {error}
            </div>
          )}

          {/* Navigation */}
          <div className="flex items-center justify-between gap-4 mt-8 pt-8 border-t border-gray-200">
            {currentStepIndex > 0 ? (
              <button
                onClick={handleBack}
                className="px-6 py-3 text-gray-700 font-semibold hover:bg-gray-50 rounded-xl transition-all"
              >
                Back
              </button>
            ) : (
              <div />
            )}

            {currentStepIndex < steps.length - 1 ? (
              <button
                onClick={handleNext}
                className="px-6 py-3 bg-gradient-to-r from-teal-600 to-green-600 text-white rounded-2xl font-semibold hover:shadow-lg hover:scale-[1.02] transition-all"
              >
                Continue
              </button>
            ) : (
              <button
                onClick={handleSubmit}
                disabled={loading}
                className="px-6 py-3 bg-gradient-to-r from-teal-600 to-green-600 text-white rounded-2xl font-semibold hover:shadow-lg hover:scale-[1.02] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Creating...' : 'Create Business'}
              </button>
            )}
          </div>

          {/* Step indicator */}
          <div className="flex justify-center gap-2 mt-6">
            {steps.map((step, index) => (
              <div
                key={step}
                className={`h-2 rounded-full transition-all ${
                  index === currentStepIndex
                    ? 'w-8 bg-gradient-to-r from-teal-600 to-green-600'
                    : index < currentStepIndex
                    ? 'w-2 bg-gray-400'
                    : 'w-2 bg-gray-200'
                }`}
              />
            ))}
          </div>
        </div>
      </div>

      {/* Map Preview Modal */}
      {showMapPreview && latitude && longitude && (
        <LocationMapPreview
          latitude={latitude}
          longitude={longitude}
          businessName={businessName}
          address={`${street}, ${city}, ${state}`}
          onClose={() => setShowMapPreview(false)}
        />
      )}
    </div>
  );
}
