"use client";

import { useState } from 'react';
import { useRouter } from '@/i18n/routing';
import { useTranslations } from 'next-intl';
import AddressAutocomplete from '@/components/geocoding/AddressAutocomplete';
import LocationMapPreview from '@/components/geocoding/LocationMapPreview';
import type { GeocodingResult } from '@/lib/geocoding/nominatim';
import { Logo } from '@/components/Logo';
import ServiceBuilder, { type Category } from '@/components/onboarding/ServiceBuilder';
import { EmailVerificationModal } from '@/components/auth/EmailVerificationModal';
import ImageUpload from '@/components/onboarding/ImageUpload';

type OnboardingStep = 'auth' | 'business' | 'contact' | 'branding' | 'services' | 'availability' | 'rules' | 'details' | 'review';

// Validation helpers with detailed, helpful messages
const validateEmail = (email: string, t: (key: string) => string): string | null => {
  if (!email) return t('onboard.validation.emailRequired');
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return t('onboard.validation.emailInvalid');
  }
  return null;
};

const validatePassword = (password: string, t: (key: string) => string): string | null => {
  if (!password) return t('onboard.validation.passwordRequired');
  if (password.length < 8) {
    return t('onboard.validation.passwordTooShort');
  }
  // Check for basic strength
  if (!/[A-Za-z]/.test(password) || !/[0-9]/.test(password)) {
    return t('onboard.validation.passwordWeak');
  }
  return null;
};

const validateBusinessName = (name: string, t: (key: string) => string): string | null => {
  if (!name || name.trim().length === 0) {
    return t('onboard.validation.businessNameRequired');
  }
  if (name.length < 2) {
    return t('onboard.validation.businessNameTooShort');
  }
  if (name.length > 100) {
    return t('onboard.validation.businessNameTooLong');
  }
  return null;
};

const validateSubdomain = (subdomain: string, t: (key: string) => string): string | null => {
  if (!subdomain) {
    return t('onboard.validation.subdomainRequired');
  }
  if (!/^[a-z0-9-]+$/.test(subdomain)) {
    return t('onboard.validation.subdomainInvalid');
  }
  if (subdomain.length < 3) {
    return t('onboard.validation.subdomainTooShort');
  }
  if (subdomain.length > 63) {
    return t('onboard.validation.subdomainTooLong');
  }
  if (subdomain.startsWith('-') || subdomain.endsWith('-')) {
    return t('onboard.validation.subdomainHyphens');
  }
  // Check for reserved words
  const reserved = ['admin', 'api', 'www', 'app', 'dashboard', 'login', 'signup'];
  if (reserved.includes(subdomain)) {
    return t('onboard.validation.subdomainReserved');
  }
  return null;
};

const validatePhone = (phone: string, t: (key: string) => string): string | null => {
  if (!phone) return null; // Optional
  const cleaned = phone.replace(/[\s-]/g, '');
  if (!/^\+?[1-9]\d{1,14}$/.test(cleaned)) {
    return t('onboard.validation.phoneInvalid');
  }
  return null;
};

const validateUrl = (url: string, t: (key: string) => string): string | null => {
  if (!url) return null; // Optional
  try {
    const parsed = new URL(url.startsWith('http') ? url : `https://${url}`);
    if (!parsed.protocol.startsWith('http')) {
      return t('onboard.validation.urlProtocol');
    }
    return null;
  } catch {
    return t('onboard.validation.urlInvalid');
  }
};

const validateHexColor = (color: string, t: (key: string) => string): string | null => {
  if (!color) return t('onboard.validation.colorRequired');
  if (!/^#[0-9A-Fa-f]{6}$/.test(color)) {
    return t('onboard.validation.colorInvalid');
  }
  return null;
};

export default function OnboardBusinessPage() {
  const router = useRouter();
  const t = useTranslations();
  const [currentStep, setCurrentStep] = useState<OnboardingStep>('auth');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showVerificationModal, setShowVerificationModal] = useState(false);
  const [verificationEmail, setVerificationEmail] = useState('');

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
  const [instagram, setInstagram] = useState('');
  const [facebook, setFacebook] = useState('');

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
  const [profileImageUrl, setProfileImageUrl] = useState('');
  const [coverImageUrl, setCoverImageUrl] = useState('');
  const [fetchedInstagramProfilePic, setFetchedInstagramProfilePic] = useState('');
  const [fetchingInstagramPic, setFetchingInstagramPic] = useState(false);

  // Dropdown states
  const [timezoneOpen, setTimezoneOpen] = useState(false);
  const [currencyOpen, setCurrencyOpen] = useState(false);
  const [countryOpen, setCountryOpen] = useState(false);

  // Services
  const [categories, setCategories] = useState<Category[]>([
    {
      id: 'example-category',
      name: '',
      description: '',
      sortOrder: 0,
      services: [
        {
          id: 'example-service-1',
          name: '',
          description: '',
          duration: 30,
          price: 0,
          sortOrder: 0,
          enabled: true,
        },
        {
          id: 'example-service-2',
          name: '',
          description: '',
          duration: 60,
          price: 0,
          sortOrder: 1,
          enabled: true,
        }
      ]
    }
  ]);

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
        const emailError = validateEmail(email, t);
        if (emailError) errors.email = emailError;

        if (authMode === 'signup') {
          const passwordError = validatePassword(password, t);
          if (passwordError) errors.password = passwordError;
          if (!ownerName.trim()) errors.ownerName = t('onboard.validation.nameRequired');
        }
        break;

      case 'business':
        const nameError = validateBusinessName(businessName, t);
        if (nameError) errors.businessName = nameError;

        const subdomainError = validateSubdomain(businessId, t);
        if (subdomainError) errors.businessId = subdomainError;
        break;

      case 'contact':
        if (!street.trim()) {
          errors.street = t('onboard.validation.streetRequired');
        }
        if (!city.trim()) {
          errors.city = t('onboard.validation.cityRequired');
        }
        if (!state.trim()) {
          errors.state = t('onboard.validation.stateRequired');
        }
        if (!postalCode.trim()) {
          errors.postalCode = t('onboard.validation.postalCodeRequired');
        }

        const phoneError = validatePhone(phone, t);
        if (phoneError) errors.phone = phoneError;

        const websiteError = validateUrl(website, t);
        if (websiteError) errors.website = websiteError;

        // Instagram is now a username, not a URL - validate username format if provided
        if (instagram && !/^[a-zA-Z0-9._]+$/.test(instagram)) {
          errors.instagram = 'Invalid Instagram username format';
        }

        const facebookError = validateUrl(facebook, t);
        if (facebookError) errors.facebook = facebookError;

        if (!latitude || !longitude) {
          errors.address = t('onboard.validation.addressRequired');
        }
        break;

      case 'branding':
        const primaryColorError = validateHexColor(primaryColor, t);
        if (primaryColorError) errors.primaryColor = primaryColorError;

        const secondaryColorError = validateHexColor(secondaryColor, t);
        if (secondaryColorError) errors.secondaryColor = secondaryColorError;
        break;

      case 'services':
        // Services are optional but validate if provided
        if (categories.length > 0) {
          for (const category of categories) {
            if (!category.name.trim()) {
              errors.services = t('onboard.validation.categoryNameRequired');
              break;
            }
            if (category.services.length === 0) {
              errors.services = t('onboard.validation.categoryServicesRequired', { name: category.name });
              break;
            }
            for (const service of category.services) {
              if (!service.name.trim()) {
                errors.services = t('onboard.validation.serviceNameRequired', { category: category.name });
                break;
              }
              if (service.duration < 5) {
                errors.services = t('onboard.validation.serviceDurationMin', { name: service.name });
                break;
              }
              if (service.duration % 5 !== 0) {
                errors.services = t('onboard.validation.serviceDurationMultiple', { name: service.name });
                break;
              }
              if (service.price < 0) {
                errors.services = t('onboard.validation.servicePriceNegative', { name: service.name });
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
          errors.availability = t('onboard.validation.availabilityRequired');
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
                errors.availability = t('onboard.validation.availabilityInvalidTime', { day: day.day });
                break;
              }
            }
          }
        }
        break;

      case 'rules':
        if (timeSlotDuration < 5 || timeSlotDuration > 480) {
          errors.timeSlotDuration = t('onboard.validation.timeSlotRange');
        }
        if (timeSlotDuration % 5 !== 0) {
          errors.timeSlotDuration = t('onboard.validation.timeSlotMultiple');
        }
        if (maxSimultaneousBookings < 1) {
          errors.maxSimultaneousBookings = t('onboard.validation.maxBookingsMin');
        }
        if (maxSimultaneousBookings > 100) {
          errors.maxSimultaneousBookings = t('onboard.validation.maxBookingsMax');
        }
        if (advanceBookingDays < 1 || advanceBookingDays > 365) {
          errors.advanceBookingDays = t('onboard.validation.advanceBookingRange');
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

  // Fetch Instagram profile picture from username
  const fetchInstagramProfilePicture = async (username: string) => {
    if (!username || username.trim() === '') {
      return;
    }

    // Extract username if user pasted a URL
    let cleanUsername = username.trim();
    if (cleanUsername.includes('instagram.com/')) {
      const match = cleanUsername.match(/instagram\.com\/([a-zA-Z0-9._]+)/);
      if (match) {
        cleanUsername = match[1];
      }
    }

    setFetchingInstagramPic(true);
    setFetchedInstagramProfilePic('');

    try {
      const response = await fetch('/api/instagram/profile-picture', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: cleanUsername }),
      });

      const data = await response.json();

      if (data.success && data.profilePictureUrl) {
        setFetchedInstagramProfilePic(data.profilePictureUrl);
        console.log('✅ Instagram profile picture fetched successfully');
      } else {
        console.warn('Failed to fetch Instagram profile picture:', data.error);
      }
    } catch (error) {
      console.error('Error fetching Instagram profile picture:', error);
    } finally {
      setFetchingInstagramPic(false);
    }
  };

  const handleBusinessNameChange = (name: string) => {
    setBusinessName(name);
    if (!businessId || businessId === generateBusinessId(businessName)) {
      setBusinessId(generateBusinessId(name));
    }
  };

  const renderAuthStep = () => (
    <div className="space-y-4 sm:space-y-6">
      <div className="text-center mb-6 sm:mb-8">
        <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2 sm:mb-3">{t('onboard.auth.title')}</h2>
        <p className="text-sm sm:text-base text-gray-600">{t('onboard.auth.subtitle')}</p>
      </div>

      <div className="flex gap-1.5 sm:gap-2 bg-gray-100 p-1 rounded-xl sm:rounded-2xl mb-4 sm:mb-6">
        <button
          onClick={() => setAuthMode('signup')}
          className={`flex-1 px-3 sm:px-6 py-2 rounded-lg sm:rounded-xl text-xs sm:text-sm font-semibold transition-all active:scale-95 ${
            authMode === 'signup' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-900'
          }`}
        >
          {t('onboard.auth.modeSignup')}
        </button>
        <button
          onClick={() => setAuthMode('login')}
          className={`flex-1 px-3 sm:px-6 py-2 rounded-lg sm:rounded-xl text-xs sm:text-sm font-semibold transition-all active:scale-95 ${
            authMode === 'login' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-900'
          }`}
        >
          {t('onboard.auth.modeLogin')}
        </button>
      </div>

      {authMode === 'signup' ? (
        <div className="space-y-3 sm:space-y-4">
          <div>
            <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">
              {t('onboard.auth.yourName')}
              {validationErrors.ownerName && <span className="text-red-600 text-xs ml-2">{validationErrors.ownerName}</span>}
            </label>
            <input
              type="text"
              value={ownerName}
              onChange={(e) => setOwnerName(e.target.value)}
              className={`w-full px-3 sm:px-4 py-2.5 sm:py-3 text-sm sm:text-base text-gray-900 border-2 rounded-xl focus:ring-2 focus:ring-teal-500 focus:border-transparent transition-colors ${
                validationErrors.ownerName ? 'border-red-300 bg-red-50' : 'border-gray-300'
              }`}
              placeholder={t('onboard.auth.yourNamePlaceholder')}
              required
            />
          </div>
          <div>
            <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">
              {t('onboard.auth.email')}
              {validationErrors.email && <span className="text-red-600 text-xs ml-2">{validationErrors.email}</span>}
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className={`w-full px-3 sm:px-4 py-2.5 sm:py-3 text-sm sm:text-base text-gray-900 border-2 rounded-xl focus:ring-2 focus:ring-teal-500 focus:border-transparent transition-colors ${
                validationErrors.email ? 'border-red-300 bg-red-50' : 'border-gray-300'
              }`}
              placeholder={t('onboard.auth.emailPlaceholder')}
              required
            />
          </div>
          <div>
            <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">
              {t('onboard.auth.password')}
              {validationErrors.password && <span className="text-red-600 text-xs ml-2">{validationErrors.password}</span>}
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className={`w-full px-3 sm:px-4 py-2.5 sm:py-3 text-sm sm:text-base text-gray-900 border-2 rounded-xl focus:ring-2 focus:ring-teal-500 focus:border-transparent transition-colors ${
                validationErrors.password ? 'border-red-300 bg-red-50' : 'border-gray-300'
              }`}
              placeholder={t('onboard.auth.passwordPlaceholder')}
              required
            />
            <p className="text-xs text-gray-500 mt-1">{t('onboard.auth.passwordHint')}</p>
          </div>
        </div>
      ) : (
        <div className="space-y-3 sm:space-y-4">
          <div>
            <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">
              {t('onboard.auth.email')}
              {validationErrors.email && <span className="text-red-600 text-xs ml-2">{validationErrors.email}</span>}
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className={`w-full px-3 sm:px-4 py-2.5 sm:py-3 text-sm sm:text-base text-gray-900 border-2 rounded-xl focus:ring-2 focus:ring-teal-500 focus:border-transparent transition-colors ${
                validationErrors.email ? 'border-red-300 bg-red-50' : 'border-gray-300'
              }`}
              placeholder={t('onboard.auth.emailPlaceholder')}
              required
            />
          </div>
          <div>
            <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">{t('onboard.auth.password')}</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-3 sm:px-4 py-2.5 sm:py-3 text-sm sm:text-base text-gray-900 border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-teal-500 focus:border-transparent"
              placeholder={t('onboard.auth.passwordPlaceholder')}
              required
            />
          </div>
        </div>
      )}
    </div>
  );

  const renderBusinessStep = () => (
    <div className="space-y-4 sm:space-y-6">
      <div className="text-center mb-6 sm:mb-8">
        <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2 sm:mb-3">{t('onboard.business.title')}</h2>
        <p className="text-sm sm:text-base text-gray-600">{t('onboard.business.subtitle')}</p>
      </div>

      <div className="space-y-3 sm:space-y-4">
        <div>
          <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">
            {t('onboard.business.businessName')}
            {validationErrors.businessName && <span className="text-red-600 text-xs ml-1 sm:ml-2">{validationErrors.businessName}</span>}
          </label>
          <input
            type="text"
            value={businessName}
            onChange={(e) => handleBusinessNameChange(e.target.value)}
            className={`w-full px-3 sm:px-4 py-2.5 sm:py-3 text-sm sm:text-base text-gray-900 border-2 rounded-xl focus:ring-2 focus:ring-teal-500 focus:border-transparent transition-colors ${
              validationErrors.businessName ? 'border-red-300 bg-red-50' : 'border-gray-300'
            }`}
            placeholder={t('onboard.business.businessNamePlaceholder')}
            required
          />
        </div>

        <div>
          <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">
            {t('onboard.business.subdomain')}
            <span className="text-gray-500 font-normal ml-1 sm:ml-2 text-xs sm:text-sm">{t('onboard.business.subdomainHint')}</span>
            {validationErrors.businessId && <span className="text-red-600 text-xs ml-1 sm:ml-2 block sm:inline">{validationErrors.businessId}</span>}
          </label>
          <div className="flex items-center gap-1.5 sm:gap-2">
            <input
              type="text"
              value={businessId}
              onChange={(e) => setBusinessId(e.target.value)}
              className={`flex-1 px-3 sm:px-4 py-2.5 sm:py-3 text-sm sm:text-base text-gray-900 border-2 rounded-xl focus:ring-2 focus:ring-teal-500 focus:border-transparent transition-colors ${
                validationErrors.businessId ? 'border-red-300 bg-red-50' : 'border-gray-300'
              }`}
              placeholder={t('onboard.business.subdomainPlaceholder')}
              required
            />
            <span className="text-gray-500 text-xs sm:text-sm whitespace-nowrap">{t('onboard.business.subdomainSuffix')}</span>
          </div>
          <p className="text-xs sm:text-sm text-gray-500 mt-1">{t('onboard.business.subdomainHelp')}</p>
        </div>

        <div>
          <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">{t('onboard.business.description')}</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
            className="w-full px-3 sm:px-4 py-2.5 sm:py-3 text-sm sm:text-base text-gray-900 border border-gray-300 rounded-xl focus:ring-2 focus:ring-teal-500 focus:border-transparent"
            placeholder={t('onboard.business.descriptionPlaceholder')}
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
          <div className="relative">
            <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-2">{t('onboard.business.timezone')}</label>
            <button
              type="button"
              onClick={() => setTimezoneOpen(!timezoneOpen)}
              className="w-full px-3 sm:px-4 py-2.5 sm:py-3 text-sm sm:text-base border-2 border-gray-200 rounded-xl sm:rounded-2xl bg-white text-gray-900 font-medium transition-all hover:border-gray-300 flex items-center justify-between active:scale-95"
            >
              <span className="truncate">{timezone.replace('Europe/', '').replace('America/', '').replace('_', ' ')}</span>
              <svg className={`w-4 h-4 sm:w-5 sm:h-5 text-gray-500 transition-transform flex-shrink-0 ml-2 ${timezoneOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>
            {timezoneOpen && (
              <div className="absolute z-50 w-full mt-2 bg-white border-2 border-gray-200 rounded-xl sm:rounded-2xl shadow-lg max-h-48 sm:max-h-64 overflow-y-auto">
                <div className="p-1.5 sm:p-2">
                  <div className="px-2 sm:px-3 py-1.5 sm:py-2 text-xs font-semibold text-gray-500 uppercase tracking-wide">Europe</div>
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
                      className={`w-full text-left px-2 sm:px-3 py-1.5 sm:py-2 text-xs sm:text-sm rounded-lg sm:rounded-xl transition-all active:scale-95 ${
                        timezone === tz.value
                          ? 'bg-teal-50 text-teal-900 font-semibold'
                          : 'hover:bg-gray-50 text-gray-700'
                      }`}
                    >
                      {tz.label}
                    </button>
                  ))}
                  <div className="px-2 sm:px-3 py-1.5 sm:py-2 text-xs font-semibold text-gray-500 uppercase tracking-wide mt-2">Americas</div>
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
                      className={`w-full text-left px-2 sm:px-3 py-1.5 sm:py-2 text-xs sm:text-sm rounded-lg sm:rounded-xl transition-all active:scale-95 ${
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
            <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-2">{t('onboard.business.currency')}</label>
            <button
              type="button"
              onClick={() => setCurrencyOpen(!currencyOpen)}
              className="w-full px-3 sm:px-4 py-2.5 sm:py-3 text-sm sm:text-base border-2 border-gray-200 rounded-xl sm:rounded-2xl bg-white text-gray-900 font-medium transition-all hover:border-gray-300 flex items-center justify-between active:scale-95"
            >
              <span>{currency}</span>
              <svg className={`w-4 h-4 sm:w-5 sm:h-5 text-gray-500 transition-transform ${currencyOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>
            {currencyOpen && (
              <div className="absolute z-50 w-full mt-2 bg-white border-2 border-gray-200 rounded-xl sm:rounded-2xl shadow-lg">
                <div className="p-1.5 sm:p-2">
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
                      className={`w-full text-left px-2 sm:px-3 py-1.5 sm:py-2 text-xs sm:text-sm rounded-lg sm:rounded-xl transition-all active:scale-95 ${
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
    <div className="space-y-4 sm:space-y-6">
      <div className="text-center mb-6 sm:mb-8">
        <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2 sm:mb-3">{t('onboard.contact.title')}</h2>
        <p className="text-sm sm:text-base text-gray-600">{t('onboard.contact.subtitle')}</p>
      </div>

      <div className="space-y-3 sm:space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
          <div>
            <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">
              {t('onboard.contact.phone')}
              {validationErrors.phone && <span className="text-red-600 text-xs ml-1 sm:ml-2">{validationErrors.phone}</span>}
            </label>
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className={`w-full px-3 sm:px-4 py-2.5 sm:py-3 text-sm sm:text-base text-gray-900 border-2 rounded-xl focus:ring-2 focus:ring-teal-500 focus:border-transparent transition-colors ${
                validationErrors.phone ? 'border-red-300 bg-red-50' : 'border-gray-300'
              }`}
              placeholder={t('onboard.contact.phonePlaceholder')}
            />
            <p className="text-xs text-gray-500 mt-1">{t('onboard.contact.phoneHint')}</p>
          </div>

          <div>
            <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">
              {t('onboard.contact.website')} {t('onboard.contact.websiteOptional')}
              {validationErrors.website && <span className="text-red-600 text-xs ml-1 sm:ml-2">{validationErrors.website}</span>}
            </label>
            <input
              type="url"
              value={website}
              onChange={(e) => setWebsite(e.target.value)}
              className={`w-full px-3 sm:px-4 py-2.5 sm:py-3 text-sm sm:text-base text-gray-900 border-2 rounded-xl focus:ring-2 focus:ring-teal-500 focus:border-transparent transition-colors ${
                validationErrors.website ? 'border-red-300 bg-red-50' : 'border-gray-300'
              }`}
              placeholder={t('onboard.contact.websitePlaceholder')}
            />
          </div>

          <div>
            <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">
              Instagram Username (Optional)
              {validationErrors.instagram && <span className="text-red-600 text-xs ml-1 sm:ml-2">{validationErrors.instagram}</span>}
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 sm:pl-4 flex items-center pointer-events-none">
                <span className="text-gray-500 text-sm sm:text-base">@</span>
              </div>
              <input
                type="text"
                value={instagram}
                onChange={(e) => setInstagram(e.target.value)}
                onBlur={(e) => {
                  const username = e.target.value.trim();
                  if (username) {
                    fetchInstagramProfilePicture(username);
                  }
                }}
                className={`w-full pl-8 sm:pl-10 pr-3 sm:pr-4 py-2.5 sm:py-3 text-sm sm:text-base text-gray-900 border-2 rounded-xl focus:ring-2 focus:ring-teal-500 focus:border-transparent transition-colors ${
                  validationErrors.instagram ? 'border-red-300 bg-red-50' : 'border-gray-300'
                }`}
                placeholder="yourbusiness"
              />
              {fetchingInstagramPic && (
                <div className="absolute inset-y-0 right-0 pr-3 sm:pr-4 flex items-center">
                  <div className="animate-spin rounded-full h-4 w-4 border-2 border-teal-500 border-t-transparent"></div>
                </div>
              )}
            </div>
            <p className="text-xs text-gray-500 mt-1">We'll fetch your profile picture automatically</p>
          </div>

          <div>
            <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">
              Facebook (Optional)
              {validationErrors.facebook && <span className="text-red-600 text-xs ml-1 sm:ml-2">{validationErrors.facebook}</span>}
            </label>
            <input
              type="url"
              value={facebook}
              onChange={(e) => setFacebook(e.target.value)}
              className={`w-full px-3 sm:px-4 py-2.5 sm:py-3 text-sm sm:text-base text-gray-900 border-2 rounded-xl focus:ring-2 focus:ring-teal-500 focus:border-transparent transition-colors ${
                validationErrors.facebook ? 'border-red-300 bg-red-50' : 'border-gray-300'
              }`}
              placeholder="https://facebook.com/yourbusiness"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-2">
            {t('onboard.contact.addressTitle')}
            {validationErrors.address && <span className="text-red-600 text-xs ml-1 sm:ml-2">{validationErrors.address}</span>}
          </label>

          {!addressSelected && (
            <div className="mb-3 p-2.5 sm:p-3 bg-blue-50 border border-blue-200 rounded-xl">
              <div className="flex items-start gap-2">
                <svg className="w-4 h-4 sm:w-5 sm:h-5 text-blue-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <p className="text-xs sm:text-sm text-blue-900">
                  {t('onboard.contact.addressInfo')}
                </p>
              </div>
            </div>
          )}

          <AddressAutocomplete
            onAddressSelect={handleAddressSelect}
            placeholder={t('onboard.contact.addressPlaceholder')}
            showCoordinatesPreview={false}
            className="mb-2"
          />

          {addressSelected && latitude && longitude && (
            <div className="mt-2 p-2.5 sm:p-3 bg-green-50 border border-green-200 rounded-lg">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                <div className="flex items-center gap-2">
                  <svg className="w-4 h-4 sm:w-5 sm:h-5 text-green-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <div className="min-w-0">
                    <p className="text-xs sm:text-sm font-medium text-green-900">{t('onboard.contact.addressSuccess')}</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setShowMapPreview(true)}
                  className="px-3 py-1.5 bg-white border border-green-300 text-green-700 rounded-lg text-xs sm:text-sm font-medium hover:bg-green-50 active:scale-95 transition-all flex items-center justify-center gap-1.5 whitespace-nowrap"
                >
                  <svg className="w-3.5 h-3.5 sm:w-4 sm:h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
                  </svg>
                  {t('onboard.contact.viewMap')}
                </button>
              </div>
            </div>
          )}

          <p className="text-xs text-gray-500 mt-2">
            {t('onboard.contact.addressNote')}
          </p>
        </div>

        {/* Manual address fields (auto-populated from geocoding) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
          <div>
            <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">
              {t('onboard.contact.street')}
              {validationErrors.street && <span className="text-red-600 text-xs ml-1 sm:ml-2">{validationErrors.street}</span>}
            </label>
            <input
              type="text"
              value={street}
              onChange={(e) => setStreet(e.target.value)}
              className={`w-full px-3 sm:px-4 py-2.5 sm:py-3 text-sm sm:text-base text-gray-900 border-2 rounded-xl focus:ring-2 focus:ring-teal-500 focus:border-transparent transition-colors ${
                validationErrors.street ? 'border-red-300 bg-red-50' : 'border-gray-300'
              }`}
              placeholder={t('onboard.contact.streetPlaceholder')}
            />
          </div>

          <div>
            <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">
              {t('onboard.contact.city')}
              {validationErrors.city && <span className="text-red-600 text-xs ml-1 sm:ml-2">{validationErrors.city}</span>}
            </label>
            <input
              type="text"
              value={city}
              onChange={(e) => setCity(e.target.value)}
              className={`w-full px-3 sm:px-4 py-2.5 sm:py-3 text-sm sm:text-base text-gray-900 border-2 rounded-xl focus:ring-2 focus:ring-teal-500 focus:border-transparent transition-colors ${
                validationErrors.city ? 'border-red-300 bg-red-50' : 'border-gray-300'
              }`}
              placeholder={t('onboard.contact.cityPlaceholder')}
            />
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 sm:gap-4">
          <div>
            <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">
              {t('onboard.contact.state')}
              {validationErrors.state && <span className="text-red-600 text-xs ml-1 sm:ml-2">{validationErrors.state}</span>}
            </label>
            <input
              type="text"
              value={state}
              onChange={(e) => setState(e.target.value)}
              className={`w-full px-3 sm:px-4 py-2.5 sm:py-3 text-sm sm:text-base text-gray-900 border-2 rounded-xl focus:ring-2 focus:ring-teal-500 focus:border-transparent transition-colors ${
                validationErrors.state ? 'border-red-300 bg-red-50' : 'border-gray-300'
              }`}
              placeholder={t('onboard.contact.statePlaceholder')}
            />
          </div>

          <div>
            <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">
              {t('onboard.contact.postalCode')}
              {validationErrors.postalCode && <span className="text-red-600 text-xs ml-1 sm:ml-2">{validationErrors.postalCode}</span>}
            </label>
            <input
              type="text"
              value={postalCode}
              onChange={(e) => setPostalCode(e.target.value)}
              className={`w-full px-3 sm:px-4 py-2.5 sm:py-3 text-sm sm:text-base text-gray-900 border-2 rounded-xl focus:ring-2 focus:ring-teal-500 focus:border-transparent transition-colors ${
                validationErrors.postalCode ? 'border-red-300 bg-red-50' : 'border-gray-300'
              }`}
              placeholder={t('onboard.contact.postalCodePlaceholder')}
            />
          </div>

          <div className="relative col-span-2 sm:col-span-1">
            <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-2">{t('onboard.contact.country')}</label>
            <button
              type="button"
              onClick={() => setCountryOpen(!countryOpen)}
              className="w-full px-3 sm:px-4 py-2.5 sm:py-3 text-sm sm:text-base border-2 border-gray-200 rounded-xl sm:rounded-2xl bg-white text-gray-900 font-medium transition-all hover:border-gray-300 flex items-center justify-between active:scale-95"
            >
              <span className="text-xs sm:text-sm truncate">
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
              <svg className={`w-3.5 h-3.5 sm:w-4 sm:h-4 text-gray-500 transition-transform flex-shrink-0 ml-2 ${countryOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>
            {countryOpen && (
              <div className="absolute z-50 w-full mt-2 bg-white border-2 border-gray-200 rounded-xl sm:rounded-2xl shadow-lg max-h-40 sm:max-h-48 overflow-y-auto">
                <div className="p-1.5 sm:p-2">
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
                      className={`w-full text-left px-2 sm:px-3 py-1.5 sm:py-2 rounded-lg sm:rounded-xl transition-all text-xs sm:text-sm active:scale-95 ${
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
    <div className="space-y-4 sm:space-y-6">
      <div className="text-center mb-6 sm:mb-8">
        <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2 sm:mb-3">{t('onboard.branding.title')}</h2>
        <p className="text-sm sm:text-base text-gray-600">{t('onboard.branding.subtitle')}</p>
      </div>

      <div className="space-y-3 sm:space-y-4">
        {/* Image uploads */}
        <div className="space-y-3">
          <ImageUpload
            label={t('onboard.branding.profileImage')}
            description={t('onboard.branding.profileImageDescription')}
            value={profileImageUrl}
            onChange={setProfileImageUrl}
            aspectRatio="profile"
            fetchedUrl={fetchedInstagramProfilePic}
            isLoadingFetched={fetchingInstagramPic}
            onFetchedUrlAccept={() => {
              // When user accepts the Instagram profile pic, set it as the profile image
              setProfileImageUrl(fetchedInstagramProfilePic);
            }}
          />

          <ImageUpload
            label={t('onboard.branding.bannerImage')}
            description={t('onboard.branding.bannerImageDescription')}
            value={coverImageUrl}
            onChange={setCoverImageUrl}
            aspectRatio="banner"
          />
        </div>

        {/* Color pickers */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
          <div>
            <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">{t('onboard.branding.primaryColor')}</label>
            <div className="flex gap-2 sm:gap-3 items-center">
              <input
                type="color"
                value={primaryColor}
                onChange={(e) => setPrimaryColor(e.target.value)}
                className="h-10 sm:h-12 w-16 sm:w-20 rounded-lg sm:rounded-xl border-2 border-gray-300 cursor-pointer hover:border-teal-400 transition-colors flex-shrink-0"
                style={{ padding: '4px' }}
              />
              <input
                type="text"
                value={primaryColor}
                onChange={(e) => setPrimaryColor(e.target.value)}
                className="flex-1 min-w-0 px-3 sm:px-4 py-2.5 sm:py-3 text-sm sm:text-base text-gray-900 border border-gray-300 rounded-xl focus:ring-2 focus:ring-teal-500 focus:border-transparent font-mono"
                placeholder="#10b981"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">{t('onboard.branding.secondaryColor')}</label>
            <div className="flex gap-2 sm:gap-3 items-center">
              <input
                type="color"
                value={secondaryColor}
                onChange={(e) => setSecondaryColor(e.target.value)}
                className="h-10 sm:h-12 w-16 sm:w-20 rounded-lg sm:rounded-xl border-2 border-gray-300 cursor-pointer hover:border-teal-400 transition-colors flex-shrink-0"
                style={{ padding: '4px' }}
              />
              <input
                type="text"
                value={secondaryColor}
                onChange={(e) => setSecondaryColor(e.target.value)}
                className="flex-1 min-w-0 px-3 sm:px-4 py-2.5 sm:py-3 text-sm sm:text-base text-gray-900 border border-gray-300 rounded-xl focus:ring-2 focus:ring-teal-500 focus:border-transparent font-mono"
                placeholder="#14b8a6"
              />
            </div>
          </div>
        </div>

        <div className="p-4 sm:p-6 border-2 border-gray-200 rounded-xl sm:rounded-2xl bg-gray-50">
          <p className="text-xs sm:text-sm font-medium text-gray-700 mb-3 sm:mb-4">{t('onboard.branding.preview')}</p>
          <div className="bg-white rounded-xl p-4 sm:p-6 space-y-2 sm:space-y-3">
            <div
              className="h-10 sm:h-12 rounded-lg sm:rounded-xl flex items-center justify-center text-white font-semibold text-sm sm:text-base"
              style={{ background: `linear-gradient(to right, ${primaryColor}, ${secondaryColor})` }}
            >
              {t('onboard.branding.previewButton')}
            </div>
            <div className="flex gap-2">
              <div className="flex-1 h-6 sm:h-8 rounded-md sm:rounded-lg" style={{ backgroundColor: primaryColor + '20' }} />
              <div className="flex-1 h-6 sm:h-8 rounded-md sm:rounded-lg" style={{ backgroundColor: secondaryColor + '20' }} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  const renderServicesStep = () => (
    <div className="space-y-4 sm:space-y-6">
      <div className="text-center mb-6 sm:mb-8">
        <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2 sm:mb-3">{t('onboard.services.title')}</h2>
        <p className="text-sm sm:text-base text-gray-600">{t('onboard.services.subtitle')}</p>
      </div>

      {validationErrors.services && (
        <div className="p-3 sm:p-4 bg-red-50 border-2 border-red-200 rounded-xl">
          <p className="text-xs sm:text-sm font-semibold text-red-900">{validationErrors.services}</p>
        </div>
      )}

      <ServiceBuilder categories={categories} onChange={setCategories} />

      <div className="text-center text-xs sm:text-sm text-gray-500 bg-gray-50 border border-gray-200 rounded-xl p-3 sm:p-4">
        {t('onboard.services.skipNote')}
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
    <div className="space-y-4 sm:space-y-6">
      <div className="text-center mb-6 sm:mb-8">
        <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2 sm:mb-3">{t('onboard.availability.title')}</h2>
        <p className="text-sm sm:text-base text-gray-600">{t('onboard.availability.subtitle')}</p>
      </div>

      {/* Mode Toggle */}
      <div className="flex gap-1.5 sm:gap-2 bg-gray-100 p-1 rounded-xl sm:rounded-2xl mb-4 sm:mb-6">
        <button
          type="button"
          onClick={() => setAvailabilityMode('simple')}
          className={`flex-1 px-3 sm:px-6 py-2 rounded-lg sm:rounded-xl text-xs sm:text-sm font-semibold transition-all active:scale-95 ${
            availabilityMode === 'simple' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-900'
          }`}
        >
          {t('onboard.availability.simpleMode')}
        </button>
        <button
          type="button"
          onClick={switchToAdvanced}
          className={`flex-1 px-3 sm:px-6 py-2 rounded-lg sm:rounded-xl text-xs sm:text-sm font-semibold transition-all active:scale-95 ${
            availabilityMode === 'advanced' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-900'
          }`}
        >
          {t('onboard.availability.advancedMode')}
        </button>
      </div>

      {availabilityMode === 'simple' ? (
        /* Simple Mode */
        <div className="space-y-3 sm:space-y-4">
          {/* Weekdays */}
          <div className="border-2 border-gray-200 rounded-xl sm:rounded-2xl p-4 sm:p-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
              <div>
                <h3 className="text-sm sm:text-base font-semibold text-gray-900">{t('onboard.availability.weekdays')}</h3>
                <p className="text-xs sm:text-sm text-gray-500">{t('onboard.availability.weekdaysHint')}</p>
              </div>
              <label className="flex items-center gap-2 sm:gap-3">
                <input
                  type="checkbox"
                  checked={simpleAvailability.weekdaysEnabled}
                  onChange={(e) => setSimpleAvailability({ ...simpleAvailability, weekdaysEnabled: e.target.checked })}
                  className="w-4 h-4 sm:w-5 sm:h-5 rounded-md border-2 border-gray-300 text-teal-600 focus:ring-2 focus:ring-teal-500 focus:ring-offset-0 transition-all"
                />
                <span className="text-xs sm:text-sm font-medium text-gray-700">{t('onboard.availability.open')}</span>
              </label>
            </div>
            {simpleAvailability.weekdaysEnabled && (
              <div className="flex items-center gap-2 sm:gap-3">
                <input
                  type="time"
                  value={simpleAvailability.weekdayStart}
                  onChange={(e) => setSimpleAvailability({ ...simpleAvailability, weekdayStart: e.target.value })}
                  className="flex-1 px-3 sm:px-4 py-2.5 sm:py-3 text-gray-900 border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-teal-500 focus:border-transparent text-xs sm:text-sm font-medium"
                />
                <span className="text-gray-500 text-xs sm:text-sm font-medium">{t('onboard.availability.to')}</span>
                <input
                  type="time"
                  value={simpleAvailability.weekdayEnd}
                  onChange={(e) => setSimpleAvailability({ ...simpleAvailability, weekdayEnd: e.target.value })}
                  className="flex-1 px-3 sm:px-4 py-2.5 sm:py-3 text-gray-900 border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-teal-500 focus:border-transparent text-xs sm:text-sm font-medium"
                />
              </div>
            )}
          </div>

          {/* Saturday */}
          <div className="border-2 border-gray-200 rounded-xl sm:rounded-2xl p-4 sm:p-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
              <div>
                <h3 className="text-sm sm:text-base font-semibold text-gray-900">{t('onboard.availability.saturday')}</h3>
                <p className="text-xs sm:text-sm text-gray-500">{t('onboard.availability.saturdayHint')}</p>
              </div>
              <label className="flex items-center gap-2 sm:gap-3">
                <input
                  type="checkbox"
                  checked={simpleAvailability.saturdayEnabled}
                  onChange={(e) => setSimpleAvailability({ ...simpleAvailability, saturdayEnabled: e.target.checked })}
                  className="w-4 h-4 sm:w-5 sm:h-5 rounded-md border-2 border-gray-300 text-teal-600 focus:ring-2 focus:ring-teal-500 focus:ring-offset-0 transition-all"
                />
                <span className="text-xs sm:text-sm font-medium text-gray-700">{t('onboard.availability.open')}</span>
              </label>
            </div>
            {simpleAvailability.saturdayEnabled && (
              <div className="flex items-center gap-2 sm:gap-3">
                <input
                  type="time"
                  value={simpleAvailability.saturdayStart}
                  onChange={(e) => setSimpleAvailability({ ...simpleAvailability, saturdayStart: e.target.value })}
                  className="flex-1 px-3 sm:px-4 py-2.5 sm:py-3 text-gray-900 border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-teal-500 focus:border-transparent text-xs sm:text-sm font-medium"
                />
                <span className="text-gray-500 text-xs sm:text-sm font-medium">{t('onboard.availability.to')}</span>
                <input
                  type="time"
                  value={simpleAvailability.saturdayEnd}
                  onChange={(e) => setSimpleAvailability({ ...simpleAvailability, saturdayEnd: e.target.value })}
                  className="flex-1 px-3 sm:px-4 py-2.5 sm:py-3 text-gray-900 border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-teal-500 focus:border-transparent text-xs sm:text-sm font-medium"
                />
              </div>
            )}
          </div>

          {/* Sunday */}
          <div className="border-2 border-gray-200 rounded-xl sm:rounded-2xl p-4 sm:p-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
              <div>
                <h3 className="text-sm sm:text-base font-semibold text-gray-900">{t('onboard.availability.sunday')}</h3>
                <p className="text-xs sm:text-sm text-gray-500">{t('onboard.availability.sundayHint')}</p>
              </div>
              <label className="flex items-center gap-2 sm:gap-3">
                <input
                  type="checkbox"
                  checked={simpleAvailability.sundayEnabled}
                  onChange={(e) => setSimpleAvailability({ ...simpleAvailability, sundayEnabled: e.target.checked })}
                  className="w-4 h-4 sm:w-5 sm:h-5 rounded-md border-2 border-gray-300 text-teal-600 focus:ring-2 focus:ring-teal-500 focus:ring-offset-0 transition-all"
                />
                <span className="text-xs sm:text-sm font-medium text-gray-700">{t('onboard.availability.open')}</span>
              </label>
            </div>
            {simpleAvailability.sundayEnabled && (
              <div className="flex items-center gap-2 sm:gap-3">
                <input
                  type="time"
                  value={simpleAvailability.sundayStart}
                  onChange={(e) => setSimpleAvailability({ ...simpleAvailability, sundayStart: e.target.value })}
                  className="flex-1 px-3 sm:px-4 py-2.5 sm:py-3 text-gray-900 border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-teal-500 focus:border-transparent text-xs sm:text-sm font-medium"
                />
                <span className="text-gray-500 text-xs sm:text-sm font-medium">{t('onboard.availability.to')}</span>
                <input
                  type="time"
                  value={simpleAvailability.sundayEnd}
                  onChange={(e) => setSimpleAvailability({ ...simpleAvailability, sundayEnd: e.target.value })}
                  className="flex-1 px-3 sm:px-4 py-2.5 sm:py-3 text-gray-900 border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-teal-500 focus:border-transparent text-xs sm:text-sm font-medium"
                />
              </div>
            )}
          </div>

          <div className="text-center text-xs sm:text-sm text-gray-500 bg-gray-50 border border-gray-200 rounded-xl p-3 sm:p-4">
            {t('onboard.availability.simpleModeNote')}
          </div>
        </div>
      ) : (
        /* Advanced Mode */
        <div className="space-y-2 sm:space-y-3">
          {availability?.map((day, dayIndex) => (
            <div key={day.day} className="border-2 border-gray-200 rounded-xl sm:rounded-2xl overflow-hidden">
              {/* Day header */}
              <div className="flex items-center gap-3 sm:gap-4 p-3 sm:p-4 bg-gray-50">
                <div className="w-20 sm:w-28">
                  <span className="text-xs sm:text-sm font-semibold text-gray-900 capitalize">{day.day}</span>
                </div>
                <label className="flex items-center gap-2 sm:gap-3">
                  <input
                    type="checkbox"
                    checked={day.enabled}
                    onChange={(e) => {
                      const newAvailability = [...availability];
                      newAvailability[dayIndex].enabled = e.target.checked;
                      setAvailability(newAvailability);
                    }}
                    className="w-4 h-4 sm:w-5 sm:h-5 rounded-md border-2 border-gray-300 text-teal-600 focus:ring-2 focus:ring-teal-500 focus:ring-offset-0 transition-all"
                  />
                  <span className="text-xs sm:text-sm font-medium text-gray-700">{t('onboard.availability.open')}</span>
                </label>
              </div>

              {/* Time slots */}
              {day.enabled && (
                <div className="p-3 sm:p-4 space-y-2 sm:space-y-3">
                  {day.slots.map((slot, slotIndex) => (
                    <div key={slotIndex} className="flex items-center gap-2 sm:gap-3">
                      <div className="flex items-center gap-2 sm:gap-3 flex-1 min-w-0">
                        <div className="flex items-center gap-1.5 sm:gap-2 flex-1">
                          <input
                            type="time"
                            value={slot.open}
                            onChange={(e) => {
                              const newAvailability = [...availability];
                              newAvailability[dayIndex].slots[slotIndex].open = e.target.value;
                              setAvailability(newAvailability);
                            }}
                            className="px-2 sm:px-3 py-1.5 sm:py-2 text-gray-900 border-2 border-gray-300 rounded-lg sm:rounded-xl focus:ring-2 focus:ring-teal-500 focus:border-transparent text-xs sm:text-sm font-medium w-full"
                          />
                          <span className="text-gray-500 text-xs sm:text-sm flex-shrink-0">{t('onboard.availability.to')}</span>
                          <input
                            type="time"
                            value={slot.close}
                            onChange={(e) => {
                              const newAvailability = [...availability];
                              newAvailability[dayIndex].slots[slotIndex].close = e.target.value;
                              setAvailability(newAvailability);
                            }}
                            className="px-2 sm:px-3 py-1.5 sm:py-2 text-gray-900 border-2 border-gray-300 rounded-lg sm:rounded-xl focus:ring-2 focus:ring-teal-500 focus:border-transparent text-xs sm:text-sm font-medium w-full"
                          />
                        </div>
                        {slotIndex > 0 && (
                          <span className="hidden sm:inline text-xs text-gray-500 ml-2">
                            {t('onboard.availability.breakShift')}
                          </span>
                        )}
                      </div>
                      {day.slots.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removeTimeSlot(dayIndex, slotIndex)}
                          className="w-7 h-7 sm:w-8 sm:h-8 flex items-center justify-center rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-600 transition-all flex-shrink-0 active:scale-95"
                        >
                          <svg className="w-3.5 h-3.5 sm:w-4 sm:h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
                    className="w-full px-3 sm:px-4 py-2 border-2 border-dashed border-gray-300 rounded-lg sm:rounded-xl text-xs font-semibold text-gray-500 hover:border-teal-500 hover:text-teal-600 hover:bg-teal-50 active:scale-95 transition-all flex items-center justify-center gap-1.5 sm:gap-2"
                  >
                    <svg className="w-3.5 h-3.5 sm:w-4 sm:h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                    </svg>
                    {t('onboard.availability.addBreak')}
                  </button>
                </div>
              )}
            </div>
          ))}

          <div className="text-center text-xs sm:text-sm text-gray-500 bg-blue-50 border border-blue-200 rounded-xl p-3 sm:p-4">
            <p className="font-medium text-blue-900 mb-1">{t('onboard.availability.advancedTip')}</p>
            <p className="text-blue-700">{t('onboard.availability.advancedExample')}</p>
          </div>
        </div>
      )}
    </div>
  );

  const renderRulesStep = () => (
    <div className="space-y-4 sm:space-y-6">
      <div className="text-center mb-6 sm:mb-8">
        <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2 sm:mb-3">{t('onboard.rules.title')}</h2>
        <p className="text-sm sm:text-base text-gray-600">{t('onboard.rules.subtitle')}</p>
      </div>

      <div className="space-y-3 sm:space-y-4">
        <div>
          <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">
            {t('onboard.rules.timeSlotDuration')}
            {validationErrors.timeSlotDuration && (
              <span className="text-red-600 text-xs ml-1 sm:ml-2">{validationErrors.timeSlotDuration}</span>
            )}
          </label>
          <input
            type="number"
            value={timeSlotDuration}
            onChange={(e) => setTimeSlotDuration(Number(e.target.value))}
            min={5}
            max={480}
            step={5}
            className={`w-full px-3 sm:px-4 py-2.5 sm:py-3 text-sm sm:text-base text-gray-900 border-2 rounded-xl focus:ring-2 focus:ring-teal-500 focus:border-transparent transition-colors ${
              validationErrors.timeSlotDuration ? 'border-red-300 bg-red-50' : 'border-gray-300'
            }`}
          />
          <p className="text-xs sm:text-sm text-gray-500 mt-1">
            {t('onboard.rules.timeSlotHelp')}
          </p>
        </div>

        <div>
          <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">
            {t('onboard.rules.maxSimultaneous')}
            {validationErrors.maxSimultaneousBookings && (
              <span className="text-red-600 text-xs ml-1 sm:ml-2">{validationErrors.maxSimultaneousBookings}</span>
            )}
          </label>
          <input
            type="number"
            value={maxSimultaneousBookings}
            onChange={(e) => setMaxSimultaneousBookings(Number(e.target.value))}
            min={1}
            max={100}
            className={`w-full px-3 sm:px-4 py-2.5 sm:py-3 text-sm sm:text-base text-gray-900 border-2 rounded-xl focus:ring-2 focus:ring-teal-500 focus:border-transparent transition-colors ${
              validationErrors.maxSimultaneousBookings ? 'border-red-300 bg-red-50' : 'border-gray-300'
            }`}
          />
          <p className="text-xs sm:text-sm text-gray-500 mt-1">
            {t('onboard.rules.maxSimultaneousHelp')}
          </p>
        </div>

        <div>
          <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">
            {t('onboard.rules.advanceBooking')}
            {validationErrors.advanceBookingDays && (
              <span className="text-red-600 text-xs ml-1 sm:ml-2">{validationErrors.advanceBookingDays}</span>
            )}
          </label>
          <input
            type="number"
            value={advanceBookingDays}
            onChange={(e) => setAdvanceBookingDays(Number(e.target.value))}
            min={1}
            max={365}
            className={`w-full px-3 sm:px-4 py-2.5 sm:py-3 text-sm sm:text-base text-gray-900 border-2 rounded-xl focus:ring-2 focus:ring-teal-500 focus:border-transparent transition-colors ${
              validationErrors.advanceBookingDays ? 'border-red-300 bg-red-50' : 'border-gray-300'
            }`}
          />
          <p className="text-xs sm:text-sm text-gray-500 mt-1">
            {t('onboard.rules.advanceBookingHelp')}
          </p>
        </div>

        <div className="pt-3 sm:pt-4 border-t border-gray-200">
          <p className="text-xs sm:text-sm font-medium text-gray-700 mb-2 sm:mb-3">{t('onboard.rules.customerRequirements')}</p>
          <div className="space-y-2">
            <label className="flex items-center gap-2 sm:gap-3">
              <input
                type="checkbox"
                checked={requireEmail}
                onChange={(e) => setRequireEmail(e.target.checked)}
                className="w-4 h-4 sm:w-5 sm:h-5 rounded-md border-2 border-gray-300 text-teal-600 focus:ring-2 focus:ring-teal-500 focus:ring-offset-0 transition-all"
              />
              <span className="text-xs sm:text-sm font-medium text-gray-700">{t('onboard.rules.requireEmail')}</span>
            </label>
            <label className="flex items-center gap-2 sm:gap-3">
              <input
                type="checkbox"
                checked={requirePhone}
                onChange={(e) => setRequirePhone(e.target.checked)}
                className="w-4 h-4 sm:w-5 sm:h-5 rounded-md border-2 border-gray-300 text-teal-600 focus:ring-2 focus:ring-teal-500 focus:ring-offset-0 transition-all"
              />
              <span className="text-xs sm:text-sm font-medium text-gray-700">{t('onboard.rules.requirePhone')}</span>
            </label>
            <label className="flex items-center gap-2 sm:gap-3">
              <input
                type="checkbox"
                checked={allowGuestBooking}
                onChange={(e) => setAllowGuestBooking(e.target.checked)}
                className="w-4 h-4 sm:w-5 sm:h-5 rounded-md border-2 border-gray-300 text-teal-600 focus:ring-2 focus:ring-teal-500 focus:ring-offset-0 transition-all"
              />
              <span className="text-xs sm:text-sm font-medium text-gray-700">{t('onboard.rules.allowGuest')}</span>
            </label>
          </div>
        </div>
      </div>
    </div>
  );

  const renderDetailsStep = () => (
    <div className="space-y-4 sm:space-y-6">
      <div className="text-center mb-6 sm:mb-8">
        <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2 sm:mb-3">{t('onboard.details.title')}</h2>
        <p className="text-sm sm:text-base text-gray-600">{t('onboard.details.subtitle')}</p>
      </div>

      <div className="space-y-4 sm:space-y-6">
        {/* Booking Policies */}
        <div className="border-2 border-gray-200 rounded-xl sm:rounded-2xl p-4 sm:p-6">
          <h3 className="text-base sm:text-lg font-semibold text-gray-900 mb-3 sm:mb-4">{t('onboard.details.bookingPolicies')}</h3>
          <div className="space-y-3 sm:space-y-4">
            <div>
              <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">
                {t('onboard.details.minAdvanceTime')}
              </label>
              <input
                type="number"
                value={minAdvanceBookingMinutes}
                onChange={(e) => setMinAdvanceBookingMinutes(Number(e.target.value))}
                min={0}
                step={15}
                className="w-full px-3 sm:px-4 py-2.5 sm:py-3 text-sm sm:text-base text-gray-900 border border-gray-300 rounded-xl focus:ring-2 focus:ring-teal-500 focus:border-transparent"
              />
              <p className="text-xs sm:text-sm text-gray-500 mt-1">{t('onboard.details.minAdvanceHelp')}</p>
            </div>
          </div>
        </div>

        {/* Notifications */}
        <div className="border-2 border-gray-200 rounded-xl sm:rounded-2xl p-4 sm:p-6">
          <h3 className="text-base sm:text-lg font-semibold text-gray-900 mb-3 sm:mb-4">{t('onboard.details.notifications')}</h3>
          <div>
            <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">
              {t('onboard.details.reminderEmail')}
            </label>
            <input
              type="number"
              value={reminderHoursBefore}
              onChange={(e) => setReminderHoursBefore(Number(e.target.value))}
              min={0}
              step={1}
              className="w-full px-3 sm:px-4 py-2.5 sm:py-3 text-sm sm:text-base text-gray-900 border border-gray-300 rounded-xl focus:ring-2 focus:ring-teal-500 focus:border-transparent"
            />
          </div>
        </div>

        <div className="text-center text-xs sm:text-sm text-gray-500 bg-gray-50 border border-gray-200 rounded-xl p-3 sm:p-4">
          {t('onboard.details.skipNote')}
        </div>
      </div>
    </div>
  );

  const renderReviewStep = () => (
    <div className="space-y-4 sm:space-y-6">
      <div className="text-center mb-6 sm:mb-8">
        <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2 sm:mb-3">{t('onboard.review.title')}</h2>
        <p className="text-sm sm:text-base text-gray-600">{t('onboard.review.subtitle')}</p>
      </div>

      <div className="space-y-3 sm:space-y-4">
        <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 sm:p-6">
          <h3 className="text-base sm:text-lg font-semibold text-gray-900 mb-3 sm:mb-4">{t('onboard.review.businessDetails')}</h3>
          <dl className="space-y-1.5 sm:space-y-2 text-xs sm:text-sm">
            <div className="flex justify-between gap-2">
              <dt className="text-gray-600">{t('onboard.review.businessName')}:</dt>
              <dd className="font-medium text-gray-900 truncate">{businessName || '—'}</dd>
            </div>
            <div className="flex justify-between gap-2">
              <dt className="text-gray-600">{t('onboard.review.subdomain')}:</dt>
              <dd className="font-medium text-gray-900 truncate">{businessId ? `${businessId}.rhivo.app` : '—'}</dd>
            </div>
            <div className="flex justify-between gap-2">
              <dt className="text-gray-600">{t('onboard.review.timezone')}:</dt>
              <dd className="font-medium text-gray-900 text-right">{timezone}</dd>
            </div>
            <div className="flex justify-between gap-2">
              <dt className="text-gray-600">{t('onboard.review.currency')}:</dt>
              <dd className="font-medium text-gray-900">{currency}</dd>
            </div>
          </dl>
        </div>

        <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 sm:p-6">
          <h3 className="text-base sm:text-lg font-semibold text-gray-900 mb-3 sm:mb-4">{t('onboard.review.contact')}</h3>
          <dl className="space-y-1.5 sm:space-y-2 text-xs sm:text-sm">
            <div className="flex justify-between gap-2">
              <dt className="text-gray-600">{t('onboard.review.phone')}:</dt>
              <dd className="font-medium text-gray-900 truncate">{phone || '—'}</dd>
            </div>
            <div className="flex justify-between gap-2">
              <dt className="text-gray-600">{t('onboard.review.location')}:</dt>
              <dd className="font-medium text-gray-900 text-right truncate">
                {city && state ? `${city}, ${state}` : '—'}
              </dd>
            </div>
          </dl>
        </div>

        {categories.length > 0 && (
          <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 sm:p-6">
            <h3 className="text-base sm:text-lg font-semibold text-gray-900 mb-3 sm:mb-4">{t('onboard.review.services')}</h3>
            <div className="space-y-2 sm:space-y-3">
              {categories.map((category) => (
                <div key={category.id}>
                  <p className="text-xs sm:text-sm font-semibold text-gray-900">{category.name}</p>
                  <ul className="mt-1 space-y-0.5 sm:space-y-1">
                    {category.services.map((service) => (
                      <li key={service.id} className="text-xs sm:text-sm text-gray-600 flex items-center gap-1.5 sm:gap-2">
                        {service.color && (
                          <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full flex-shrink-0" style={{ backgroundColor: service.color }} />
                        )}
                        <span className="break-words">{service.name} — {service.duration}{t('onboard.review.minutesShort')} — €{service.price.toFixed(2)}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 sm:p-6">
          <h3 className="text-base sm:text-lg font-semibold text-gray-900 mb-3 sm:mb-4">{t('onboard.review.bookingSettings')}</h3>
          <dl className="space-y-1.5 sm:space-y-2 text-xs sm:text-sm">
            <div className="flex justify-between gap-2">
              <dt className="text-gray-600">{t('onboard.review.timeSlotDuration')}:</dt>
              <dd className="font-medium text-gray-900">{timeSlotDuration} {t('onboard.review.minutes')}</dd>
            </div>
            <div className="flex justify-between gap-2">
              <dt className="text-gray-600">{t('onboard.review.advanceBooking')}:</dt>
              <dd className="font-medium text-gray-900">{advanceBookingDays} {t('onboard.review.days')}</dd>
            </div>
            <div className="flex justify-between gap-2">
              <dt className="text-gray-600">{t('onboard.review.openDays')}:</dt>
              <dd className="font-medium text-gray-900">
                {getAvailabilityForSubmit().filter(d => d.enabled).length} {t('onboard.review.daysPerWeek')}
              </dd>
            </div>
            {availabilityMode === 'advanced' && (
              <div className="flex justify-between gap-2">
                <dt className="text-gray-600">{t('onboard.review.splitShifts')}:</dt>
                <dd className="font-medium text-gray-900">
                  {availability.filter(d => d.enabled && d.slots.length > 1).length} {t('onboard.review.days')}
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
        instagram,
        facebook,
        latitude,
        longitude,

        // Branding
        primaryColor,
        secondaryColor,
        profileImageUrl,
        coverImageUrl,

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
        // New owner - show verification modal
        setVerificationEmail(email);
        setShowVerificationModal(true);
      }
    } catch (err: unknown) {
      console.error('Submission error:', err);
      setError(err instanceof Error ? err.message : 'Failed to register business. Please try again.');
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

      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-6 sm:py-12">
        {/* Logo */}
        <div className="text-center mb-6 sm:mb-12 pt-4 sm:pt-8">
          <div className="inline-flex items-center mb-4 sm:mb-8">
            <Logo size="sm" />
          </div>
        </div>

        {/* Step content */}
        <div className="bg-white border-2 border-gray-200 rounded-2xl sm:rounded-3xl p-4 sm:p-6 md:p-12">
          {/* Validation errors summary */}
          {Object.keys(validationErrors).length > 0 && (
            <div className="mb-4 sm:mb-6 p-3 sm:p-4 bg-red-50 border-2 border-red-200 rounded-xl">
              <div className="flex items-start gap-2 sm:gap-3">
                <svg className="w-4 h-4 sm:w-5 sm:h-5 text-red-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <div className="flex-1 min-w-0">
                  <h3 className="text-xs sm:text-sm font-semibold text-red-900 mb-1">{t('onboard.errors.fixErrors')}</h3>
                  <ul className="text-xs sm:text-sm text-red-700 space-y-0.5 sm:space-y-1">
                    {Object.entries(validationErrors).map(([field, error]) => (
                      <li key={field} className="break-words">• {error}</li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          )}

          {renderStep()}

          {error && (
            <div className="mt-4 sm:mt-6 p-3 sm:p-4 bg-red-50 border border-red-200 rounded-xl text-xs sm:text-sm text-red-700 break-words">
              {error}
            </div>
          )}

          {/* Navigation */}
          <div className="flex items-center justify-between gap-2 sm:gap-4 mt-6 sm:mt-8 pt-6 sm:pt-8 border-t border-gray-200">
            {currentStepIndex > 0 ? (
              <button
                onClick={handleBack}
                className="px-4 sm:px-6 py-2.5 sm:py-3 text-sm sm:text-base text-gray-700 font-semibold hover:bg-gray-50 rounded-xl transition-all active:scale-95"
              >
                {t('onboard.navigation.back')}
              </button>
            ) : (
              <div />
            )}

            {currentStepIndex < steps.length - 1 ? (
              <button
                onClick={handleNext}
                className="px-4 sm:px-6 py-2.5 sm:py-3 text-sm sm:text-base bg-gradient-to-r from-teal-600 to-green-600 text-white rounded-xl sm:rounded-2xl font-semibold hover:shadow-lg active:scale-95 transition-all"
              >
                {t('onboard.navigation.continue')}
              </button>
            ) : (
              <button
                onClick={handleSubmit}
                disabled={loading}
                className="px-4 sm:px-6 py-2.5 sm:py-3 text-sm sm:text-base bg-gradient-to-r from-teal-600 to-green-600 text-white rounded-xl sm:rounded-2xl font-semibold hover:shadow-lg active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? t('onboard.navigation.creating') : t('onboard.navigation.createBusiness')}
              </button>
            )}
          </div>

          {/* Step indicator */}
          <div className="flex justify-center gap-1.5 sm:gap-2 mt-4 sm:mt-6">
            {steps.map((step, index) => (
              <div
                key={step}
                className={`h-1.5 sm:h-2 rounded-full transition-all ${
                  index === currentStepIndex
                    ? 'w-6 sm:w-8 bg-gradient-to-r from-teal-600 to-green-600'
                    : index < currentStepIndex
                    ? 'w-1.5 sm:w-2 bg-gray-400'
                    : 'w-1.5 sm:w-2 bg-gray-200'
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

      {/* Email Verification Modal */}
      <EmailVerificationModal
        isOpen={showVerificationModal}
        onClose={() => {
          setShowVerificationModal(false);
          router.push('/auth/login');
        }}
        email={verificationEmail}
        onResend={async () => {
          const response = await fetch('/api/auth/resend-verification', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: verificationEmail }),
          });

          if (!response.ok) {
            throw new Error('Failed to resend verification email');
          }
        }}
      />
    </div>
  );
}
