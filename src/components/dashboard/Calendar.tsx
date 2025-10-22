'use client';

import { useEffect, useState, Fragment, useRef } from 'react';
import { useTranslations } from 'next-intl';
import { CalendarView, generateMonthCalendar, generateTimeSlots, formatDate, formatTime, CalendarDay, TimeSlot, snapToGrain, getAppointmentDuration } from '@/lib/calendar-utils';
import { Appointment } from '@/db/types';
import { AppointmentCard } from './AppointmentCard';
import { DragDropRescheduleModal } from './DragDropRescheduleModal';
import { RescheduleAppointmentModal } from './RescheduleAppointmentModal';
import { apiRequest } from '@/lib/auth/api-client';
import { useAuth } from '@/contexts/AuthContext';
import { addStackingMetadata, StackedAppointment, groupByStartTime, allocateCascadeColumns, getCascadePositionStyles, getCascadeVisualClasses } from '@/lib/appointment-stacking';
import { Tooltip } from '@/components/ui/Tooltip';
import { ViewTransition, useViewTransitionDirection } from './ViewTransition';
import { MonthSkeleton, DaySkeleton, ListSkeleton } from './skeletons';
import { mapErrorToUserMessage } from '@/lib/errors/error-mapper';
import { useToast } from '@/hooks/useToast';
import { ToastContainer } from '@/components/ui/ToastContainer';

interface CalendarProps {
  view: CalendarView;
  currentDate: Date;
  onViewChange?: (view: CalendarView) => void;
  onDateChange?: (date: Date) => void;
  businessId?: string | null;
}

interface DragDropReschedule {
  appointment: Appointment;
  originalTime: Date;
  newTime: Date;
}

interface EditReschedule {
  appointment: Appointment;
}

interface AppointmentCache {
  appointments: Appointment[];
  start: Date;
  end: Date;
}

export function Calendar({ view, currentDate, onViewChange, onDateChange, businessId }: CalendarProps) {
  const t = useTranslations('dashboard.calendar');
  const { toasts, showToast, removeToast } = useToast();
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [appointmentCache, setAppointmentCache] = useState<AppointmentCache | null>(null);
  const [loading, setLoading] = useState(true);
  const [draggedAppointment, setDraggedAppointment] = useState<Appointment | null>(null);
  const [dragDropReschedule, setDragDropReschedule] = useState<DragDropReschedule | null>(null);
  const [editingAppointment, setEditingAppointment] = useState<EditReschedule | null>(null);
  const [rescheduleLoading, setRescheduleLoading] = useState(false);
  const [highlightedAppointmentId, setHighlightedAppointmentId] = useState<string | null>(null);
  const [previousView, setPreviousView] = useState<CalendarView>(view);
  const [abortController, setAbortController] = useState<AbortController | null>(null);
  const { isAuthenticated, isLoading: authLoading } = useAuth();

  // Track view changes for transitions
  useEffect(() => {
    if (view !== previousView) {
      setPreviousView(view);
    }
  }, [view, previousView]);


  // URL state management
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const params = new URLSearchParams(window.location.search);
    const urlView = params.get('view');
    const urlDate = params.get('date');
    const urlAppointment = params.get('appointment');

    // Update URL when view or date changes
    const newParams = new URLSearchParams();
    newParams.set('view', view);
    newParams.set('date', currentDate.toISOString().split('T')[0]);
    if (highlightedAppointmentId) {
      newParams.set('appointment', highlightedAppointmentId);
    }

    const newUrl = `${window.location.pathname}?${newParams.toString()}`;
    window.history.replaceState({}, '', newUrl);
  }, [view, currentDate, highlightedAppointmentId]);

  // Calculate required date range for current view
  function getDateRange(viewType: CalendarView, date: Date): { start: Date; end: Date } {
    const start = new Date(date);
    const end = new Date(date);

    if (viewType === 'month') {
      start.setDate(1);
      start.setHours(0, 0, 0, 0);
      end.setMonth(end.getMonth() + 1, 0);
      end.setHours(23, 59, 59, 999);
    } else if (viewType === 'week') {
      const day = start.getDay();
      start.setDate(start.getDate() - day);
      start.setHours(0, 0, 0, 0);
      end.setDate(start.getDate() + 6);
      end.setHours(23, 59, 59, 999);
    } else if (viewType === 'day') {
      start.setHours(0, 0, 0, 0);
      end.setHours(23, 59, 59, 999);
    } else if (viewType === 'list') {
      start.setHours(0, 0, 0, 0);
      end.setDate(end.getDate() + 30);
      end.setHours(23, 59, 59, 999);
    }

    return { start, end };
  }

  // Check if cache covers required range
  function cacheCoversRange(cache: AppointmentCache | null, start: Date, end: Date): boolean {
    if (!cache) return false;
    return cache.start.getTime() <= start.getTime() && cache.end.getTime() >= end.getTime();
  }

  // Filter appointments to match current view's visible range (defensive data validation)
  function filterAppointmentsForView(
    allAppointments: Appointment[],
    viewType: CalendarView,
    date: Date
  ): Appointment[] {
    const { start, end } = getDateRange(viewType, date);

    return allAppointments.filter(apt => {
      const aptStart = new Date(apt.start_time);
      return aptStart >= start && aptStart <= end;
    });
  }

  useEffect(() => {
    if (authLoading) {
      return;
    }

    if (!isAuthenticated) {
      setAppointments([]);
      setAppointmentCache(null);
      setLoading(false);
      return;
    }

    // Clear cache when businessId changes to force fresh fetch
    setAppointmentCache(null);
    
    loadAppointments();

    // Cleanup: abort in-flight requests when view/date changes
    return () => {
      if (abortController) {
        abortController.abort();
      }
    };
  }, [currentDate, view, isAuthenticated, authLoading, businessId]);

  // Update displayed appointments when cache or view changes (defensive filtering)
  useEffect(() => {
    if (appointmentCache) {
      const filtered = filterAppointmentsForView(appointmentCache.appointments, view, currentDate);
      setAppointments(filtered);

      // Invariant check in development: verify no appointments outside visible range
      if (process.env.NODE_ENV === 'development') {
        const { start, end } = getDateRange(view, currentDate);
        filtered.forEach(apt => {
          const aptStart = new Date(apt.start_time);
          if (aptStart < start || aptStart > end) {
            console.error(
              `[Calendar] Invariant violation: Appointment ${apt.id} at ${apt.start_time} is outside visible range [${start.toISOString()}, ${end.toISOString()}]`,
              { appointment: apt, view, currentDate, visibleRange: { start, end } }
            );
          }
        });
      }
    }
  }, [appointmentCache, view, currentDate]);

  // Auto-refresh appointments every 30 minutes during business hours (9 AM - 8 PM)
  // TODO: Integrate with NotificationCenter to trigger refresh when new booking notification arrives
  // This will allow immediate updates instead of waiting for the polling interval
  useEffect(() => {
    if (!isAuthenticated) return;

    // Check if current time is within business hours (9 AM - 8 PM)
    const isWithinBusinessHours = () => {
      const now = new Date();
      const hours = now.getHours();
      return hours >= 9 && hours < 20; // 9 AM to 8 PM (20:00)
    };

    // Only set up polling if within business hours
    if (!isWithinBusinessHours()) {
      console.log('[Calendar] Outside business hours, auto-refresh disabled');
      return;
    }

    console.log('[Calendar] Auto-refresh enabled (30-minute interval, 9 AM - 8 PM)');

    const refreshInterval = setInterval(() => {
      // Double-check we're still in business hours before refreshing
      if (isWithinBusinessHours()) {
        console.log('[Calendar] Auto-refreshing appointments...');
        setAppointmentCache(null);
        loadAppointments();
      } else {
        console.log('[Calendar] Outside business hours, skipping refresh');
      }
    }, 30 * 60 * 1000); // 30 minutes in milliseconds

    return () => {
      console.log('[Calendar] Cleaning up auto-refresh interval');
      clearInterval(refreshInterval);
    };
  }, [isAuthenticated, businessId]);

  async function loadAppointments() {
    if (!isAuthenticated) {
      setAppointments([]);
      setLoading(false);
      return;
    }

    const { start, end } = getDateRange(view, currentDate);

    // Check if cache already covers this range
    if (cacheCoversRange(appointmentCache, start, end) && appointmentCache) {
      // Use cached data - just filter and display
      const filtered = filterAppointmentsForView(appointmentCache.appointments, view, currentDate);
      setAppointments(filtered);
      setLoading(false);
      return;
    }

    // Cancel any in-flight request
    if (abortController) {
      abortController.abort();
    }

    const newAbortController = new AbortController();
    setAbortController(newAbortController);

    setLoading(true);
    try {
      const params = new URLSearchParams({
        start: start.toISOString(),
        end: end.toISOString(),
      });

      // Add businessId filter if provided
      if (businessId) {
        params.append('businessId', businessId);
      }

      const data = await apiRequest<Appointment[]>(
        `/api/appointments?${params.toString()}`,
        { signal: newAbortController.signal }
      );

      // Update cache
      setAppointmentCache({ appointments: data, start, end });

      // Filter for current view
      const filtered = filterAppointmentsForView(data, view, currentDate);
      setAppointments(filtered);
    } catch (error: any) {
      if (error?.name === 'AbortError') {
        // Request was cancelled, this is expected
        return;
      }
      console.error('Failed to load appointments:', error);
    } finally {
      setLoading(false);
      setAbortController(null);
    }
  }

  function requestReschedule(appointmentId: string, newStartTime: Date) {
    if (!isAuthenticated) {
      showToast(t('errors.notAuthenticated'), 'error');
      return;
    }

    const appointment = appointments.find((a) => a.id === appointmentId);
    if (!appointment) {
      showToast(t('errors.notFound'), 'error');
      return;
    }

    // Snap to 5-minute grain to ensure precision
    const snappedTime = snapToGrain(newStartTime);
    const originalTime = new Date(appointment.start_time);

    // Detect same-position drop: compare timestamps at minute-level precision
    if (snappedTime.getTime() === snapToGrain(originalTime).getTime()) {
      // No change - skip modal entirely (no confirmation, no action)
      return;
    }

    // Show simple drag-drop confirmation modal
    setDragDropReschedule({
      appointment,
      originalTime,
      newTime: snappedTime,
    });
  }

  async function confirmDragDropReschedule() {
    if (!dragDropReschedule) return;

    const { appointment, newTime } = dragDropReschedule;

    setRescheduleLoading(true);

    try {
      // Optimistic UI update
      const duration = getAppointmentDuration(appointment);
      const newEnd = new Date(newTime);
      newEnd.setMinutes(newEnd.getMinutes() + duration);

      setAppointments((prev) =>
        prev.map((a) =>
          a.id === appointment.id
            ? { ...a, start_time: newTime.toISOString(), end_time: newEnd.toISOString() }
            : a
        )
      );

      const response = await apiRequest<{ success: boolean; appointment?: Appointment }>(
        '/api/appointments/reschedule',
        {
          method: 'POST',
          body: JSON.stringify({
            appointmentId: appointment.id,
            newStartTime: newTime.toISOString(),
            notifyCustomer: true,
          }),
        }
      );

      showToast(t('messages.rescheduled'), 'success');

      // Update cache with the server-returned appointment data
      if (response.appointment) {
        setAppointmentCache((prevCache) => {
          if (!prevCache) return prevCache;

          const updatedAppointments = prevCache.appointments.map((a) =>
            a.id === response.appointment!.id ? response.appointment! : a
          );

          return {
            ...prevCache,
            appointments: updatedAppointments,
          };
        });

        // Update displayed appointments with correct data from server
        setAppointments((prev) =>
          prev.map((a) => (a.id === response.appointment!.id ? response.appointment! : a))
        );
      }

      // Close modal
      setDragDropReschedule(null);
    } catch (error) {
      console.error('Failed to reschedule:', error);
      showToast(mapErrorToUserMessage(error), 'error');

      // Revert optimistic update on error - invalidate cache
      setAppointmentCache(null);
      await loadAppointments();
    } finally {
      setRescheduleLoading(false);
    }
  }

  function cancelDragDropReschedule() {
    setDragDropReschedule(null);
  }

  function handleEdit(appointmentId: string) {
    const appointment = appointments.find((a) => a.id === appointmentId);
    if (!appointment) {
      showToast(t('errors.notFound'), 'error');
      return;
    }

    // Open full reschedule modal with slot picker
    setEditingAppointment({
      appointment,
    });
  }

  function handleEditClose() {
    setEditingAppointment(null);
  }

  async function handleEditSuccess(updatedAppointment?: Appointment) {
    console.log('[Calendar] handleEditSuccess called with:', updatedAppointment ? 'updated appointment' : 'undefined (deletion)');
    setEditingAppointment(null);

    // Update cache with the server-returned appointment data
    if (updatedAppointment) {
      // Optimistic update: update the appointment in cache and UI without refetching
      console.log('[Calendar] Optimistic update for appointment:', updatedAppointment.id);
      setAppointmentCache((prevCache) => {
        if (!prevCache) return prevCache;

        const updatedAppointments = prevCache.appointments.map((a) =>
          a.id === updatedAppointment.id ? updatedAppointment : a
        );

        return {
          ...prevCache,
          appointments: updatedAppointments,
        };
      });

      // Update displayed appointments with correct data from server
      setAppointments((prev) =>
        prev.map((a) => (a.id === updatedAppointment.id ? updatedAppointment : a))
      );
    } else {
      // No appointment data returned (e.g., deleted/cancelled appointment)
      // Invalidate cache and reload to remove from UI
      console.log('[Calendar] Invalidating cache and reloading appointments after deletion');
      setAppointmentCache(null);
      await loadAppointments();
      console.log('[Calendar] Appointments reloaded successfully');
    }
  }

  function handleDayCellClick(date: Date) {
    if (onDateChange && onViewChange) {
      onDateChange(date);
      onViewChange('day');
      setHighlightedAppointmentId(null); // Clear highlight when navigating via empty cell
    }
  }

  function handleAppointmentClick(appointmentId: string, appointmentDate: Date) {
    if (onDateChange && onViewChange) {
      onDateChange(appointmentDate);
      onViewChange('day');
      setHighlightedAppointmentId(appointmentId);

      // Auto-clear highlight after animation
      setTimeout(() => {
        setHighlightedAppointmentId(null);
      }, 2000);
    }
  }

  // Determine which skeleton to show based on current view
  if (loading) {
    if (view === 'month') {
      return <MonthSkeleton />;
    } else if (view === 'day' || view === 'week') {
      return <DaySkeleton />;
    } else if (view === 'list') {
      return <ListSkeleton />;
    }
    // Fallback for any other view
    return (
      <div className="bg-white rounded-2xl border border-gray-200/60 p-12 flex items-center justify-center min-h-96">
        <div className="h-6 w-48 bg-gray-200 rounded skeleton-shimmer mx-auto" />
      </div>
    );
  }

  if (!authLoading && !isAuthenticated) {
    return (
      <div className="bg-white rounded-2xl border border-gray-200/60 p-12 flex items-center justify-center min-h-96">
        <div className="text-gray-500">{t('errors.notAuthenticated')}</div>
      </div>
    );
  }

  return (
    <>
      <ToastContainer toasts={toasts} onRemove={removeToast} />

      {/* Drag-drop reschedule confirmation modal */}
      {dragDropReschedule && (
        <DragDropRescheduleModal
          appointment={dragDropReschedule.appointment}
          originalTime={dragDropReschedule.originalTime}
          newTime={dragDropReschedule.newTime}
          onConfirm={confirmDragDropReschedule}
          onCancel={cancelDragDropReschedule}
          loading={rescheduleLoading}
        />
      )}

      {/* Full reschedule modal with slot picker (for edit button) */}
      {editingAppointment && (
        <RescheduleAppointmentModal
          appointment={editingAppointment.appointment}
          onClose={handleEditClose}
          onSuccess={handleEditSuccess}
        />
      )}

      {/* Calendar views with smooth transitions */}
      <ViewTransition
        transitionKey={view}
        direction={useViewTransitionDirection(previousView, view)}
      >
        {/* Month view - hidden on mobile/tablet (below md breakpoint: 768px) */}
        {view === 'month' && (
          <div className="hidden md:block">
            <MonthView
              currentDate={currentDate}
              appointments={appointments}
              onReschedule={requestReschedule}
              onEdit={handleEdit}
              draggedAppointment={draggedAppointment}
              setDraggedAppointment={setDraggedAppointment}
              onViewChange={onViewChange}
              onDateChange={onDateChange}
              onDayCellClick={handleDayCellClick}
              onAppointmentClick={handleAppointmentClick}
            />
          </div>
        )}

        {/* On mobile/tablet, show a message if month view is selected */}
        {view === 'month' && (
          <div className="md:hidden bg-white border border-gray-200/60 rounded-2xl p-6 flex items-center justify-center min-h-[300px]">
            <div className="text-center max-w-sm">
              <svg className="w-12 h-12 mx-auto mb-3 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              <h3 className="text-base font-semibold text-gray-900 mb-2">
                Month view unavailable
              </h3>
              <p className="text-xs text-gray-500 mb-4">
                Try day or list view for better mobile experience
              </p>
              <div className="flex gap-2 justify-center">
                <button
                  onClick={() => onViewChange?.('day')}
                  className="px-4 py-2 bg-gradient-to-r from-teal-600 to-green-600 text-white rounded-xl text-sm font-semibold hover:shadow-lg transition-all"
                >
                  Day View
                </button>
                <button
                  onClick={() => onViewChange?.('list')}
                  className="px-4 py-2 bg-gray-100 text-gray-700 rounded-xl text-sm font-semibold hover:bg-gray-200 transition-all"
                >
                  List View
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Week view - hidden on mobile/tablet */}
        {view === 'week' && (
          <>
            <div className="hidden md:block">
              <WeekView
                currentDate={currentDate}
                appointments={appointments}
                onReschedule={requestReschedule}
                onEdit={handleEdit}
                draggedAppointment={draggedAppointment}
                setDraggedAppointment={setDraggedAppointment}
                onDateChange={onDateChange}
              />
            </div>
            {/* On mobile/tablet, show a message if week view is selected */}
            <div className="md:hidden bg-white border border-gray-200/60 rounded-2xl p-6 flex items-center justify-center min-h-[300px]">
              <div className="text-center max-w-sm">
                <svg className="w-12 h-12 mx-auto mb-3 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                <h3 className="text-base font-semibold text-gray-900 mb-2">
                  Week view unavailable
                </h3>
                <p className="text-xs text-gray-500 mb-4">
                  Try day or list view for better mobile experience
                </p>
                <div className="flex gap-2 justify-center">
                  <button
                    onClick={() => onViewChange?.('day')}
                    className="px-4 py-2 bg-gradient-to-r from-teal-600 to-green-600 text-white rounded-xl text-sm font-semibold hover:shadow-lg transition-all"
                  >
                    Day View
                  </button>
                  <button
                    onClick={() => onViewChange?.('list')}
                    className="px-4 py-2 bg-gray-100 text-gray-700 rounded-xl text-sm font-semibold hover:bg-gray-200 transition-all"
                  >
                    List View
                  </button>
                </div>
              </div>
            </div>
          </>
        )}

        {view === 'day' && (
          <DayView
            currentDate={currentDate}
            appointments={appointments}
            onReschedule={requestReschedule}
            onEdit={handleEdit}
            draggedAppointment={draggedAppointment}
            setDraggedAppointment={setDraggedAppointment}
            highlightedAppointmentId={highlightedAppointmentId}
            onDateChange={onDateChange}
          />
        )}

        {view === 'list' && (
          <ListView
            currentDate={currentDate}
            appointments={appointments}
            onReschedule={requestReschedule}
            onEdit={handleEdit}
          />
        )}
      </ViewTransition>
    </>
  );
}

function MonthView({
  currentDate,
  appointments,
  onReschedule,
  onEdit,
  draggedAppointment,
  setDraggedAppointment,
  onViewChange,
  onDateChange,
  onDayCellClick,
  onAppointmentClick,
}: {
  currentDate: Date;
  appointments: Appointment[];
  onReschedule: (id: string, date: Date) => void;
  onEdit: (id: string) => void;
  draggedAppointment: Appointment | null;
  setDraggedAppointment: (apt: Appointment | null) => void;
  onViewChange?: (view: CalendarView) => void;
  onDateChange?: (date: Date) => void;
  onDayCellClick?: (date: Date) => void;
  onAppointmentClick?: (appointmentId: string, appointmentDate: Date) => void;
}) {
  const t = useTranslations('dashboard.calendar.dayLabels');
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const days = generateMonthCalendar(year, month, appointments);
  const numWeeks = Math.ceil(days.length / 7);

  return (
    <div className="bg-white border border-gray-200/60 rounded-2xl overflow-hidden h-[calc(100vh-280px)] flex flex-col">
      {/* Day Labels */}
      <div className="grid grid-cols-7 border-b border-gray-200/60 flex-shrink-0">
        {['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'].map((day) => (
          <div key={day} className="py-1.5 md:py-3 lg:py-4 xl:py-5 text-center border-r border-gray-200/60 last:border-r-0">
            <span className="text-[9px] md:text-[10px] lg:text-xs xl:text-sm font-semibold uppercase tracking-wider text-gray-500">
              {t(day as any)}
            </span>
          </div>
        ))}
      </div>

      {/* Days Grid - Equal height rows */}
      <div
        className="grid grid-cols-7 flex-1 overflow-y-auto"
        style={{
          gridTemplateRows: `repeat(${numWeeks}, 1fr)`
        }}
      >
        {days.map((day, idx) => (
          <DayCell
            key={idx}
            day={day}
            isLastRow={idx >= days.length - 7}
            draggedAppointment={draggedAppointment}
            setDraggedAppointment={setDraggedAppointment}
            onReschedule={onReschedule}
            onEdit={onEdit}
            onViewChange={onViewChange}
            onDateChange={onDateChange}
            onDayCellClick={onDayCellClick}
            onAppointmentClick={onAppointmentClick}
          />
        ))}
      </div>
    </div>
  );
}

function DayCell({
  day,
  isLastRow,
  draggedAppointment,
  setDraggedAppointment,
  onReschedule,
  onEdit,
  onViewChange,
  onDateChange,
  onDayCellClick,
  onAppointmentClick,
}: {
  day: CalendarDay;
  isLastRow: boolean;
  draggedAppointment: Appointment | null;
  setDraggedAppointment: (apt: Appointment | null) => void;
  onReschedule: (id: string, date: Date) => void;
  onEdit: (id: string) => void;
  onViewChange?: (view: CalendarView) => void;
  onDateChange?: (date: Date) => void;
  onDayCellClick?: (date: Date) => void;
  onAppointmentClick?: (appointmentId: string, appointmentDate: Date) => void;
}) {
  const t = useTranslations('dashboard.calendar.actions');
  const [isDragOver, setIsDragOver] = useState(false);
  const isWeekend = day.date.getDay() === 0 || day.date.getDay() === 6;

  // Calculate capacity indicator (assuming max 10 appointments per day as "full")
  const maxDayCapacity = 10;
  const capacityPercent = Math.min((day.appointments.length / maxDayCapacity) * 100, 100);
  const capacityColor =
    capacityPercent >= 80 ? 'bg-red-500' :
    capacityPercent >= 50 ? 'bg-yellow-500' :
    'bg-teal-500';

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);

    const appointmentId = e.dataTransfer.getData('appointmentId');
    if (appointmentId && draggedAppointment) {
      // Set time to match original time of day, but on the new date
      const originalTime = new Date(draggedAppointment.start_time);
      const newTime = new Date(day.date);
      newTime.setHours(originalTime.getHours(), originalTime.getMinutes(), 0, 0);

      onReschedule(appointmentId, newTime);
    }
    setDraggedAppointment(null);
  };

  return (
    <div
      className={`h-full relative border-r border-b border-gray-200/60 last:border-r-0 ${
        isLastRow ? 'border-b-0' : ''
      } ${!day.isCurrentMonth ? 'bg-gray-50/30' : 'bg-white'} ${
        day.isCurrentMonth ? 'hover:bg-gray-50/50 cursor-pointer' : ''
      } transition-colors`}
      onDragOver={(e) => {
        e.preventDefault();
        setIsDragOver(true);
      }}
      onDragLeave={() => setIsDragOver(false)}
      onDrop={handleDrop}
      onClick={(e) => {
        // Only handle clicks on the cell itself, not on appointments
        if (e.target === e.currentTarget || (e.target as HTMLElement).closest('.day-cell-content')) {
          if (day.isCurrentMonth && onDayCellClick) {
            onDayCellClick(day.date);
          }
        }
      }}
    >
      {isDragOver && (
        <div className="absolute inset-0 bg-teal-50/80 border-2 border-teal-500 pointer-events-none z-10 rounded-sm">
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-sm font-semibold text-teal-700">{t('dropHere')}</span>
          </div>
        </div>
      )}

      {/* Capacity indicator bar */}
      {day.appointments.length > 0 && (
        <div className="absolute top-0 left-0 right-0 h-1 z-10">
          <div
            className={`h-full ${capacityColor} transition-all`}
            style={{ width: `${capacityPercent}%` }}
            title={`${day.appointments.length} appointments (${Math.round(capacityPercent)}% capacity)`}
          />
        </div>
      )}

      {/* Content */}
      <div className="day-cell-content p-1 md:p-2 lg:p-3 xl:p-4 flex flex-col gap-0.5 md:gap-1.5 lg:gap-2">
        {/* Day Number */}
        <div className="day-cell-content flex-shrink-0">
          {day.isToday ? (
            <div className="inline-flex items-center justify-center w-5 h-5 md:w-6 md:h-6 lg:w-7 lg:h-7 xl:w-8 xl:h-8 rounded-full bg-gradient-to-br from-teal-500 to-green-500">
              <span className="text-[10px] md:text-xs lg:text-sm xl:text-base font-bold text-white">{day.date.getDate()}</span>
            </div>
          ) : (
            <span
              className={`text-[10px] md:text-xs lg:text-sm xl:text-base font-semibold ${
                !day.isCurrentMonth ? 'text-gray-400' : isWeekend ? 'text-gray-500' : 'text-gray-900'
              }`}
            >
              {day.date.getDate()}
            </span>
          )}
        </div>

        {/* Appointments - VERTICAL stacking, max 2 visible */}
        <div className="flex flex-col gap-0.5 md:gap-1">
          {(() => {
            const maxVisible = 2;
            const visibleAppointments = day.appointments.slice(0, maxVisible);
            const overflow = Math.max(day.appointments.length - maxVisible, 0);

            return (
              <>
                {/* Vertically stacked appointments */}
                {visibleAppointments.map((apt, idx) => (
                  <div
                    key={apt.id}
                    draggable
                    className="text-[9px] md:text-sm lg:text-base xl:text-lg px-2 md:px-3.5 lg:px-5 xl:px-6 py-1 md:py-1.5 lg:py-2 xl:py-2.5 box-border flex items-center rounded-md md:rounded-lg lg:rounded-xl bg-teal-50 border border-teal-100 text-teal-900 hover:bg-teal-100 cursor-pointer font-semibold overflow-hidden flex-shrink-0"
                    onDragStart={(e) => {
                      e.dataTransfer.setData('appointmentId', apt.id);
                      setDraggedAppointment(apt);
                    }}
                    onDragEnd={() => setDraggedAppointment(null)}
                    onClick={(e) => {
                      e.stopPropagation();
                      if (onAppointmentClick) {
                        onAppointmentClick(apt.id, new Date(apt.start_time));
                      }
                    }}
                  >
                    <span className="truncate block flex-1 leading-none">{formatTime(new Date(apt.start_time))}</span>
                  </div>
                ))}

                {/* Overflow indicator */}
                {overflow > 0 && (
                  <div className="flex-shrink-0">
                    <div
                      className="px-2 md:px-3.5 lg:px-5 xl:px-6 py-1 md:py-1.5 lg:py-2 xl:py-2.5 box-border flex items-center justify-center rounded-md md:rounded-lg lg:rounded-xl bg-teal-600/10 border border-teal-200 text-teal-700 hover:bg-teal-600/20 text-[9px] md:text-sm lg:text-base xl:text-lg font-semibold cursor-pointer"
                      onClick={(e) => {
                        e.stopPropagation();
                        // Navigate to list view filtered to this date
                        if (onDateChange && onViewChange) {
                          onDateChange(day.date);
                          onViewChange('list');
                        }
                      }}
                      role="button"
                      tabIndex={0}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          if (onDateChange && onViewChange) {
                            onDateChange(day.date);
                            onViewChange('list');
                          }
                        }
                      }}
                      aria-label={`View ${overflow} more appointments`}
                      title={`${overflow} more appointment${overflow > 1 ? 's' : ''}`}
                    >
                      {t('viewMore', { count: overflow })}
                    </div>
                  </div>
                )}
              </>
            );
          })()}
        </div>
      </div>
    </div>
  );
}

function WeekView({
  currentDate,
  appointments,
  onReschedule,
  onEdit,
  draggedAppointment,
  setDraggedAppointment,
  onDateChange,
}: {
  currentDate: Date;
  appointments: Appointment[];
  onReschedule: (id: string, date: Date) => void;
  onEdit: (id: string) => void;
  draggedAppointment: Appointment | null;
  setDraggedAppointment: (apt: Appointment | null) => void;
  onDateChange?: (date: Date) => void;
}) {
  const weekStart = new Date(currentDate);
  const dayOfWeek = weekStart.getDay();
  const daysFromMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
  weekStart.setDate(weekStart.getDate() - daysFromMonday);

  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekEnd.getDate() + 6);

  const weekDays = Array.from({ length: 7 }, (_, i) => {
    const date = new Date(weekStart);
    date.setDate(date.getDate() + i);
    return date;
  });

  const START_HOUR = 6;
  const END_HOUR = 22;
  const hours = Array.from({ length: END_HOUR - START_HOUR }, (_, i) => i + START_HOUR);

  const today = new Date();
  const todayStr = today.toDateString();

  const handlePreviousWeek = () => {
    const prevWeek = new Date(currentDate);
    prevWeek.setDate(prevWeek.getDate() - 7);
    onDateChange?.(prevWeek);
  };

  const handleNextWeek = () => {
    const nextWeek = new Date(currentDate);
    nextWeek.setDate(nextWeek.getDate() + 7);
    onDateChange?.(nextWeek);
  };

  // Calculate appointments with positions
  const appointmentsByDay = weekDays.map((day) => {
    const dayAppts = appointments
      .filter(apt => new Date(apt.start_time).toDateString() === day.toDateString())
      .map(apt => {
        const start = new Date(apt.start_time);
        const end = new Date(apt.end_time);

        const startHour = start.getHours();
        const startMinute = start.getMinutes();
        const endHour = end.getHours();
        const endMinute = end.getMinutes();

        const rowStart = ((startHour - START_HOUR) * 60 + startMinute) / 60;
        const rowEnd = ((endHour - START_HOUR) * 60 + endMinute) / 60;
        const rowSpan = rowEnd - rowStart;

        return { ...apt, rowStart, rowSpan };
      });

    return dayAppts;
  });

  return (
    <div className="bg-white border border-gray-200/60 rounded-2xl overflow-hidden h-[calc(100vh-280px)] flex flex-col">
      {/* Week Navigation Header - Mobile/Tablet only (hidden on lg+) */}
      <div className="lg:hidden py-4 px-4 border-b border-gray-200/60 flex items-center justify-center gap-3 flex-shrink-0">
        <button
          onClick={handlePreviousWeek}
          className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-gray-50 transition-all flex-shrink-0 text-gray-400 hover:text-gray-900"
          title="Previous week"
          aria-label="Previous week"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 19l-7-7 7-7" />
          </svg>
        </button>

        <div className="text-center">
          <div className="text-base font-bold text-gray-900">
            {(() => {
              const isSameMonth = weekStart.getMonth() === weekEnd.getMonth();
              
              if (isSameMonth) {
                return `${weekStart.toLocaleDateString(undefined, { month: 'long', day: 'numeric' })} - ${weekEnd.toLocaleDateString(undefined, { day: 'numeric' })}`;
              } else {
                return `${weekStart.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })} - ${weekEnd.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}`;
              }
            })()}
          </div>
          <div className="text-xs text-gray-500 mt-0.5">
            {weekEnd.getFullYear()}
          </div>
        </div>

        <button
          onClick={handleNextWeek}
          className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-gray-50 transition-all flex-shrink-0 text-gray-400 hover:text-gray-900"
          title="Next week"
          aria-label="Next week"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5l7 7-7 7" />
          </svg>
        </button>
      </div>

      {/* Day Headers */}
      <div className="grid grid-cols-[64px_repeat(7,1fr)] border-b border-gray-200/60 flex-shrink-0">
        {/* Empty corner for time column */}
        <div className="border-r border-gray-200/60" />
        
        {/* Day labels */}
        {weekDays.map((day, idx) => {
          const isToday = day.toDateString() === todayStr;
          const isWeekend = day.getDay() === 0 || day.getDay() === 6;

          return (
            <div key={day.toISOString()} className="py-4 text-center border-r border-gray-200/60 last:border-r-0">
              <div className="text-xs font-semibold uppercase tracking-wider text-gray-500 mb-1">
                {day.toLocaleDateString('en-US', { weekday: 'short' })}
              </div>
              {isToday ? (
                <div className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-gradient-to-br from-teal-500 to-green-500">
                  <span className="text-sm font-bold text-white">
                    {day.getDate()}
                  </span>
                </div>
              ) : (
                <span className={`text-sm font-semibold ${isWeekend ? 'text-gray-500' : 'text-gray-900'}`}>
                  {day.getDate()}
                </span>
              )}
            </div>
          );
        })}
      </div>

      {/* Time Grid */}
      <div className="flex-1 overflow-y-auto">
        {hours.map((hour, hourIdx) => (
          <div key={hour} className="grid grid-cols-[64px_repeat(7,1fr)]">
            {/* Time Label */}
            <div className={`flex items-start justify-end pr-3 pt-2 border-r border-b border-gray-200/60 ${hourIdx === hours.length - 1 ? 'border-b-0' : ''} min-h-[120px]`}>
              <span className="text-xs text-gray-500 font-medium">
                {hour === 0 ? '12 AM' : hour === 12 ? '12 PM' : hour < 12 ? `${hour} AM` : `${hour - 12} PM`}
              </span>
            </div>

            {/* Day Cells */}
            {weekDays.map((day, dayIdx) => {
              const isWeekend = day.getDay() === 0 || day.getDay() === 6;

              // Get appointments that START in this hour OR overlap into this hour
              const cellAppointments = appointmentsByDay[dayIdx].filter(apt => {
                const aptStartHour = new Date(apt.start_time).getHours();
                const aptEndHour = new Date(apt.end_time).getHours();
                const aptEndMinute = new Date(apt.end_time).getMinutes();

                // Include appointment if:
                // 1. It starts in this hour, OR
                // 2. It started earlier but extends into/through this hour
                return aptStartHour === hour || (aptStartHour < hour && (aptEndHour > hour || (aptEndHour === hour && aptEndMinute > 0)));
              });

              // But only render appointments that START in this hour
              // (overlapping appointments are handled by multi-hour rendering in WeekDayCell)
              const appointmentsToRender = cellAppointments.filter(apt => {
                const aptStartHour = new Date(apt.start_time).getHours();
                return aptStartHour === hour;
              });

              return (
                <WeekDayCell
                  key={`${day.toISOString()}-${hour}`}
                  day={day}
                  hour={hour}
                  hourIdx={hourIdx}
                  isLastHour={hourIdx === hours.length - 1}
                  isLastDay={dayIdx === 6}
                  isWeekend={isWeekend}
                  appointments={appointmentsToRender}
                  allDayAppointments={appointmentsByDay[dayIdx]}
                  startHour={START_HOUR}
                  onReschedule={onReschedule}
                  onEdit={onEdit}
                  draggedAppointment={draggedAppointment}
                  setDraggedAppointment={setDraggedAppointment}
                />
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}

function WeekDayCell({
  day,
  hour,
  hourIdx,
  isLastHour,
  isLastDay,
  isWeekend,
  appointments,
  allDayAppointments,
  startHour,
  onReschedule,
  onEdit,
  draggedAppointment,
  setDraggedAppointment,
}: {
  day: Date;
  hour: number;
  hourIdx: number;
  isLastHour: boolean;
  isLastDay: boolean;
  isWeekend: boolean;
  appointments: Array<Appointment & { rowStart: number; rowSpan: number }>;
  allDayAppointments: Array<Appointment & { rowStart: number; rowSpan: number }>;
  startHour: number;
  onReschedule: (id: string, date: Date) => void;
  onEdit: (id: string) => void;
  draggedAppointment: Appointment | null;
  setDraggedAppointment: (apt: Appointment | null) => void;
}) {
  const [isDragOver, setIsDragOver] = useState(false);
  const [dragOverSlot, setDragOverSlot] = useState<number | null>(null);
  const CELL_HEIGHT = 120; // Total height for one hour (increased for better visibility)
  const GRAIN_SIZE_MINUTES = 5; // 5-minute grain for rendering
  const GRAINS_PER_HOUR = 60 / GRAIN_SIZE_MINUTES; // 12 grains per hour
  const GRAIN_HEIGHT = CELL_HEIGHT / GRAINS_PER_HOUR; // 10px per 5-minute grain
  const DROP_ZONE_MINUTES = 15; // 15-minute increments for drag-and-drop
  const DROP_ZONES_PER_HOUR = 60 / DROP_ZONE_MINUTES; // 4 drop zones per hour

  const handleDragOver = (e: React.DragEvent, dropZoneIndex: number) => {
    e.preventDefault();
    setIsDragOver(true);
    setDragOverSlot(dropZoneIndex);
  };

  const handleDrop = (e: React.DragEvent, dropZoneIndex: number) => {
    e.preventDefault();
    setIsDragOver(false);
    setDragOverSlot(null);

    const appointmentId = e.dataTransfer.getData('appointmentId');
    if (appointmentId) {
      // Calculate the new time based on 15-minute drop zones (0-3 for 0, 15, 30, 45 min)
      const newTime = new Date(day);
      newTime.setHours(hour, dropZoneIndex * DROP_ZONE_MINUTES, 0, 0);

      onReschedule(appointmentId, newTime);
    }
    setDraggedAppointment(null);
  };

  return (
    <div
      className={`relative min-h-[120px] border-r border-b border-gray-200/60 ${
        isLastDay ? 'border-r-0' : ''
      } ${
        isLastHour ? 'border-b-0' : ''
      } ${
        isWeekend ? 'bg-gray-50/30' : 'bg-white'
      } transition-colors`}
    >
      {/* 15-minute drop zones (4 zones per hour: 0, 15, 30, 45) */}
      {Array.from({ length: DROP_ZONES_PER_HOUR }).map((_, dropZoneIndex) => {
        const topPercent = (dropZoneIndex / DROP_ZONES_PER_HOUR) * 100;
        const heightPercent = (1 / DROP_ZONES_PER_HOUR) * 100;
        const isHovered = isDragOver && dragOverSlot === dropZoneIndex;

        // Calculate the time this drop zone represents
        const minutes = dropZoneIndex * DROP_ZONE_MINUTES;
        const displayTime = formatTime(new Date(day.setHours(hour, minutes, 0, 0)));

        return (
          <div
            key={dropZoneIndex}
            className={`absolute inset-x-0 transition-all ${
              draggedAppointment
                ? 'hover:bg-teal-50/60'
                : 'hover:bg-gray-50/30'
            } ${
              isHovered ? 'bg-teal-50/90 border-2 border-teal-500 z-10' : ''
            }`}
            style={{
              top: `${topPercent}%`,
              height: `${heightPercent}%`,
            }}
            onDragOver={(e) => handleDragOver(e, dropZoneIndex)}
            onDragLeave={() => {
              setIsDragOver(false);
              setDragOverSlot(null);
            }}
            onDrop={(e) => handleDrop(e, dropZoneIndex)}
          >
            {/* Ghost card preview during drag */}
            {isHovered && draggedAppointment && (() => {
              // Calculate the actual height based on appointment duration
              const start = new Date(draggedAppointment.start_time);
              const end = new Date(draggedAppointment.end_time);
              const durationMinutes = (end.getTime() - start.getTime()) / (1000 * 60);
              const durationGrains = durationMinutes / GRAIN_SIZE_MINUTES;
              const ghostHeightPx = Math.max(durationGrains * GRAIN_HEIGHT, GRAIN_HEIGHT);

              return (
                <div
                  className="absolute inset-x-1 bg-teal-100/80 border-2 border-teal-400 border-dashed rounded-lg pointer-events-none z-20 flex items-start justify-between p-1.5"
                  style={{
                    top: 0,
                    height: `${ghostHeightPx}px`
                  }}
                >
                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-semibold text-teal-900 truncate">
                      {displayTime}
                    </div>
                    {ghostHeightPx > 30 && (
                      <div className="text-xs text-teal-700 truncate mt-0.5">
                        {draggedAppointment.customer_name}
                      </div>
                    )}
                  </div>
                </div>
              );
            })()}
          </div>
        );
      })}

      {/* 15-minute divider lines */}
      <div className="absolute inset-x-0 top-1/4 border-t border-dashed border-gray-100 pointer-events-none" />
      <div className="absolute inset-x-0 top-1/2 border-t border-dashed border-gray-100 pointer-events-none" />
      <div className="absolute inset-x-0 top-3/4 border-t border-dashed border-gray-100 pointer-events-none" />

      {/* Appointments positioned within this cell - CASCADE LAYOUT (Step 7j) + MULTI-HOUR SPANNING (Step 7o) */}
      {(() => {
        // Use cascade layout for overlapping appointments
        // IMPORTANT: Pass ALL day appointments to detect overlaps across hour boundaries
        const cascadedAll = allocateCascadeColumns(allDayAppointments);

        // But only render appointments that START in this hour
        const cascadedApts = cascadedAll.filter(apt => {
          const aptStartHour = new Date(apt.start_time).getHours();
          return aptStartHour === hour;
        });

        const maxVisibleColumns = 4;
        const needsCompression = cascadedAll.some(apt => apt.totalColumns > maxVisibleColumns);

        return cascadedApts.map((apt) => {
          const start = new Date(apt.start_time);
          const end = new Date(apt.end_time);
          const startHour = start.getHours();
          const startMinute = start.getMinutes();
          const endHour = end.getHours();
          const endMinute = end.getMinutes();

          // Snap to 5-minute grain boundaries
          const startGrain = Math.floor(startMinute / GRAIN_SIZE_MINUTES);
          const topPx = startGrain * GRAIN_HEIGHT;

          // Calculate full height spanning multiple hours (Step 7o - Multi-hour appointment rendering)
          let heightPx: number;

          if (endHour > hour) {
            // Multi-hour appointment: calculate total span across hours
            // Total minutes from start to end
            const totalMinutes = (endHour - startHour) * 60 + (endMinute - startMinute);

            // Convert to grains and then pixels
            const totalGrains = Math.ceil(totalMinutes / GRAIN_SIZE_MINUTES);
            heightPx = Math.max(totalGrains * GRAIN_HEIGHT - 2, GRAIN_HEIGHT);
          } else {
            // Single-hour appointment: calculate within this hour only
            const endGrain = Math.ceil(endMinute / GRAIN_SIZE_MINUTES);
            const grainSpan = endGrain - startGrain;
            heightPx = Math.max(grainSpan * GRAIN_HEIGHT - 2, GRAIN_HEIGHT);
          }

          // Calculate position using cascade algorithm
          const positionStyles = getCascadePositionStyles(
            apt.columnIndex,
            apt.totalColumns,
            topPx,
            heightPx
          );

          // Get visual classes for depth and layering
          const visualClasses = getCascadeVisualClasses(
            apt.columnIndex,
            apt.totalColumns,
            needsCompression
          );

          const isDragging = draggedAppointment?.id === apt.id;

          return (
            <div
              key={apt.id}
              draggable
              className={`group px-1.5 py-1.5 rounded-lg bg-teal-50 text-teal-900 hover:bg-teal-100 cursor-move overflow-hidden ${visualClasses} ${
                isDragging ? 'opacity-50' : ''
              }`}
              style={{
                ...positionStyles,
                // Allow drop zones underneath to receive events when ANY appointment is being dragged
                pointerEvents: draggedAppointment ? 'none' : 'auto',
              }}
              onDragStart={(e) => {
                e.dataTransfer.setData('appointmentId', apt.id);
                setDraggedAppointment(apt);
              }}
              onDragEnd={() => setDraggedAppointment(null)}
            >
              <div className="flex items-start justify-between gap-1 h-full">
                <div className="flex-1 min-w-0">
                  <div className="text-xs font-semibold leading-tight truncate">
                    {formatTime(new Date(apt.start_time))}
                  </div>
                  {heightPx > 30 && apt.totalColumns <= 3 && (
                    <div className="text-xs text-gray-900 leading-tight truncate mt-0.5">
                      {apt.customer_name || 'Guest'}
                    </div>
                  )}
                  {heightPx > 50 && apt.totalColumns <= 2 && (
                    <div className="text-xs text-gray-600 leading-tight truncate mt-0.5">
                      {apt.service_name || 'Service'}
                    </div>
                  )}
                </div>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onEdit(apt.id);
                  }}
                  style={{ pointerEvents: 'auto' }} // Keep button clickable
                  className="opacity-0 group-hover:opacity-100 transition-opacity p-0.5 hover:bg-teal-200 rounded flex-shrink-0"
                  title="Edit appointment"
                >
                  <svg className="w-2.5 h-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                </button>
              </div>
            </div>
          );
        });
      })()}
    </div>
  );
}

function DayView({
  currentDate,
  appointments,
  onReschedule,
  onEdit,
  draggedAppointment,
  setDraggedAppointment,
  highlightedAppointmentId,
  onDateChange,
}: {
  currentDate: Date;
  appointments: Appointment[];
  onReschedule: (id: string, date: Date) => void;
  onEdit: (id: string) => void;
  draggedAppointment: Appointment | null;
  setDraggedAppointment: (apt: Appointment | null) => void;
  highlightedAppointmentId?: string | null;
  onDateChange?: (date: Date) => void;
}) {
  const START_HOUR = 6;
  const END_HOUR = 22;
  const hours = Array.from({ length: END_HOUR - START_HOUR }, (_, i) => i + START_HOUR);
  const now = new Date();
  const isToday = currentDate.toDateString() === now.toDateString();
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // Calculate current time indicator position
  const currentHour = now.getHours();
  const currentMinute = now.getMinutes();
  const showCurrentTime = isToday && currentHour >= START_HOUR && currentHour < END_HOUR;
  const currentTimeRow = showCurrentTime ? currentHour - START_HOUR : null;
  const currentTimeOffset = showCurrentTime ? (currentMinute / 60) : 0;

  // Scroll to highlighted appointment
  useEffect(() => {
    if (highlightedAppointmentId && scrollContainerRef.current) {
      // Find the highlighted appointment to get its time
      const highlightedApt = appointments.find(apt => apt.id === highlightedAppointmentId);
      if (highlightedApt) {
        const startTime = new Date(highlightedApt.start_time);
        const hour = startTime.getHours();

        // Wait a tick for the DOM to render
        setTimeout(() => {
          // Calculate scroll position - each hour cell is 120px (min-h-[120px])
          const HOUR_HEIGHT = 120;
          const hourIndex = hour - START_HOUR;
          const scrollPosition = hourIndex * HOUR_HEIGHT;

          // Scroll smoothly to center the appointment
          if (scrollContainerRef.current) {
            const containerHeight = scrollContainerRef.current.clientHeight;
            const targetScroll = Math.max(0, scrollPosition - containerHeight / 3);

            scrollContainerRef.current.scrollTo({
              top: targetScroll,
              behavior: 'smooth'
            });
          }
        }, 100);
      }
    }
  }, [highlightedAppointmentId, appointments, START_HOUR]);

  // Calculate ALL appointments with position metadata
  const allDayAppointments = appointments.map(apt => {
    const start = new Date(apt.start_time);
    const end = new Date(apt.end_time);

    const startHour = start.getHours();
    const startMinute = start.getMinutes();
    const endHour = end.getHours();
    const endMinute = end.getMinutes();

    const rowStart = startHour - START_HOUR + startMinute / 60;
    const rowEnd = endHour - START_HOUR + endMinute / 60;
    const rowSpan = rowEnd - rowStart;

    return { ...apt, rowStart, rowSpan };
  });

  // Filter appointments by hour for rendering (only those that START in each hour)
  const appointmentsByHour = hours.map(hour => {
    return allDayAppointments.filter(apt => {
      const start = new Date(apt.start_time);
      return start.getHours() === hour;
    });
  });

  // Generate array of dates: 3 days before, current day, 3 days after
  const dateRange = Array.from({ length: 7 }, (_, i) => {
    const date = new Date(currentDate);
    date.setDate(date.getDate() + (i - 3));
    return date;
  });

  const handlePreviousDay = () => {
    const prevDay = new Date(currentDate);
    prevDay.setDate(prevDay.getDate() - 1);
    onDateChange?.(prevDay);
  };

  const handleNextDay = () => {
    const nextDay = new Date(currentDate);
    nextDay.setDate(nextDay.getDate() + 1);
    onDateChange?.(nextDay);
  };

  return (
    <div className="bg-white border border-gray-200/60 rounded-2xl overflow-hidden h-[calc(100vh-280px)] flex flex-col">
      {/* Day Header - Horizontal Date Picker */}
      <div className="py-5 px-4 sm:px-6 border-b border-gray-200/60 flex-shrink-0">
        <div className="flex items-center justify-center gap-2 sm:gap-4">
          {/* Previous Day Button */}
          <button
            onClick={handlePreviousDay}
            className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-gray-50 transition-all flex-shrink-0 text-gray-400 hover:text-gray-900"
            title="Previous day"
            aria-label="Previous day"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 19l-7-7 7-7" />
            </svg>
          </button>

          {/* Date Tiles */}
          <div className="flex items-center gap-1 sm:gap-2 overflow-hidden flex-1 justify-center max-w-2xl">
            {dateRange.map((date, idx) => {
              const isCurrent = date.toDateString() === currentDate.toDateString();
              const isCurrentDay = date.toDateString() === now.toDateString();
              const isWeekend = date.getDay() === 0 || date.getDay() === 6;

              return (
                <button
                  key={date.toISOString()}
                  onClick={() => onDateChange?.(date)}
                  className={`flex flex-col items-center justify-center rounded-xl transition-all ${
                    isCurrent
                      ? 'bg-gray-50 text-gray-900 px-4 sm:px-5 py-3 sm:py-4 shadow-sm'
                      : 'text-gray-400 hover:text-gray-700 hover:bg-gray-50 px-2 sm:px-3 py-2'
                  } ${
                    !isCurrent ? 'opacity-30 hover:opacity-100' : ''
                  }`}
                  title={date.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
                >
                  {/* Weekday */}
                  <div className={`font-semibold uppercase tracking-wider mb-1 ${
                    isCurrent ? 'text-xs sm:text-sm' : 'text-[10px] sm:text-xs'
                  }`}>
                    {date.toLocaleDateString('en-US', { weekday: 'short' })}
                  </div>

                  {/* Day Number */}
                  {isCurrentDay ? (
                    <div className={`rounded-full flex items-center justify-center ${
                      isCurrent
                        ? 'w-9 h-9 sm:w-10 sm:h-10 bg-gradient-to-br from-teal-500 to-green-500 text-white'
                        : 'w-6 h-6 sm:w-7 sm:h-7 bg-gradient-to-br from-teal-500 to-green-500 text-white'
                    }`}>
                      <span className={`font-bold ${isCurrent ? 'text-lg sm:text-xl' : 'text-xs sm:text-sm'}`}>
                        {date.getDate()}
                      </span>
                    </div>
                  ) : (
                    <span className={`font-bold ${
                      isCurrent ? 'text-xl sm:text-2xl' : 'text-sm sm:text-base'
                    }`}>
                      {date.getDate()}
                    </span>
                  )}

                  {/* Month indicator for first day of month (only on non-current) */}
                  {!isCurrent && date.getDate() === 1 && (
                    <div className="text-[9px] sm:text-[10px] text-gray-400 mt-0.5 uppercase tracking-wide">
                      {date.toLocaleDateString('en-US', { month: 'short' })}
                    </div>
                  )}
                </button>
              );
            })}
          </div>

          {/* Next Day Button */}
          <button
            onClick={handleNextDay}
            className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-gray-50 transition-all flex-shrink-0 text-gray-400 hover:text-gray-900"
            title="Next day"
            aria-label="Next day"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>
      </div>

      {/* Time Grid */}
      <div ref={scrollContainerRef} className="flex-1 overflow-y-auto">
        {hours.map((hour, hourIdx) => (
          <div key={hour} className="grid grid-cols-[64px_1fr]">
            {/* Time Label */}
            <div className={`flex items-start justify-end pr-3 pt-2 border-r border-b border-gray-200/60 ${hourIdx === hours.length - 1 ? 'border-b-0' : ''} min-h-[120px]`}>
              <span className="text-xs text-gray-500 font-medium">
                {hour === 0 ? '12 AM' : hour === 12 ? '12 PM' : hour < 12 ? `${hour} AM` : `${hour - 12} PM`}
              </span>
            </div>

            {/* Hour Cell */}
            <DayHourCell
              date={currentDate}
              hour={hour}
              hourIdx={hourIdx}
              isLastHour={hourIdx === hours.length - 1}
              appointments={appointmentsByHour[hourIdx]}
              allDayAppointments={allDayAppointments}
              startHour={START_HOUR}
              showCurrentTime={currentTimeRow === hourIdx}
              currentTimeOffset={currentTimeOffset}
              onReschedule={onReschedule}
              onEdit={onEdit}
              draggedAppointment={draggedAppointment}
              setDraggedAppointment={setDraggedAppointment}
              highlightedAppointmentId={highlightedAppointmentId}
            />
          </div>
        ))}
      </div>
    </div>
  );
}

function DayHourCell({
  date,
  hour,
  hourIdx,
  isLastHour,
  appointments,
  allDayAppointments,
  startHour,
  showCurrentTime,
  currentTimeOffset,
  onReschedule,
  onEdit,
  draggedAppointment,
  setDraggedAppointment,
  highlightedAppointmentId,
}: {
  date: Date;
  hour: number;
  hourIdx: number;
  isLastHour: boolean;
  appointments: Array<Appointment & { rowStart: number; rowSpan: number }>;
  allDayAppointments: Array<Appointment & { rowStart: number; rowSpan: number }>;
  startHour: number;
  showCurrentTime: boolean;
  currentTimeOffset: number;
  onReschedule: (id: string, date: Date) => void;
  onEdit: (id: string) => void;
  draggedAppointment: Appointment | null;
  setDraggedAppointment: (apt: Appointment | null) => void;
  highlightedAppointmentId?: string | null;
}) {
  const [isDragOver, setIsDragOver] = useState(false);
  const [dragOverSlot, setDragOverSlot] = useState<number | null>(null);
  const CELL_HEIGHT = 120; // Total height for one hour (increased for better visibility)
  const GRAIN_SIZE_MINUTES = 5; // 5-minute grain for rendering
  const GRAINS_PER_HOUR = 60 / GRAIN_SIZE_MINUTES; // 12 grains per hour
  const GRAIN_HEIGHT = CELL_HEIGHT / GRAINS_PER_HOUR; // 10px per 5-minute grain
  const DROP_ZONE_MINUTES = 15; // 15-minute increments for drag-and-drop
  const DROP_ZONES_PER_HOUR = 60 / DROP_ZONE_MINUTES; // 4 drop zones per hour

  const handleDragOver = (e: React.DragEvent, dropZoneIndex: number) => {
    e.preventDefault();
    setIsDragOver(true);
    setDragOverSlot(dropZoneIndex);
  };

  const handleDrop = (e: React.DragEvent, dropZoneIndex: number) => {
    e.preventDefault();
    setIsDragOver(false);
    setDragOverSlot(null);

    const appointmentId = e.dataTransfer.getData('appointmentId');
    if (appointmentId) {
      // Calculate the new time based on 15-minute drop zones (0-3 for 0, 15, 30, 45 min)
      const newTime = new Date(date);
      newTime.setHours(hour, dropZoneIndex * DROP_ZONE_MINUTES, 0, 0);

      onReschedule(appointmentId, newTime);
    }
    setDraggedAppointment(null);
  };

  return (
    <div
      className={`relative min-h-[120px] border-b border-gray-200/60 ${
        isLastHour ? 'border-b-0' : ''
      } bg-white transition-colors`}
    >
      {/* 15-minute drop zones (4 zones per hour: 0, 15, 30, 45) */}
      {Array.from({ length: DROP_ZONES_PER_HOUR }).map((_, dropZoneIndex) => {
        const topPercent = (dropZoneIndex / DROP_ZONES_PER_HOUR) * 100;
        const heightPercent = (1 / DROP_ZONES_PER_HOUR) * 100;
        const isHovered = isDragOver && dragOverSlot === dropZoneIndex;

        // Calculate the time this drop zone represents
        const minutes = dropZoneIndex * DROP_ZONE_MINUTES;
        const displayTime = formatTime(new Date(date.setHours(hour, minutes, 0, 0)));

        return (
          <div
            key={dropZoneIndex}
            className={`absolute inset-x-0 transition-all ${
              draggedAppointment
                ? 'hover:bg-teal-50/60'
                : 'hover:bg-gray-50/30'
            } ${
              isHovered ? 'bg-teal-50/90 border-2 border-teal-500 z-10' : ''
            }`}
            style={{
              top: `${topPercent}%`,
              height: `${heightPercent}%`,
            }}
            onDragOver={(e) => handleDragOver(e, dropZoneIndex)}
            onDragLeave={() => {
              setIsDragOver(false);
              setDragOverSlot(null);
            }}
            onDrop={(e) => handleDrop(e, dropZoneIndex)}
          >
            {/* Ghost card preview during drag */}
            {isHovered && draggedAppointment && (() => {
              // Calculate the actual height based on appointment duration
              const start = new Date(draggedAppointment.start_time);
              const end = new Date(draggedAppointment.end_time);
              const durationMinutes = (end.getTime() - start.getTime()) / (1000 * 60);
              const durationGrains = durationMinutes / GRAIN_SIZE_MINUTES;
              const ghostHeightPx = Math.max(durationGrains * GRAIN_HEIGHT, GRAIN_HEIGHT);

              return (
                <div
                  className="absolute inset-x-1 bg-teal-100/80 border-2 border-teal-400 border-dashed rounded-lg pointer-events-none z-20 flex items-start justify-between p-1.5"
                  style={{
                    top: 0,
                    height: `${ghostHeightPx}px`
                  }}
                >
                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-semibold text-teal-900 truncate">
                      {displayTime}
                    </div>
                    {ghostHeightPx > 30 && (
                      <div className="text-xs text-teal-700 truncate mt-0.5">
                        {draggedAppointment.customer_name}
                      </div>
                    )}
                  </div>
                </div>
              );
            })()}
          </div>
        );
      })}

      {/* 15-minute divider lines */}
      <div className="absolute inset-x-0 top-1/4 border-t border-dashed border-gray-100 pointer-events-none" />
      <div className="absolute inset-x-0 top-1/2 border-t border-dashed border-gray-100 pointer-events-none" />
      <div className="absolute inset-x-0 top-3/4 border-t border-dashed border-gray-100 pointer-events-none" />

      {/* Current time indicator */}
      {showCurrentTime && (
        <div
          className="absolute left-0 right-0 z-20 pointer-events-none"
          style={{ top: `${currentTimeOffset * CELL_HEIGHT}px` }}
        >
          <div className="flex items-center">
            <div className="w-2 h-2 rounded-full bg-gradient-to-br from-teal-500 to-green-500 -ml-1" />
            <div className="flex-1 h-0.5 bg-gradient-to-r from-teal-500 to-green-500" />
          </div>
        </div>
      )}

      {/* Appointments positioned within this cell - CASCADE LAYOUT (Step 7j) + MULTI-HOUR SPANNING (Step 7o) */}
      {(() => {
        // Use cascade layout for overlapping appointments
        // IMPORTANT: Pass ALL day appointments to detect overlaps across hour boundaries
        const cascadedAll = allocateCascadeColumns(allDayAppointments);

        // But only render appointments that START in this hour
        const cascadedApts = cascadedAll.filter(apt => {
          const aptStartHour = new Date(apt.start_time).getHours();
          return aptStartHour === hour;
        });

        const maxVisibleColumns = 4;
        const needsCompression = cascadedAll.some(apt => apt.totalColumns > maxVisibleColumns);

        return cascadedApts.map((apt) => {
          const start = new Date(apt.start_time);
          const end = new Date(apt.end_time);
          const startHour = start.getHours();
          const startMinute = start.getMinutes();
          const endHour = end.getHours();
          const endMinute = end.getMinutes();

          // Snap to 5-minute grain boundaries
          const startGrain = Math.floor(startMinute / GRAIN_SIZE_MINUTES);
          const topPx = startGrain * GRAIN_HEIGHT;

          // Calculate full height spanning multiple hours (Step 7o - Multi-hour appointment rendering)
          let heightPx: number;

          if (endHour > hour) {
            // Multi-hour appointment: calculate total span across hours
            // Total minutes from start to end
            const totalMinutes = (endHour - startHour) * 60 + (endMinute - startMinute);

            // Convert to grains and then pixels
            const totalGrains = Math.ceil(totalMinutes / GRAIN_SIZE_MINUTES);
            heightPx = Math.max(totalGrains * GRAIN_HEIGHT - 2, GRAIN_HEIGHT);
          } else {
            // Single-hour appointment: calculate within this hour only
            const endGrain = Math.ceil(endMinute / GRAIN_SIZE_MINUTES);
            const grainSpan = endGrain - startGrain;
            heightPx = Math.max(grainSpan * GRAIN_HEIGHT - 2, GRAIN_HEIGHT);
          }

          // Calculate position using cascade algorithm
          const positionStyles = getCascadePositionStyles(
            apt.columnIndex,
            apt.totalColumns,
            topPx,
            heightPx
          );

          // Get visual classes for depth and layering
          const visualClasses = getCascadeVisualClasses(
            apt.columnIndex,
            apt.totalColumns,
            needsCompression
          );

          const isHighlighted = highlightedAppointmentId === apt.id;
          const isDragging = draggedAppointment?.id === apt.id;

          return (
            <div
              key={apt.id}
              draggable
              className={`group px-2 py-2 rounded-lg bg-teal-50 text-teal-900 hover:bg-teal-100 cursor-move overflow-hidden ${visualClasses} ${
                isHighlighted
                  ? 'border-teal-400 border-2 bg-teal-100 animate-highlight-pulse !z-50'
                  : ''
              } ${isDragging ? 'opacity-50' : ''}`}
              style={{
                ...positionStyles,
                // Allow drop zones underneath to receive events when ANY appointment is being dragged
                pointerEvents: draggedAppointment ? 'none' : 'auto',
              }}
              onDragStart={(e) => {
                e.dataTransfer.setData('appointmentId', apt.id);
                setDraggedAppointment(apt);
              }}
              onDragEnd={() => setDraggedAppointment(null)}
            >
              <div className="flex items-start justify-between gap-1 h-full">
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-semibold text-gray-900 leading-tight truncate">
                    {formatTime(new Date(apt.start_time))}
                  </div>
                  {heightPx > 40 && apt.totalColumns <= 3 && (
                    <div className="text-sm text-gray-900 leading-tight truncate mt-0.5">
                      {apt.customer_name || 'Guest'}
                    </div>
                  )}
                  {heightPx > 60 && apt.totalColumns <= 2 && (
                    <div className="text-sm text-gray-600 leading-tight truncate mt-0.5">
                      {apt.service_name || 'Service'}
                    </div>
                  )}
                  {apt.notes && heightPx > 90 && apt.totalColumns <= 2 && (
                    <div className="text-xs text-gray-500 leading-tight truncate mt-1">
                      {apt.notes}
                    </div>
                  )}
                </div>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onEdit(apt.id);
                  }}
                  style={{ pointerEvents: 'auto' }} // Keep button clickable
                  className="opacity-0 group-hover:opacity-100 transition-opacity p-0.5 hover:bg-teal-200 rounded flex-shrink-0"
                  title="Edit appointment"
                >
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                </button>
              </div>
            </div>
          );
        });
      })()}
    </div>
  );
}

function ListView({ currentDate, appointments, onReschedule, onEdit }: { currentDate: Date; appointments: Appointment[]; onReschedule: (id: string, date: Date) => void; onEdit: (id: string) => void }) {
  const t = useTranslations('dashboard.calendar.list');
  // Group appointments by date
  const appointmentsByDate = appointments.reduce((acc, apt) => {
    const dateKey = new Date(apt.start_time).toDateString();
    if (!acc[dateKey]) {
      acc[dateKey] = [];
    }
    acc[dateKey].push(apt);
    return acc;
  }, {} as Record<string, Appointment[]>);

  // Sort dates
  const sortedDates = Object.keys(appointmentsByDate).sort((a, b) => 
    new Date(a).getTime() - new Date(b).getTime()
  );

  const today = new Date().toDateString();

  return (
    <div className="bg-white border border-gray-200/60 rounded-2xl overflow-hidden h-[calc(100vh-280px)] flex flex-col">
      {/* List content */}
      <div className="flex-1 overflow-y-auto">
        {sortedDates.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center py-12">
              <div className="text-gray-400 text-lg mb-2">{t('noAppointments')}</div>
              <div className="text-gray-500 text-sm">
                {t('noAppointmentsFound')}
              </div>
            </div>
          </div>
        ) : (
          sortedDates.map(dateKey => {
            const date = new Date(dateKey);
            const isToday = dateKey === today;
            const dayAppointments = appointmentsByDate[dateKey].sort(
              (a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime()
            );

            return (
              <div key={dateKey} className="border-b border-gray-200/60 last:border-b-0">
                {/* Date Header */}
                <div className={`sticky top-0 z-10 px-6 py-4 border-b border-gray-200/60 ${
                  isToday ? 'bg-gradient-to-r from-teal-50 to-green-50' : 'bg-white'
                }`}>
                  <div className="flex items-center gap-3">
                    {isToday ? (
                      <div className="flex items-center justify-center w-10 h-10 rounded-full bg-gradient-to-br from-teal-500 to-green-500 flex-shrink-0">
                        <span className="text-lg font-bold text-white">
                          {date.getDate()}
                        </span>
                      </div>
                    ) : (
                      <div className="flex items-center justify-center w-10 h-10 rounded-full border-2 border-gray-200 flex-shrink-0">
                        <span className="text-lg font-semibold text-gray-900">
                          {date.getDate()}
                        </span>
                      </div>
                    )}
                    <div>
                      <div className="text-sm font-semibold text-gray-900">
                        {date.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
                      </div>
                      <div className="text-xs text-gray-500">
                        {dayAppointments.length} {t(dayAppointments.length === 1 ? 'appointments' : 'appointments_plural', { count: dayAppointments.length })}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Appointments List */}
                <div className="divide-y divide-gray-100">
                  {dayAppointments.map((apt, idx) => (
                    <ListAppointmentCard
                      key={apt.id}
                      appointment={apt}
                      isFirst={idx === 0}
                      isLast={idx === dayAppointments.length - 1}
                      onReschedule={onReschedule}
                      onEdit={onEdit}
                    />
                  ))}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

function ListAppointmentCard({
  appointment,
  isFirst,
  isLast,
  onReschedule,
  onEdit
}: {
  appointment: Appointment;
  isFirst: boolean;
  isLast: boolean;
  onReschedule: (id: string, date: Date) => void;
  onEdit: (id: string) => void;
}) {
  const [isDragging, setIsDragging] = useState(false);
  const startTime = new Date(appointment.start_time);
  const endTime = new Date(appointment.end_time);
  const duration = Math.round((endTime.getTime() - startTime.getTime()) / (1000 * 60));

  const statusColors = {
    confirmed: 'bg-teal-50 border-teal-200 text-teal-700',
    pending: 'bg-yellow-50 border-yellow-200 text-yellow-700',
    cancelled: 'bg-gray-50 border-gray-200 text-gray-500',
    canceled: 'bg-gray-50 border-gray-200 text-gray-500',
    completed: 'bg-green-50 border-green-200 text-green-700',
    no_show: 'bg-red-50 border-red-200 text-red-700',
  };

  const statusColor = statusColors[appointment.status as keyof typeof statusColors] || statusColors.confirmed;

  return (
    <div
      className={`group px-6 py-4 hover:bg-gray-50/50 transition-all cursor-pointer ${
        isDragging ? 'opacity-50' : ''
      } ${isLast ? '' : ''}`}
      onClick={() => onEdit(appointment.id)}
    >
      <div className="flex items-start gap-4">
        {/* Time Badge */}
        <div className="flex-shrink-0 text-right min-w-[80px]">
          <div className="text-base font-semibold text-gray-900">
            {formatTime(startTime)}
          </div>
          <div className="text-xs text-gray-500 mt-0.5">
            {duration} min
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-4 mb-2">
            <div className="flex-1">
              <div className="text-base font-semibold text-gray-900 mb-1">
                {appointment.customer_name || 'Unnamed Customer'}
              </div>
              {(appointment.customer_email || appointment.guest_email) && (
                <div className="text-sm text-gray-600">
                  {appointment.customer_email || appointment.guest_email}
                </div>
              )}
              {(appointment.customer_phone || appointment.guest_phone) && (
                <div className="text-sm text-gray-600">
                  {appointment.customer_phone || appointment.guest_phone}
                </div>
              )}
            </div>

            {/* Status Badge */}
            <div className={`px-3 py-1 rounded-lg border text-xs font-semibold uppercase tracking-wider ${statusColor}`}>
              {appointment.status}
            </div>
          </div>

          {/* Notes */}
          {appointment.notes && (
            <div className="mt-2 px-3 py-2 bg-gray-50 rounded-lg border border-gray-100">
              <div className="text-sm text-gray-700 leading-relaxed">
                {appointment.notes}
              </div>
            </div>
          )}
        </div>

        {/* Edit Icon */}
        <div className="flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
          <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
          </svg>
        </div>
      </div>
    </div>
  );
}

