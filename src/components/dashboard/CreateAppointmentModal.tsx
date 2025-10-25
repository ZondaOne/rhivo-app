'use client';

import { useState, useEffect } from 'react';
import { useTranslations, useLocale } from 'next-intl';
import { apiRequest } from '@/lib/auth/api-client';
import { mapErrorToUserMessage } from '@/lib/errors/error-mapper';
import { formatTime, formatDate } from '@/lib/calendar-utils';
import { useToast } from '@/hooks/useToast';
import { ToastContainer } from '@/components/ui/ToastContainer';

interface Service {
  id: string;
  name: string;
  duration_minutes: number;
  price_cents: number;
  category_id: string;
  category_name: string;
  color?: string;
  description?: string;
}

interface Category {
  id: string;
  name: string;
  services: Service[];
}

interface TimeSlot {
  start: string;
  end: string;
  available: boolean;
  capacity?: { current: number; max: number };
}

interface CreateAppointmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  defaultDate?: Date;
  businessId?: string | null;
}

type Step = 'category' | 'service' | 'datetime' | 'customer';

export function CreateAppointmentModal({
  isOpen,
  onClose,
  onSuccess,
  defaultDate,
  businessId
}: CreateAppointmentModalProps) {
  const t = useTranslations('dashboard.createAppointment');
  const locale = useLocale();
  const { toasts, showToast, removeToast } = useToast();
  const [currentStep, setCurrentStep] = useState<Step>('category');
  const [loading, setLoading] = useState(false);
  const [loadingSlots, setLoadingSlots] = useState(false);

  // Categories and services state
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null);
  const [selectedService, setSelectedService] = useState<Service | null>(null);
  const [businessCurrency, setBusinessCurrency] = useState<string>('EUR');

  // Date/Time state
  const [selectedDate, setSelectedDate] = useState<Date>(defaultDate || new Date());
  const [availableSlots, setAvailableSlots] = useState<TimeSlot[]>([]);
  const [selectedSlot, setSelectedSlot] = useState<TimeSlot | null>(null);
  const [currentWeekStart, setCurrentWeekStart] = useState<Date>(() => getWeekStart(defaultDate || new Date()));
  const [dateAvailability, setDateAvailability] = useState<Map<string, boolean>>(new Map());
  const [loadingAvailability, setLoadingAvailability] = useState(false);
  const [touchStart, setTouchStart] = useState<number | null>(null);
  const [touchEnd, setTouchEnd] = useState<number | null>(null);

  // Customer info state
  const [customerName, setCustomerName] = useState('');
  const [customerEmail, setCustomerEmail] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [notes, setNotes] = useState('');

  // Validation errors state
  const [validationErrors, setValidationErrors] = useState<{
    customer_name?: string[];
    customer_email?: string[];
    customer_phone?: string[];
    notes?: string[];
    service_id?: string[];
    start_time?: string[];
  }>({});

  useEffect(() => {
    if (isOpen) {
      loadServicesAndConfig();
      resetForm();
    }
  }, [isOpen, businessId]);

  useEffect(() => {
    if (selectedService && selectedDate && currentStep === 'datetime') {
      loadAvailableSlots();
    }
  }, [selectedService, selectedDate, currentStep]);

  useEffect(() => {
    if (selectedService && currentStep === 'datetime') {
      loadWeekAvailability();
    }
  }, [selectedService, currentWeekStart, currentStep]);

  async function loadServicesAndConfig() {
    try {
      // Load services
      const url = businessId
        ? `/api/services?businessId=${businessId}`
        : '/api/services';
      const servicesData = await apiRequest<Service[]>(url);

      // Try to load business config to get currency
      try {
        // First try to get from current user's business
        const businessesResponse = await apiRequest<any[]>('/api/businesses');
        if (businessesResponse && businessesResponse.length > 0) {
          const currentBusiness = businessId
            ? businessesResponse.find((b: any) => b.id === businessId)
            : businessesResponse[0];

          if (currentBusiness?.config_yaml_path) {
            // Load config from the business
            const configResponse = await fetch(`/api/config/tenant?businessId=${currentBusiness.id}`);
            const configData = await configResponse.json();
            if (configData.success && configData.config?.business?.currency) {
              setBusinessCurrency(configData.config.business.currency);
            }
          }
        }
      } catch (err) {
        console.warn('Failed to load business config, using default EUR currency');
      }

      // Group services by category
      const categoryMap = new Map<string, Category>();

      servicesData.forEach(service => {
        const categoryId = service.category_id || 'uncategorized';
        const categoryName = service.category_name || 'Services';

        if (!categoryMap.has(categoryId)) {
          categoryMap.set(categoryId, {
            id: categoryId,
            name: categoryName,
            services: [],
          });
        }

        categoryMap.get(categoryId)!.services.push(service);
      });

      const categoriesArray = Array.from(categoryMap.values());
      setCategories(categoriesArray);

      // Auto-select first category if only one exists
      if (categoriesArray.length === 1) {
        setSelectedCategory(categoriesArray[0]);
        setCurrentStep('service');
      }
    } catch (error) {
      console.error('Failed to load services:', error);
      showToast(mapErrorToUserMessage(error), 'error');
    }
  }

  async function loadAvailableSlots() {
    if (!selectedService) return;

    setLoadingSlots(true);
    try {
      // Format date in local timezone to avoid timezone conversion bugs
      const year = selectedDate.getFullYear();
      const month = String(selectedDate.getMonth() + 1).padStart(2, '0');
      const day = String(selectedDate.getDate()).padStart(2, '0');
      const dateStr = `${year}-${month}-${day}`;

      const response = await apiRequest<{ slots: TimeSlot[] }>(
        `/api/appointments/available-slots?serviceId=${selectedService.id}&date=${dateStr}`
      );
      setAvailableSlots(response.slots || []);
      setSelectedSlot(null);
    } catch (error: any) {
      if (error?.name === 'AbortError') {
        // Request was cancelled, this is expected
        return;
      }
      console.error('Failed to load slots:', error);
      showToast(t('error.loadSlotsFailed'), 'error');
      setAvailableSlots([]);
    } finally {
      setLoadingSlots(false);
    }
  }

  function resetForm() {
    setCurrentStep(categories.length === 1 ? 'service' : 'category');
    setSelectedCategory(categories.length === 1 ? categories[0] : null);
    setSelectedService(null);
    const resetDate = defaultDate || new Date();
    setSelectedDate(resetDate);
    setCurrentWeekStart(getWeekStart(resetDate));
    setSelectedSlot(null);
    setCustomerName('');
    setCustomerEmail('');
    setCustomerPhone('');
    setNotes('');
    setAvailableSlots([]);
    setValidationErrors({});
    setDateAvailability(new Map());
  }

  async function handleCreateAppointment() {
    if (!selectedService || !selectedSlot) {
      showToast(t('validation.completeRequired'), 'warning');
      return;
    }

    // Clear previous validation errors
    setValidationErrors({});
    setLoading(true);

    try {
      await apiRequest('/api/appointments/manual', {
        method: 'POST',
        body: JSON.stringify({
          customer_name: customerName,
          customer_email: customerEmail,
          customer_phone: customerPhone,
          service_id: selectedService.id,
          start_time: new Date(selectedSlot.start).toISOString(),
          duration: selectedService.duration_minutes,
          notes,
          status: 'confirmed',
        }),
      });

      showToast(t('success.message'), 'success');
      onSuccess();
      onClose();
      resetForm();
    } catch (error: any) {
      console.error('Failed to create appointment:', error);
      
      // Check if error has validation errors from the API
      if (error?.details?.errors || error?.errors) {
        const errors = error.details?.errors || error.errors;
        setValidationErrors(errors);
        // Don't show toast for validation errors, just show inline errors
      } else {
        // For other errors, show toast
        showToast(mapErrorToUserMessage(error), 'error');
      }
    } finally {
      setLoading(false);
    }
  }

  function handleClose() {
    if (!loading) {
      onClose();
      resetForm();
    }
  }

  function goToNextStep() {
    if (currentStep === 'category' && selectedCategory) {
      setCurrentStep('service');
    } else if (currentStep === 'service' && selectedService) {
      setCurrentStep('datetime');
    } else if (currentStep === 'datetime' && selectedSlot) {
      setCurrentStep('customer');
    }
  }

  function goToPreviousStep() {
    if (currentStep === 'customer') {
      setCurrentStep('datetime');
    } else if (currentStep === 'datetime') {
      setCurrentStep('service');
    } else if (currentStep === 'service' && categories.length > 1) {
      setCurrentStep('category');
    }
  }

  function getDateRange(): Date[] {
    const dates: Date[] = [];
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    for (let i = 0; i < 60; i++) {
      const date = new Date(today);
      date.setDate(today.getDate() + i);
      dates.push(date);
    }

    return dates;
  }

  function isToday(date: Date): boolean {
    const today = new Date();
    return date.toDateString() === today.toDateString();
  }

  function isSameDay(date1: Date, date2: Date): boolean {
    return date1.toDateString() === date2.toDateString();
  }

  function getWeekStart(date: Date): Date {
    const d = new Date(date);
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1); // Adjust when day is Sunday
    const weekStart = new Date(d.setDate(diff));
    weekStart.setHours(0, 0, 0, 0);
    return weekStart;
  }

  function getWeekDates(weekStart: Date): Date[] {
    const dates: Date[] = [];
    for (let i = 0; i < 7; i++) {
      const date = new Date(weekStart);
      date.setDate(weekStart.getDate() + i);
      dates.push(date);
    }
    return dates;
  }

  function goToPreviousWeek() {
    const newWeekStart = new Date(currentWeekStart);
    newWeekStart.setDate(currentWeekStart.getDate() - 7);
    setCurrentWeekStart(newWeekStart);
  }

  function goToNextWeek() {
    const newWeekStart = new Date(currentWeekStart);
    newWeekStart.setDate(currentWeekStart.getDate() + 7);
    setCurrentWeekStart(newWeekStart);
  }

  function goToCurrentWeek() {
    const today = new Date();
    setCurrentWeekStart(getWeekStart(today));
    setSelectedDate(today);
  }

  async function loadWeekAvailability() {
    if (!selectedService) return;

    setLoadingAvailability(true);
    const weekDates = getWeekDates(currentWeekStart);
    const availabilityMap = new Map<string, boolean>();

    try {
      // Fetch availability for all dates in the week in parallel
      const availabilityPromises = weekDates.map(async (date) => {
        try {
          const year = date.getFullYear();
          const month = String(date.getMonth() + 1).padStart(2, '0');
          const day = String(date.getDate()).padStart(2, '0');
          const dateStr = `${year}-${month}-${day}`;

          const response = await apiRequest<{ slots: TimeSlot[] }>(
            `/api/appointments/available-slots?serviceId=${selectedService.id}&date=${dateStr}`
          );

          // Check if there are any available slots
          const hasAvailableSlots = response.slots.some(slot => slot.available);
          return { dateStr, hasAvailableSlots };
        } catch (error) {
          console.error(`Failed to load availability for ${date.toISOString()}:`, error);
          return { dateStr: '', hasAvailableSlots: false };
        }
      });

      const results = await Promise.all(availabilityPromises);
      results.forEach(({ dateStr, hasAvailableSlots }) => {
        if (dateStr) {
          availabilityMap.set(dateStr, hasAvailableSlots);
        }
      });

      setDateAvailability(availabilityMap);
    } catch (error) {
      console.error('Failed to load week availability:', error);
    } finally {
      setLoadingAvailability(false);
    }
  }

  function handleTouchStart(e: React.TouchEvent) {
    setTouchEnd(null);
    setTouchStart(e.targetTouches[0].clientX);
  }

  function handleTouchMove(e: React.TouchEvent) {
    setTouchEnd(e.targetTouches[0].clientX);
  }

  function handleTouchEnd() {
    if (!touchStart || !touchEnd) return;

    const distance = touchStart - touchEnd;
    const isLeftSwipe = distance > 50;
    const isRightSwipe = distance < -50;

    if (isLeftSwipe) {
      goToNextWeek();
    } else if (isRightSwipe) {
      goToPreviousWeek();
    }
  }

  function formatDateKey(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  function getMonthLabel(dates: Date[]): string {
    if (dates.length === 0) return '';

    const firstDate = dates[0];
    const lastDate = dates[dates.length - 1];

    const firstMonth = firstDate.toLocaleDateString(locale, { month: 'long', year: 'numeric' });
    const lastMonth = lastDate.toLocaleDateString(locale, { month: 'long', year: 'numeric' });

    if (firstMonth === lastMonth) {
      return firstMonth;
    } else {
      return `${firstDate.toLocaleDateString(locale, { month: 'short' })} - ${lastDate.toLocaleDateString(locale, { month: 'short', year: 'numeric' })}`;
    }
  }

  const totalSteps = categories.length > 1 ? 4 : 3;
  const currentStepNumber =
    currentStep === 'category' ? 1 :
    currentStep === 'service' ? (categories.length > 1 ? 2 : 1) :
    currentStep === 'datetime' ? (categories.length > 1 ? 3 : 2) :
    totalSteps;

  if (!isOpen) return null;

  return (
    <>
      {/* Mobile: Full-screen overlay, Tablet: 90% width, Desktop: Centered modal with max-width */}
      <div className="fixed inset-0 bg-gray-900/40 backdrop-blur-sm flex items-end sm:items-center justify-center z-50 p-0 sm:p-4">
        {/* Toast Container - Outside modal, above modal z-index */}
        <div className="fixed top-4 right-4 z-[60]">
          <ToastContainer toasts={toasts} onRemove={removeToast} />
        </div>
        <div className="bg-white rounded-t-3xl sm:rounded-2xl shadow-2xl w-full sm:w-[90%] max-w-full sm:max-w-xl md:max-w-2xl lg:max-w-3xl h-[95vh] sm:h-auto sm:max-h-[90vh] overflow-hidden flex flex-col animate-slide-up sm:animate-none">
          {/* Header */}
          <div className="flex-shrink-0 px-4 sm:px-6 lg:px-8 py-4 sm:py-5 lg:py-6 border-b border-gray-100 bg-white">
            <div className="flex items-center justify-between">
              <div className="flex-1 min-w-0 pr-3">
                <h2 className="text-xl sm:text-2xl font-bold text-gray-900 tracking-tight truncate">{t('title')}</h2>
                <p className="text-xs sm:text-sm text-gray-500 mt-1 truncate">
                  {currentStep === 'category' && t('subtitle.category')}
                  {currentStep === 'service' && t('subtitle.service')}
                  {currentStep === 'datetime' && t('subtitle.datetime')}
                  {currentStep === 'customer' && t('subtitle.customer')}
                </p>
              </div>
              <button
                onClick={handleClose}
                disabled={loading}
                className="flex-shrink-0 w-10 h-10 flex items-center justify-center rounded-full hover:bg-gray-100 text-gray-400 hover:text-gray-900 transition-all"
              >
                <svg className="w-5 h-5 sm:w-6 sm:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Progress Indicator */}
            <div className="flex items-center gap-1.5 sm:gap-2 mt-4 sm:mt-6">
              {Array.from({ length: totalSteps }).map((_, index) => (
                <div
                  key={index}
                  className={`flex-1 h-1 rounded-full transition-all ${
                    index < currentStepNumber ? 'bg-gradient-to-r from-teal-600 to-green-600' : 'bg-gray-200'
                  }`}
                />
              ))}
            </div>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-5 lg:py-6 modal-scroll">{/* Step 1: Category Selection (only if multiple categories) */}
            {currentStep === 'category' && categories.length > 1 && (
              <div className="space-y-4 sm:space-y-6">
                <div>
                  <h3 className="text-xs sm:text-sm font-bold text-gray-900 uppercase tracking-wider mb-3 sm:mb-4">
                    {t('category.title')}
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-3">
                    {categories.map((category) => (
                      <button
                        key={category.id}
                        onClick={() => setSelectedCategory(category)}
                        className={`
                          p-4 sm:p-5 rounded-xl border-2 text-left transition-all
                          ${selectedCategory?.id === category.id
                            ? 'border-teal-500 bg-gradient-to-br from-teal-50 to-green-50 shadow-md'
                            : 'border-gray-200 bg-white hover:border-teal-300 hover:bg-teal-50'
                          }
                        `}
                      >
                        <div className="text-sm sm:text-base font-bold text-gray-900">{category.name}</div>
                        <div className="text-xs sm:text-sm text-gray-500 mt-1">
                          {category.services.length} {t(category.services.length === 1 ? 'category.services' : 'category.services_plural', { count: category.services.length })}
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Step 2: Service Selection */}
            {currentStep === 'service' && selectedCategory && (
              <div className="space-y-4 sm:space-y-6">
                {categories.length > 1 && (
                  <div className="bg-gray-50 border border-gray-100 rounded-xl p-3 sm:p-4">
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="text-xs sm:text-sm font-semibold text-gray-900 truncate">{selectedCategory.name}</div>
                        <div className="text-[10px] sm:text-xs text-gray-500 mt-0.5 sm:mt-1">
                          {selectedCategory.services.length} {t(selectedCategory.services.length === 1 ? 'category.services' : 'category.services_plural', { count: selectedCategory.services.length })}
                        </div>
                      </div>
                      <button
                        onClick={() => {
                          setCurrentStep('category');
                          setSelectedService(null);
                        }}
                        className="text-xs sm:text-sm font-semibold text-teal-600 hover:text-teal-700 flex-shrink-0"
                      >
                        {t('service.change')}
                      </button>
                    </div>
                  </div>
                )}

                <div>
                  <h3 className="text-xs sm:text-sm font-bold text-gray-900 uppercase tracking-wider mb-3 sm:mb-4">
                    {t('service.title')}
                  </h3>
                  {selectedCategory.services.length === 0 ? (
                    <div className="text-center py-8 sm:py-12 bg-gray-50 border border-gray-100 rounded-xl">
                      <svg className="w-10 h-10 sm:w-12 sm:h-12 text-gray-300 mx-auto mb-2 sm:mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
                      </svg>
                      <p className="text-xs sm:text-sm font-semibold text-gray-900">{t('service.noServices')}</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 gap-2 sm:gap-3">
                      {selectedCategory.services.map((service) => (
                        <button
                          key={service.id}
                          onClick={() => setSelectedService(service)}
                          className={`
                            p-4 sm:p-5 rounded-xl border-2 text-left transition-all
                            ${selectedService?.id === service.id
                              ? 'border-teal-500 bg-gradient-to-br from-teal-50 to-green-50 shadow-md'
                              : 'border-gray-200 bg-white hover:border-teal-300 hover:bg-teal-50'
                            }
                          `}
                        >
                          <div className="flex items-start justify-between gap-3 sm:gap-4">
                            <div className="flex-1 min-w-0">
                              <div className="text-sm sm:text-base font-bold text-gray-900 mb-1">{service.name}</div>
                              {service.description && (
                                <div className="text-xs sm:text-sm text-gray-500 mb-2 line-clamp-2">{service.description}</div>
                              )}
                              <div className="flex items-center gap-2 sm:gap-3 text-xs sm:text-sm">
                                <div className="flex items-center gap-1 sm:gap-1.5 text-gray-600">
                                  <svg className="w-3.5 h-3.5 sm:w-4 sm:h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
                                  </svg>
                                  {service.duration_minutes} min
                                </div>
                              </div>
                            </div>
                            <div className="text-right flex-shrink-0">
                              <div className="text-base sm:text-lg font-bold text-gray-900">
                                {(service.price_cents / 100).toFixed(2)} {businessCurrency}
                              </div>
                            </div>
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Step 3: Date & Time Selection */}
            {currentStep === 'datetime' && selectedService && (
              <div className="space-y-4 sm:space-y-6">
                {/* Selected Service Summary */}
                <div className="bg-gray-50 border border-gray-100 rounded-xl p-3 sm:p-4">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="text-xs sm:text-sm font-semibold text-gray-900 truncate">{selectedService.name}</div>
                      <div className="text-[10px] sm:text-xs text-gray-500 mt-0.5 sm:mt-1">
                        {selectedService.duration_minutes} min · {(selectedService.price_cents / 100).toFixed(2)} {businessCurrency}
                      </div>
                    </div>
                    <button
                      onClick={() => setCurrentStep('service')}
                      className="text-xs sm:text-sm font-semibold text-teal-600 hover:text-teal-700 flex-shrink-0"
                    >
                      {t('service.change')}
                    </button>
                  </div>
                </div>

                {/* Week Navigation */}
                <div>
                  <div className="flex items-center justify-between mb-3 sm:mb-4">
                    <label className="text-xs sm:text-sm font-bold text-gray-900 uppercase tracking-wider">
                      {t('datetime.selectDate_label')}
                    </label>
                    <button
                      onClick={goToCurrentWeek}
                      className="text-[10px] sm:text-xs font-semibold text-teal-600 hover:text-teal-700 px-2 py-1 hover:bg-teal-50 rounded-lg transition-all"
                    >
                      {t('datetime.today', 'Today')}
                    </button>
                  </div>

                  {/* Month Label */}
                  <div className="flex items-center justify-between mb-2 sm:mb-3">
                    <button
                      onClick={goToPreviousWeek}
                      className="p-2 hover:bg-gray-100 rounded-lg transition-all flex-shrink-0"
                      aria-label="Previous week"
                    >
                      <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                      </svg>
                    </button>

                    <div className="text-sm sm:text-base font-semibold text-gray-700 text-center">
                      {getMonthLabel(getWeekDates(currentWeekStart))}
                    </div>

                    <button
                      onClick={goToNextWeek}
                      className="p-2 hover:bg-gray-100 rounded-lg transition-all flex-shrink-0"
                      aria-label="Next week"
                    >
                      <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </button>
                  </div>

                  {/* Week View with Swipe Support */}
                  <div
                    className="relative touch-pan-y"
                    onTouchStart={handleTouchStart}
                    onTouchMove={handleTouchMove}
                    onTouchEnd={handleTouchEnd}
                  >
                    {/* Loading Overlay */}
                    {loadingAvailability && (
                      <div className="absolute inset-0 bg-white/60 backdrop-blur-[2px] z-10 flex items-center justify-center rounded-xl">
                        <div className="flex flex-col items-center gap-2">
                          <div className="relative w-8 h-8">
                            <div className="absolute inset-0 border-3 border-teal-200 rounded-full" />
                            <div className="absolute inset-0 border-3 border-teal-600 rounded-full border-t-transparent animate-spin" />
                          </div>
                          <span className="text-xs text-gray-600 font-medium">Loading...</span>
                        </div>
                      </div>
                    )}

                    <div className={`grid grid-cols-7 gap-1 sm:gap-2 transition-opacity ${loadingAvailability ? 'opacity-40' : 'opacity-100'}`}>
                      {getWeekDates(currentWeekStart).map((date) => {
                        const isSelected = isSameDay(date, selectedDate);
                        const isCurrentDay = isToday(date);
                        const dateKey = formatDateKey(date);
                        const hasAvailability = dateAvailability.get(dateKey);
                        const isPast = date < new Date(new Date().setHours(0, 0, 0, 0));
                        const isDisabled = isPast || (hasAvailability === false && !loadingAvailability);

                        return (
                          <button
                            key={date.toISOString()}
                            onClick={() => !isDisabled && setSelectedDate(date)}
                            disabled={isDisabled || loadingAvailability}
                            className={`
                              relative flex flex-col items-center justify-center px-1 sm:px-2 py-3 sm:py-4 rounded-xl border-2 transition-all duration-200
                              ${isSelected
                                ? 'bg-teal-600 border-teal-600 text-white shadow-md scale-105'
                                : isDisabled
                                  ? 'bg-gray-50 border-gray-100 text-gray-300 cursor-not-allowed'
                                  : 'bg-white border-gray-200 text-gray-900 hover:border-teal-400 hover:bg-gradient-to-br hover:from-teal-50 hover:to-green-50 hover:shadow-md active:scale-95'
                              }
                            `}
                          >
                            {/* Weekday */}
                            <div className={`text-[9px] sm:text-[10px] font-semibold uppercase tracking-wider mb-0.5 sm:mb-1 ${isSelected ? 'text-white/90' : isDisabled ? 'text-gray-300' : 'text-gray-500'}`}>
                              {date.toLocaleDateString(locale, { weekday: 'short' })}
                            </div>

                            {/* Date Number */}
                            <div className={`text-sm sm:text-lg font-bold ${isSelected ? 'text-white' : isDisabled ? 'text-gray-300' : 'text-gray-900'}`}>
                              {date.getDate()}
                            </div>

                            {/* Availability Badge - Subtle bar at bottom instead of dot */}
                            {!isSelected && !isDisabled && hasAvailability && (
                              <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-8 sm:w-10 h-0.5 bg-gradient-to-r from-teal-400 to-green-400 rounded-t-full" />
                            )}

                            {/* Today Indicator - Small ring around date */}
                            {isCurrentDay && !isSelected && (
                              <div className="absolute inset-0 border-2 border-teal-500 rounded-xl pointer-events-none" />
                            )}
                          </button>
                        );
                      })}
                    </div>

                    {/* Swipe Indicator for Mobile */}
                    <div className="mt-3 sm:hidden flex items-center justify-center gap-1.5">
                      <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                      </svg>
                      <span className="text-[10px] text-gray-400 font-medium">Swipe to navigate</span>
                      <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </div>
                  </div>
                </div>

                {/* Time Slots */}
                <div>
                  <div className="flex items-center justify-between mb-2 sm:mb-3">
                    <label className="text-xs sm:text-sm font-bold text-gray-900 uppercase tracking-wider">
                      {t('datetime.selectTime_label')}
                    </label>
                    <span className="text-[10px] sm:text-xs text-gray-500">
                      {t('datetime.serviceMinutes', { minutes: selectedService.duration_minutes || 0 })}
                    </span>
                  </div>

                  {loadingSlots ? (
                    <div className="flex items-center justify-center py-8 sm:py-12">
                      <div className="animate-spin rounded-full h-6 w-6 sm:h-8 sm:w-8 border-b-2 border-teal-600" />
                    </div>
                  ) : availableSlots.length === 0 ? (
                    <div className="text-center py-8 sm:py-12 bg-gray-50 border border-gray-100 rounded-xl">
                      <svg className="w-10 h-10 sm:w-12 sm:h-12 text-gray-300 mx-auto mb-2 sm:mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <p className="text-xs sm:text-sm font-semibold text-gray-900">{t('datetime.noSlots')}</p>
                      <p className="text-[10px] sm:text-xs text-gray-500 mt-1">{t('datetime.noSlotsMessage')}</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-5 gap-1.5 sm:gap-2 max-h-[240px] sm:max-h-[300px] overflow-y-auto">
                      {availableSlots.map((slot, index) => {
                        const slotStart = new Date(slot.start);
                        const isSelected = selectedSlot?.start === slot.start;
                        const isAvailable = slot.available;

                        return (
                          <button
                            key={index}
                            onClick={() => isAvailable && setSelectedSlot(slot)}
                            disabled={!isAvailable}
                            className={`
                              relative px-2 sm:px-4 py-2.5 sm:py-3 rounded-xl text-xs sm:text-sm font-semibold transition-all duration-200 active:scale-95
                              ${isSelected
                                ? 'bg-teal-600 text-white shadow-md border-2 border-teal-600'
                                : isAvailable
                                  ? 'bg-white border-2 border-gray-200 text-gray-900 hover:border-teal-400 hover:bg-teal-50 hover:shadow-sm'
                                  : 'bg-gray-50 border-2 border-gray-100 text-gray-400 cursor-not-allowed'
                              }
                            `}
                          >
                            {formatTime(slotStart, locale)}
                            {/* Checkmark for selected slot */}
                            {isSelected && (
                              <svg className="absolute top-0.5 right-0.5 w-3 h-3 sm:w-3.5 sm:h-3.5 text-white" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                              </svg>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* Selected Slot Preview */}
                {selectedSlot && (
                  <div className="bg-teal-50 border border-teal-200 rounded-xl p-3 sm:p-4">
                    <div className="flex items-start gap-2 sm:gap-3">
                      <svg className="w-4 h-4 sm:w-5 sm:h-5 text-teal-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <div className="flex-1 min-w-0">
                        <div className="text-xs sm:text-sm font-semibold text-gray-900">{t('datetime.selectedSlot')}</div>
                        <div className="text-xs sm:text-sm text-gray-700 mt-0.5 sm:mt-1">
                          {formatDate(selectedDate, 'long', locale)} {t('datetime.at')} {formatTime(new Date(selectedSlot.start), locale)} - {formatTime(new Date(selectedSlot.end), locale)}
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Step 4: Customer Information */}
            {currentStep === 'customer' && selectedService && selectedSlot && (
              <div className="space-y-4 sm:space-y-6">
                {/* Appointment Summary */}
                <div className="bg-gray-50 border border-gray-100 rounded-xl p-4 sm:p-5">
                  <div className="text-[10px] sm:text-xs font-semibold uppercase tracking-wider text-gray-500 mb-2 sm:mb-3">
                    {t('summary.title')}
                  </div>
                  <div className="space-y-1.5 sm:space-y-2">
                    <div className="flex justify-between text-xs sm:text-sm gap-3">
                      <span className="text-gray-600">{t('summary.service')}</span>
                      <span className="font-semibold text-gray-900 text-right">{selectedService.name}</span>
                    </div>
                    <div className="flex justify-between text-xs sm:text-sm gap-3">
                      <span className="text-gray-600">{t('summary.dateTime')}</span>
                      <span className="font-semibold text-gray-900 text-right">
                        {formatDate(selectedDate, 'short', locale)} {t('summary.at')} {formatTime(new Date(selectedSlot.start), locale)}
                      </span>
                    </div>
                    <div className="flex justify-between text-xs sm:text-sm gap-3">
                      <span className="text-gray-600">{t('summary.duration')}</span>
                      <span className="font-semibold text-gray-900">{selectedService.duration_minutes} min</span>
                    </div>
                    <div className="flex justify-between text-xs sm:text-sm border-t border-gray-200 pt-1.5 sm:pt-2 mt-1.5 sm:mt-2 gap-3">
                      <span className="text-gray-600">{t('summary.price')}</span>
                      <span className="font-bold text-gray-900">
                        {(selectedService.price_cents / 100).toFixed(2)} {businessCurrency}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Validation Error Banner */}
                {Object.keys(validationErrors).length > 0 && (
                  <div className="bg-red-50 border border-red-200 rounded-xl p-3 sm:p-4">
                    <div className="flex items-start gap-2 sm:gap-3">
                      <svg className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                      </svg>
                      <div className="flex-1">
                        <div className="text-xs sm:text-sm font-semibold text-red-900">Please correct the following errors:</div>
                        <ul className="mt-1 text-xs text-red-700 list-disc list-inside">
                          {Object.entries(validationErrors).map(([field, errors]) => (
                            errors && errors.length > 0 && (
                              <li key={field}>{errors[0]}</li>
                            )
                          ))}
                        </ul>
                      </div>
                    </div>
                  </div>
                )}

                {/* Customer Form */}
                <div>
                  <h3 className="text-xs sm:text-sm font-bold text-gray-900 uppercase tracking-wider mb-3 sm:mb-4">
                    {t('customer.title')}
                  </h3>
                  <div className="space-y-3 sm:space-y-4">
                    <div>
                      <label htmlFor="customer_name" className="block text-xs sm:text-sm font-semibold text-gray-900 mb-1.5 sm:mb-2">
                        {t('customer.name')} <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        id="customer_name"
                        required
                        value={customerName}
                        onChange={(e) => {
                          setCustomerName(e.target.value);
                          // Clear validation error when user types
                          if (validationErrors.customer_name) {
                            setValidationErrors(prev => ({ ...prev, customer_name: undefined }));
                          }
                        }}
                        className={`w-full px-3 sm:px-4 py-2.5 sm:py-3 bg-white border rounded-xl text-sm text-gray-900 placeholder-gray-400 focus:ring-2 transition-all ${
                          validationErrors.customer_name
                            ? 'border-red-300 focus:ring-red-500 focus:border-red-500'
                            : 'border-gray-200 focus:ring-teal-500 focus:border-teal-500'
                        }`}
                        placeholder={t('customer.namePlaceholder')}
                      />
                      {validationErrors.customer_name && (
                        <p className="mt-1 text-xs text-red-600 flex items-center gap-1">
                          <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                          </svg>
                          {validationErrors.customer_name[0]}
                        </p>
                      )}
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                      <div>
                        <label htmlFor="customer_email" className="block text-xs sm:text-sm font-semibold text-gray-900 mb-1.5 sm:mb-2">
                          {t('customer.email')} <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="email"
                          id="customer_email"
                          required
                          value={customerEmail}
                          onChange={(e) => {
                            setCustomerEmail(e.target.value);
                            // Clear validation error when user types
                            if (validationErrors.customer_email) {
                              setValidationErrors(prev => ({ ...prev, customer_email: undefined }));
                            }
                          }}
                          className={`w-full px-3 sm:px-4 py-2.5 sm:py-3 bg-white border rounded-xl text-sm text-gray-900 placeholder-gray-400 focus:ring-2 transition-all ${
                            validationErrors.customer_email
                              ? 'border-red-300 focus:ring-red-500 focus:border-red-500'
                              : 'border-gray-200 focus:ring-teal-500 focus:border-teal-500'
                          }`}
                          placeholder={t('customer.emailPlaceholder')}
                        />
                        {validationErrors.customer_email && (
                          <p className="mt-1 text-xs text-red-600 flex items-center gap-1">
                            <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                            </svg>
                            {validationErrors.customer_email[0]}
                          </p>
                        )}
                      </div>

                      <div>
                        <label htmlFor="customer_phone" className="block text-xs sm:text-sm font-semibold text-gray-900 mb-1.5 sm:mb-2">
                          {t('customer.phone')}
                        </label>
                        <input
                          type="tel"
                          id="customer_phone"
                          value={customerPhone}
                          onChange={(e) => {
                            setCustomerPhone(e.target.value);
                            // Clear validation error when user types
                            if (validationErrors.customer_phone) {
                              setValidationErrors(prev => ({ ...prev, customer_phone: undefined }));
                            }
                          }}
                          className={`w-full px-3 sm:px-4 py-2.5 sm:py-3 bg-white border rounded-xl text-sm text-gray-900 placeholder-gray-400 focus:ring-2 transition-all ${
                            validationErrors.customer_phone
                              ? 'border-red-300 focus:ring-red-500 focus:border-red-500'
                              : 'border-gray-200 focus:ring-teal-500 focus:border-teal-500'
                          }`}
                          placeholder={t('customer.phonePlaceholder')}
                        />
                        {validationErrors.customer_phone && (
                          <p className="mt-1 text-xs text-red-600 flex items-center gap-1">
                            <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                            </svg>
                            {validationErrors.customer_phone[0]}
                          </p>
                        )}
                      </div>
                    </div>

                    <div>
                      <label htmlFor="notes" className="block text-xs sm:text-sm font-semibold text-gray-900 mb-1.5 sm:mb-2">
                        {t('customer.notes')}
                      </label>
                      <textarea
                        id="notes"
                        rows={3}
                        value={notes}
                        onChange={(e) => {
                          setNotes(e.target.value);
                          // Clear validation error when user types
                          if (validationErrors.notes) {
                            setValidationErrors(prev => ({ ...prev, notes: undefined }));
                          }
                        }}
                        className={`w-full px-3 sm:px-4 py-2.5 sm:py-3 bg-white border rounded-xl text-sm text-gray-900 placeholder-gray-400 focus:ring-2 transition-all resize-none ${
                          validationErrors.notes
                            ? 'border-red-300 focus:ring-red-500 focus:border-red-500'
                            : 'border-gray-200 focus:ring-teal-500 focus:border-teal-500'
                        }`}
                        placeholder={t('customer.notesPlaceholder')}
                      />
                      {validationErrors.notes && (
                        <p className="mt-1 text-xs text-red-600 flex items-center gap-1">
                          <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                          </svg>
                          {validationErrors.notes[0]}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Footer - Actions (Sticky on Mobile) */}
          <div className="flex-shrink-0 px-4 sm:px-6 lg:px-8 py-4 sm:py-5 lg:py-6 border-t border-gray-100 flex items-center justify-between gap-2 sm:gap-3 bg-white">
            <div>
              {(currentStep !== 'category' && !(currentStep === 'service' && categories.length === 1)) && (
                <button
                  onClick={goToPreviousStep}
                  disabled={loading}
                  className="px-4 sm:px-5 py-2 sm:py-2.5 text-xs sm:text-sm font-semibold text-gray-700 hover:bg-gray-50 rounded-xl transition-all flex items-center gap-1.5 sm:gap-2"
                >
                  <svg className="w-3.5 h-3.5 sm:w-4 sm:h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                  <span className="hidden sm:inline">{t('buttons.back')}</span>
                  <span className="sm:hidden">Back</span>
                </button>
              )}
            </div>

            <div className="flex gap-2 sm:gap-3">
              <button
                onClick={handleClose}
                disabled={loading}
                className="px-4 sm:px-5 py-2 sm:py-2.5 text-xs sm:text-sm font-semibold text-gray-700 hover:bg-gray-50 rounded-xl transition-all disabled:opacity-50"
              >
                {t('buttons.cancel')}
              </button>

              {currentStep === 'customer' ? (
                <button
                  onClick={handleCreateAppointment}
                  disabled={loading || !customerName || !customerEmail}
                  className="px-5 sm:px-6 py-2.5 sm:py-3 bg-gradient-to-r from-teal-600 to-green-600 text-white rounded-xl sm:rounded-2xl text-xs sm:text-base font-semibold hover:shadow-lg hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? t('buttons.creating') : t('buttons.create')}
                </button>
              ) : (
                <button
                  onClick={goToNextStep}
                  disabled={
                    (currentStep === 'category' && !selectedCategory) ||
                    (currentStep === 'service' && !selectedService) ||
                    (currentStep === 'datetime' && !selectedSlot)
                  }
                  className="px-5 sm:px-6 py-2.5 sm:py-3 bg-gradient-to-r from-teal-600 to-green-600 text-white rounded-xl sm:rounded-2xl text-xs sm:text-base font-semibold hover:shadow-lg hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1.5 sm:gap-2"
                >
                  {t('buttons.continue')}
                  <svg className="w-3.5 h-3.5 sm:w-4 sm:h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
