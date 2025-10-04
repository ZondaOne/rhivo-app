"use client";

import { useState } from 'react';
import { useRouter } from 'next/navigation';

type OnboardingStep = 'auth' | 'business' | 'contact' | 'branding' | 'services' | 'availability' | 'rules' | 'details' | 'review';

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

  // Branding
  const [primaryColor, setPrimaryColor] = useState('#10b981');
  const [secondaryColor, setSecondaryColor] = useState('#14b8a6');

  // Dropdown states
  const [timezoneOpen, setTimezoneOpen] = useState(false);
  const [currencyOpen, setCurrencyOpen] = useState(false);
  const [countryOpen, setCountryOpen] = useState(false);

  // Services
  const [categories, setCategories] = useState<any[]>([]);

  // Availability
  const [availability, setAvailability] = useState([
    { day: 'monday', open: '09:00', close: '17:00', enabled: true },
    { day: 'tuesday', open: '09:00', close: '17:00', enabled: true },
    { day: 'wednesday', open: '09:00', close: '17:00', enabled: true },
    { day: 'thursday', open: '09:00', close: '17:00', enabled: true },
    { day: 'friday', open: '09:00', close: '17:00', enabled: true },
    { day: 'saturday', open: '10:00', close: '14:00', enabled: false },
    { day: 'sunday', open: '10:00', close: '14:00', enabled: false },
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

  const handleNext = () => {
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
            <label className="block text-sm font-medium text-gray-700 mb-1">Your name</label>
            <input
              type="text"
              value={ownerName}
              onChange={(e) => setOwnerName(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-teal-500 focus:border-transparent"
              placeholder="John Doe"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email address</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-teal-500 focus:border-transparent"
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
              className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-teal-500 focus:border-transparent"
              placeholder="Min. 8 characters"
              required
            />
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email address</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-teal-500 focus:border-transparent"
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
              className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-teal-500 focus:border-transparent"
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
          <label className="block text-sm font-medium text-gray-700 mb-1">Business name</label>
          <input
            type="text"
            value={businessName}
            onChange={(e) => handleBusinessNameChange(e.target.value)}
            className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-teal-500 focus:border-transparent"
            placeholder="Bella Beauty Salon"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Subdomain
            <span className="text-gray-500 font-normal ml-2">(your booking page URL)</span>
          </label>
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={businessId}
              onChange={(e) => setBusinessId(e.target.value)}
              className="flex-1 px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-teal-500 focus:border-transparent"
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

  const renderContactStep = () => (
    <div className="space-y-6">
      <div className="text-center mb-8">
        <h2 className="text-3xl font-bold text-gray-900 mb-3">Contact Information</h2>
        <p className="text-gray-600">How can customers reach you?</p>
      </div>

      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Phone number</label>
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-teal-500 focus:border-transparent"
              placeholder="+1 234 567 8900"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Website</label>
            <input
              type="url"
              value={website}
              onChange={(e) => setWebsite(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-teal-500 focus:border-transparent"
              placeholder="https://example.com"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Street address</label>
          <input
            type="text"
            value={street}
            onChange={(e) => setStreet(e.target.value)}
            className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-teal-500 focus:border-transparent"
            placeholder="123 Main Street"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">City</label>
            <input
              type="text"
              value={city}
              onChange={(e) => setCity(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-teal-500 focus:border-transparent"
              placeholder="New York"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">State/Province</label>
            <input
              type="text"
              value={state}
              onChange={(e) => setState(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-teal-500 focus:border-transparent"
              placeholder="NY"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Postal code</label>
            <input
              type="text"
              value={postalCode}
              onChange={(e) => setPostalCode(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-teal-500 focus:border-transparent"
              placeholder="10001"
            />
          </div>

          <div className="relative">
            <label className="block text-sm font-medium text-gray-700 mb-2">Country</label>
            <button
              type="button"
              onClick={() => setCountryOpen(!countryOpen)}
              className="w-full px-4 py-3 border-2 border-gray-200 rounded-2xl bg-white text-gray-900 font-medium transition-all hover:border-gray-300 flex items-center justify-between"
            >
              <span>
                {{
                  IT: 'Italy',
                  FR: 'France',
                  DE: 'Germany',
                  ES: 'Spain',
                  GB: 'United Kingdom',
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
                  US: 'United States',
                  CA: 'Canada',
                  MX: 'Mexico',
                }[country]}
              </span>
              <svg className={`w-5 h-5 text-gray-500 transition-transform ${countryOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>
            {countryOpen && (
              <div className="absolute z-50 w-full mt-2 bg-white border-2 border-gray-200 rounded-2xl shadow-lg max-h-64 overflow-y-auto">
                <div className="p-2">
                  <div className="px-3 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wide">Europe</div>
                  {[
                    { value: 'IT', label: 'Italy' },
                    { value: 'FR', label: 'France' },
                    { value: 'DE', label: 'Germany' },
                    { value: 'ES', label: 'Spain' },
                    { value: 'GB', label: 'United Kingdom' },
                    { value: 'NL', label: 'Netherlands' },
                    { value: 'BE', label: 'Belgium' },
                    { value: 'AT', label: 'Austria' },
                    { value: 'CH', label: 'Switzerland' },
                    { value: 'GR', label: 'Greece' },
                    { value: 'PT', label: 'Portugal' },
                    { value: 'IE', label: 'Ireland' },
                    { value: 'PL', label: 'Poland' },
                    { value: 'SE', label: 'Sweden' },
                    { value: 'NO', label: 'Norway' },
                    { value: 'DK', label: 'Denmark' },
                    { value: 'FI', label: 'Finland' },
                  ].map((c) => (
                    <button
                      key={c.value}
                      type="button"
                      onClick={() => {
                        setCountry(c.value);
                        setCountryOpen(false);
                      }}
                      className={`w-full text-left px-3 py-2 rounded-xl transition-all ${
                        country === c.value
                          ? 'bg-teal-50 text-teal-900 font-semibold'
                          : 'hover:bg-gray-50 text-gray-700'
                      }`}
                    >
                      {c.label}
                    </button>
                  ))}
                  <div className="px-3 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wide mt-2">Americas</div>
                  {[
                    { value: 'US', label: 'United States' },
                    { value: 'CA', label: 'Canada' },
                    { value: 'MX', label: 'Mexico' },
                  ].map((c) => (
                    <button
                      key={c.value}
                      type="button"
                      onClick={() => {
                        setCountry(c.value);
                        setCountryOpen(false);
                      }}
                      className={`w-full text-left px-3 py-2 rounded-xl transition-all ${
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

      <div className="text-center py-12 border-2 border-dashed border-gray-300 rounded-2xl">
        <p className="text-gray-500 mb-4">Service builder coming soon</p>
        <p className="text-sm text-gray-400">You can skip this for now and add services later</p>
      </div>
    </div>
  );

  const renderAvailabilityStep = () => (
    <div className="space-y-6">
      <div className="text-center mb-8">
        <h2 className="text-3xl font-bold text-gray-900 mb-3">Availability</h2>
        <p className="text-gray-600">When are you open for bookings?</p>
      </div>

      <div className="space-y-3">
        {availability?.map((day, index) => (
          <div key={day.day} className="flex items-center gap-4 p-4 border border-gray-200 rounded-xl">
            <div className="w-32">
              <span className="text-sm font-medium text-gray-700 capitalize">{day.day}</span>
            </div>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={day.enabled}
                onChange={(e) => {
                  const newAvailability = [...availability];
                  newAvailability[index].enabled = e.target.checked;
                  setAvailability(newAvailability);
                }}
                className="w-5 h-5 rounded border-gray-300 text-teal-600 focus:ring-teal-500"
              />
              <span className="text-sm text-gray-600">Open</span>
            </label>
            {day.enabled && (
              <>
                <input
                  type="time"
                  value={day.open}
                  onChange={(e) => {
                    const newAvailability = [...availability];
                    newAvailability[index].open = e.target.value;
                    setAvailability(newAvailability);
                  }}
                  className="px-3 py-2 border border-gray-300 rounded-lg"
                />
                <span className="text-gray-500">to</span>
                <input
                  type="time"
                  value={day.close}
                  onChange={(e) => {
                    const newAvailability = [...availability];
                    newAvailability[index].close = e.target.value;
                    setAvailability(newAvailability);
                  }}
                  className="px-3 py-2 border border-gray-300 rounded-lg"
                />
              </>
            )}
          </div>
        ))}
      </div>
    </div>
  );

  const renderRulesStep = () => (
    <div className="space-y-6">
      <div className="text-center mb-8">
        <h2 className="text-3xl font-bold text-gray-900 mb-3">Booking Rules</h2>
        <p className="text-gray-600">Configure how bookings work</p>
      </div>

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Time slot duration (minutes)</label>
          <input
            type="number"
            value={timeSlotDuration}
            onChange={(e) => setTimeSlotDuration(Number(e.target.value))}
            min={15}
            max={120}
            step={15}
            className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-teal-500 focus:border-transparent"
          />
          <p className="text-sm text-gray-500 mt-1">How long is each booking slot?</p>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Max simultaneous bookings</label>
          <input
            type="number"
            value={maxSimultaneousBookings}
            onChange={(e) => setMaxSimultaneousBookings(Number(e.target.value))}
            min={1}
            max={10}
            className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-teal-500 focus:border-transparent"
          />
          <p className="text-sm text-gray-500 mt-1">How many appointments can overlap?</p>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Advance booking days</label>
          <input
            type="number"
            value={advanceBookingDays}
            onChange={(e) => setAdvanceBookingDays(Number(e.target.value))}
            min={1}
            max={365}
            className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-teal-500 focus:border-transparent"
          />
          <p className="text-sm text-gray-500 mt-1">How far in advance can customers book?</p>
        </div>

        <div className="pt-4 border-t border-gray-200">
          <p className="text-sm font-medium text-gray-700 mb-3">Customer requirements</p>
          <div className="space-y-2">
            <label className="flex items-center gap-3">
              <input
                type="checkbox"
                checked={requireEmail}
                onChange={(e) => setRequireEmail(e.target.checked)}
                className="w-5 h-5 rounded border-gray-300 text-teal-600 focus:ring-teal-500"
              />
              <span className="text-sm text-gray-700">Require email address</span>
            </label>
            <label className="flex items-center gap-3">
              <input
                type="checkbox"
                checked={requirePhone}
                onChange={(e) => setRequirePhone(e.target.checked)}
                className="w-5 h-5 rounded border-gray-300 text-teal-600 focus:ring-teal-500"
              />
              <span className="text-sm text-gray-700">Require phone number</span>
            </label>
            <label className="flex items-center gap-3">
              <input
                type="checkbox"
                checked={allowGuestBooking}
                onChange={(e) => setAllowGuestBooking(e.target.checked)}
                className="w-5 h-5 rounded border-gray-300 text-teal-600 focus:ring-teal-500"
              />
              <span className="text-sm text-gray-700">Allow guest booking (no account required)</span>
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

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Max bookings per customer per day
              </label>
              <input
                type="number"
                value={maxBookingsPerCustomerPerDay}
                onChange={(e) => setMaxBookingsPerCustomerPerDay(Number(e.target.value))}
                min={1}
                max={10}
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-teal-500 focus:border-transparent"
              />
            </div>
          </div>
        </div>

        {/* Cancellation & Rescheduling */}
        <div className="border-2 border-gray-200 rounded-2xl p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Cancellation & Rescheduling</h3>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Cancellation deadline (hours before)
              </label>
              <input
                type="number"
                value={cancellationDeadlineHours}
                onChange={(e) => setCancellationDeadlineHours(Number(e.target.value))}
                min={0}
                step={1}
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-teal-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Reschedule deadline (hours before)
              </label>
              <input
                type="number"
                value={rescheduleDeadlineHours}
                onChange={(e) => setRescheduleDeadlineHours(Number(e.target.value))}
                min={0}
                step={1}
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-teal-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Refund policy</label>
              <select
                value={refundPolicy}
                onChange={(e) => setRefundPolicy(e.target.value as 'full' | 'partial' | 'none')}
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-teal-500 focus:border-transparent"
              >
                <option value="full">Full refund</option>
                <option value="partial">Partial refund</option>
                <option value="none">No refund</option>
              </select>
            </div>

            {refundPolicy === 'partial' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Partial refund percentage
                </label>
                <input
                  type="number"
                  value={partialRefundPercentage}
                  onChange={(e) => setPartialRefundPercentage(Number(e.target.value))}
                  min={0}
                  max={100}
                  step={5}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                />
              </div>
            )}
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

        {/* Business Metadata */}
        <div className="border-2 border-gray-200 rounded-2xl p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Business Amenities</h3>
          <div className="space-y-2">
            <label className="flex items-center gap-3">
              <input
                type="checkbox"
                checked={parkingAvailable}
                onChange={(e) => setParkingAvailable(e.target.checked)}
                className="w-5 h-5 rounded border-gray-300 text-teal-600 focus:ring-teal-500"
              />
              <span className="text-sm text-gray-700">Parking available</span>
            </label>
            <label className="flex items-center gap-3">
              <input
                type="checkbox"
                checked={wheelchairAccessible}
                onChange={(e) => setWheelchairAccessible(e.target.checked)}
                className="w-5 h-5 rounded border-gray-300 text-teal-600 focus:ring-teal-500"
              />
              <span className="text-sm text-gray-700">Wheelchair accessible</span>
            </label>
            <label className="flex items-center gap-3">
              <input
                type="checkbox"
                checked={acceptsWalkIns}
                onChange={(e) => setAcceptsWalkIns(e.target.checked)}
                className="w-5 h-5 rounded border-gray-300 text-teal-600 focus:ring-teal-500"
              />
              <span className="text-sm text-gray-700">Accepts walk-ins</span>
            </label>
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
                {availability.filter(d => d.enabled).length} days/week
              </dd>
            </div>
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

        // Branding
        primaryColor,
        secondaryColor,

        // Services
        categories,

        // Availability
        availability,

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
          <div className="inline-flex items-center gap-3 mb-8">
            <div className="w-10 h-10 bg-gradient-to-br from-teal-500 to-green-500 rounded-2xl flex items-center justify-center shadow-sm">
              <span className="text-white font-bold text-lg">R</span>
            </div>
            <span className="text-xl font-bold text-gray-900">Rivo</span>
          </div>
        </div>

        {/* Step content */}
        <div className="bg-white border-2 border-gray-200 rounded-3xl p-8 md:p-12">
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
    </div>
  );
}
